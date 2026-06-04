/**
 * Stabilis Intake Bot Server
 *
 * Routes:
 * - GET  /api/init    - Stage 1 opening (static)
 * - POST /api/stage   - Scripted stage transitions (no AI)
 * - POST /api/chat    - Stage 4b only: empathetic ack for health notes
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
import { detectCrisis, respondToHealthNotes } from './claude-client.js';
import {
    buildOpeningPayload,
    getStagePayload,
    advance,
    buildClinicalBrief
} from './stages.js';
import { saveConversation, loadConversation, createLead } from './database.js';
import { notifyTherapist } from './handoff.js';
import { handleWhatsAppMessage } from './whatsapp.js';
import { logger } from './logger.js';
import { startScheduler } from './scheduler.js';

const app = express();
const PORT = process.env.PORT || 3000;

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
 *   stageId omitted  → bootstrap (return the first question, stage2)
 *   stageId === 'stage4b' is rejected — the widget must use /api/chat for that one.
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
            return res.json({ ack: [], next: getStagePayload('stage2', leadData) });
        }

        if (stageId === 'stage4b') {
            return res.status(400).json({ error: 'Stage 4b uses /api/chat' });
        }

        const result = advance(stageId, value, leadData);

        const userTurn = value ? [{ role: 'user', content: String(value) }] : [];
        const ackTurns = result.ack.map(text => ({ role: 'assistant', content: text }));
        const questionTurns = (result.next.messages || []).map(text => ({ role: 'assistant', content: text }));
        const updatedMessages = [...messages, ...userTurn, ...ackTurns, ...questionTurns];

        const updatedMetadata = { ...metadata, leadData };

        // Closing reached — qualify the lead from leadData. No AI call.
        if (result.ended && !metadata.lead_created) {
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
        }

        await saveConversation(sessionId, updatedMessages, updatedMetadata);

        res.json({
            ack: result.ack,
            next: result.next,
            ended: result.ended,
            qualified: !!updatedMetadata.lead_created,
            saved: true
        });
    } catch (error) {
        logger.error({ error: error.message, sessionId }, 'Stage error');
        res.status(500).json({ error: 'Sorry, something went wrong. Please try again.', saved: false });
    }
});

/**
 * Stage 4b only — empathetic ack for the user's free-text health notes,
 * then return the next stage (Stage 5) so the widget can render it.
 *
 * Body: { sessionId, message }
 */
app.post('/api/chat', chatLimiter, async (req, res) => {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) {
        return res.status(400).json({ error: 'Missing sessionId or message' });
    }
    if (message.length > 2000) {
        return res.status(400).json({ error: 'Message too long' });
    }

    try {
        const crisisCheckPromise = detectCrisis(message);
        const conversation = await loadConversation(sessionId);
        const metadata = conversation?.metadata || {};
        const leadData = metadata.leadData || {};
        const messages = conversation?.messages || [];

        const crisis = await crisisCheckPromise;
        if (crisis.crisis && crisis.confidence > 0.9) {
            logger.warn({ sessionId, type: crisis.type }, 'Crisis detected');
            const crisisResponse = generateCrisisResponse(crisis.type);
            await saveConversation(sessionId, [
                ...messages,
                { role: 'user', content: message },
                { role: 'assistant', content: crisisResponse }
            ], { ...metadata, crisis: true, crisis_type: crisis.type });
            await notifyTherapist({
                sessionId, priority: 'CRISIS', type: crisis.type, lastMessage: message
            });
            return res.json({ reply: crisisResponse, crisis: true, sessionId, saved: true });
        }

        const { text: ack } = await respondToHealthNotes(message);
        const result = advance('stage4b', message, leadData);

        const updatedMessages = [
            ...messages,
            { role: 'user', content: message },
            { role: 'assistant', content: ack },
            ...(result.next.messages || []).map(t => ({ role: 'assistant', content: t }))
        ];

        await saveConversation(sessionId, updatedMessages, { ...metadata, leadData });

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
