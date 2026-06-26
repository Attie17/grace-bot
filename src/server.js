/**
 * Stabilis Intake Bot Server
 *
 * Routes:
 * - GET  /api/init    - Stage 1 opening (static)
 * - POST /api/stage   - Scripted stage transitions (no AI). Also accepts Skip
 *                       (value=null) for the optional notes catch-all.
 * - POST /api/chat    - Empathetic ack for free-text stages:
 *                       stage4b (health notes), wellness_intro, and notes.
 * - POST /api/whatsapp/webhook - WhatsApp Business webhook
 * - GET  /widget/*    - Embeddable widget files
 * - GET  /health      - Health check
 */

import { fileURLToPath } from 'url';
import path from 'path';
import './load-env.js';

const __filename = fileURLToPath(import.meta.url);
const __rootDir = path.resolve(path.dirname(__filename), '..');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { detectCrisis, respondEmpathetically, getResponseWithCrisisDetection, generateOpeningAcknowledgement } from './claude-client.js';
import {
    buildOpeningPayload,
    getStagePayload,
    advance,
    buildClinicalBrief,
    FIRST_STAGE_ID
} from './stages.js';
import { saveConversation, loadConversation, createLead } from './database.js';
import { notifyTherapist } from './handoff.js';
import { handleWhatsAppMessage } from './whatsapp.js';
import { logger } from './logger.js';
import { startScheduler } from './scheduler.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Railway (and most PaaS) place the app behind a single reverse proxy that
// sets X-Forwarded-For. Trust exactly one hop so express-rate-limit can read
// the real client IP. Using a fixed count (not `true`) prevents clients from
// spoofing the header to bypass rate limiting.
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    message: { error: 'Too many messages. Please slow down.' }
});

app.use('/widget', express.static(path.join(__rootDir, 'public')));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stage 1 opening — static text plus the next stage id the widget should request.
app.get('/api/init', (req, res) => {
    res.json(buildOpeningPayload());
});

/**
 * Scripted stage transition. No Claude API call.
 *
 * Body: { sessionId, stageId, value }
 *   stageId omitted     → bootstrap (return the first question — the router).
 *   stage4b/wellness_intro → rejected, the widget must use /api/chat.
 *   stageId === 'notes' with value === null is the Skip path (no AI ack).
 */
app.post('/api/stage', chatLimiter, async (req, res) => {
    const { sessionId, stageId, value } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

    try {
        const conversation = await loadConversation(sessionId);
        const metadata = conversation?.metadata || {};
        const leadData = metadata.leadData || {};
        const messages = conversation?.messages || [];

        if (!stageId) {
            if (req.body?.utm && !metadata.utm) {
                const incoming = req.body.utm;
                const utm = {};
                ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => {
                    if (typeof incoming[k] === 'string' && incoming[k].length > 0 && incoming[k].length <= 200) {
                        utm[k] = incoming[k];
                    }
                });
                if (Object.keys(utm).length > 0) {
                    await saveConversation(sessionId, messages, { ...metadata, utm });
                    metadata.utm = utm;
                }
            }
            return res.json({ ack: [], next: getStagePayload(FIRST_STAGE_ID, leadData) });
        }

        // Stages that take a free-text answer with an AI ack must come through
        // /api/chat. `notes` is the exception: when the user hits Skip, the
        // widget routes a null value here so we advance without an AI call.
        if (stageId === 'stage4b' || stageId === 'wellness_intro') {
            return res.status(400).json({ error: `${stageId} uses /api/chat` });
        }

        let result = advance(stageId, value, leadData);

        // If next stage is stage_opening_ack, auto-process it (generate AI ack and advance)
        if (result.next.stageId === 'stage_opening_ack') {
            const callerContext = {
                who_for: leadData.who_for || null,
                caller_relation: leadData.caller_relation || null,
                referred_name: leadData.referred_name || null,
                track: leadData.track || null
            };

            const { message: aiMessage } = await generateOpeningAcknowledgement(callerContext);
            
            // Advance past stage_opening_ack to get the actual next stage
            const nextResult = advance('stage_opening_ack', 'continue', leadData);
            
            // Merge the AI ack with any existing acks
            result.ack = [...result.ack, aiMessage];
            result.next = nextResult.next;
            result.ended = nextResult.ended;
        }

        const userTurn = value ? [{ role: 'user', content: String(value) }] : [];
        const ackTurns = result.ack.map(text => ({ role: 'assistant', content: text }));
        const questionTurns = (result.next.messages || []).map(text => ({ role: 'assistant', content: text }));
        const updatedMessages = [...messages, ...userTurn, ...ackTurns, ...questionTurns];

        const updatedMetadata = { ...metadata, leadData };

        // Closing reached — respond now, then save lead and notify in background.
        if (result.ended && !metadata.lead_created) {
            res.json({
                ack: result.ack,
                next: result.next,
                ended: result.ended,
                qualified: !!updatedMetadata.lead_created,
                saved: true
            });

            setImmediate(async () => {
                try {
                    const brief = { ...buildClinicalBrief(leadData), ...(metadata.utm || {}) };
                    if (brief.contact_name && brief.contact_phone) {
                        const leadId = await createLead(sessionId, brief);
                        await notifyTherapist({
                            sessionId,
                            leadId,
                            priority: leadData.urgent ? 'HIGH' : 'NORMAL',
                            brief
                        });
                        updatedMetadata.lead_created = true;
                        updatedMetadata.lead_id = leadId;
                        logger.info({ sessionId, leadId }, 'Lead qualified');
                    } else {
                        logger.warn({ sessionId }, 'Closing without contact details — skipping lead creation');
                    }
                    await saveConversation(sessionId, updatedMessages, updatedMetadata);
                } catch (err) {
                    logger.error({ error: err.message, sessionId }, 'Background lead save failed');
                }
            });
        } else {
            // Non-closing stages: persist BEFORE responding so the next request
            // reads fresh leadData (avoids a read-modify-write race that dropped
            // fields like contact_name / guardian_name on rapid sequential stages).
            await saveConversation(sessionId, updatedMessages, updatedMetadata);
            res.json({
                ack: result.ack,
                next: result.next,
                ended: result.ended,
                qualified: !!updatedMetadata.lead_created,
                saved: true
            });
        }
    } catch (error) {
        logger.error({ error: error.message, sessionId }, 'Stage error');
        res.status(500).json({ error: 'Sorry, something went wrong. Please try again.', saved: false });
    }
});

/**
 * Empathetic Claude ack for a free-text stage, then return the next stage
 * payload so the widget can render it. Used by stage4b (health notes),
 * wellness_intro (the wellness opener), and notes (the catch-all when the
 * user types something rather than skipping).
 *
 * Body: { sessionId, message, stageId? }   // stageId defaults to 'stage4b'
 */
const CHAT_STAGES = new Set(['stage4b', 'stage5c', 'stage_city', 'stage7a', 'stage7b', 'stage7c', 'wellness_intro', 'notes']);

app.post('/api/chat', chatLimiter, async (req, res) => {
    const { sessionId, message, stageId = 'stage4b' } = req.body;
    if (!sessionId || !message) {
        return res.status(400).json({ error: 'Missing sessionId or message' });
    }
    if (message.length > 2000) {
        return res.status(400).json({ error: 'Message too long' });
    }
    if (!CHAT_STAGES.has(stageId)) {
        return res.status(400).json({ error: 'Unsupported stage for /api/chat' });
    }

    try {
        const conversation = await loadConversation(sessionId);
        const metadata = conversation?.metadata || {};
        const leadData = metadata.leadData || {};
        const messages = conversation?.messages || [];

        // Combined crisis detection + empathetic response in one API call
        const { response: ack, crisis, type: crisisType } = 
            await getResponseWithCrisisDetection(stageId, message);
        
        if (crisis && crisisType !== 'none') {
            logger.warn({ sessionId, type: crisisType }, 'Crisis detected');
            const crisisResponse = generateCrisisResponse(crisisType);
            await saveConversation(sessionId, [
                ...messages,
                { role: 'user', content: message },
                { role: 'assistant', content: crisisResponse }
            ], { ...metadata, crisis: true, crisis_type: crisisType });
            await notifyTherapist({
                sessionId, priority: 'CRISIS', type: crisisType, lastMessage: message
            });
            return res.json({ reply: crisisResponse, crisis: true, sessionId, saved: true });
        }
        const result = advance(stageId, message, leadData);

        const updatedMessages = [
            ...messages,
            { role: 'user', content: message },
            { role: 'assistant', content: ack },
            ...(result.next.messages || []).map(t => ({ role: 'assistant', content: t }))
        ];

        const updatedMetadata = { ...metadata, leadData };
        await saveConversation(sessionId, updatedMessages, updatedMetadata);

        // Notify therapist if conversation ended (web widget path)
        if (result.ended && !metadata.lead_created) {
            setImmediate(async () => {
                try {
                    const brief = { ...buildClinicalBrief(leadData), ...(metadata.utm || {}) };
                    if (brief.contact_name && brief.contact_phone) {
                        const leadId = await createLead(sessionId, brief);
                        await notifyTherapist({
                            sessionId,
                            leadId,
                            priority: leadData.urgent ? 'HIGH' : 'NORMAL',
                            brief
                        });
                        updatedMetadata.lead_created = true;
                        updatedMetadata.lead_id = leadId;
                        logger.info({ sessionId, leadId }, 'Lead qualified from web');
                        await saveConversation(sessionId, updatedMessages, updatedMetadata);
                    } else {
                        logger.warn({ sessionId }, 'Closing without contact details — skipping lead creation');
                    }
                } catch (err) {
                    logger.error({ error: err.message, sessionId }, 'Background lead save failed');
                }
            });
        }

        res.json({
            reply: ack,
            next: result.next,
            saved: true,
            sessionId
        });
    } catch (error) {
        logger.error({ error: error.message, sessionId }, 'Chat error');
        res.status(500).json({
            error: 'Sorry, something went wrong. Please try again, or WhatsApp us directly.',
            fallback_whatsapp: process.env.CLINIC_WHATSAPP,
            saved: false
        });
    }
});

app.get('/api/conversation/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    try {
        const conversation = await loadConversation(sessionId);
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
        res.json({
            sessionId,
            messages: conversation.messages,
            metadata: conversation.metadata,
            created_at: conversation.created_at,
            updated_at: conversation.updated_at
        });
    } catch (error) {
        logger.error({ error: error.message, sessionId }, 'Failed to load conversation');
        res.status(500).json({ error: 'Failed to load conversation' });
    }
});

app.post('/api/whatsapp/webhook', async (req, res) => {
    try {
        await handleWhatsAppMessage(req.body);
        res.status(200).send('OK');
    } catch (error) {
        logger.error({ error: error.message }, 'WhatsApp webhook error');
        res.status(500).send('Error');
    }
});

app.get('/api/admin/stats', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.ADMIN_API_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json({ conversations_today: 0, qualified_leads_today: 0, crisis_alerts_today: 0 });
});

function generateCrisisResponse(type) {
    const responses = {
        overdose: `This sounds like a medical emergency. Please call for help immediately:

📞 Emergency: 112 or 10177
📞 Poison Centre: 0861 555 777

Stay on the line with them. A member of our team has been alerted.`,
        withdrawal: `What you're describing sounds medically serious. Please get to an emergency room or call for help:

📞 Emergency: 112 or 10177

Withdrawal can be dangerous without medical supervision. A member of our team has been alerted.`,
        violence: `I'm concerned about your safety right now. Please call for immediate help:

📞 Emergency: 112 or 10177

A member of our team has been alerted and will follow up with you.`,
        medical: `This sounds like a medical emergency. Please call for help right away:

📞 Emergency: 112 or 10177

A member of our team has been alerted.`
    };
    return responses[type] || `It sounds like you may need immediate help. Please call:

📞 Emergency: 112 or 10177

A member of our team has been alerted and will follow up with you.`;
}

app.listen(PORT, () => {
    logger.info(`Stabilis Intake Bot running on port ${PORT}`);
    logger.info(`Widget: http://localhost:${PORT}/widget/widget.html`);
    logger.info(`Health: http://localhost:${PORT}/health`);
    startScheduler();
});
