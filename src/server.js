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
import { handleAIMessage } from './ai-grace.js';
import { GraceConversationEngine } from './conversationEngine.js';
import {
    buildOpeningPayload,
    getStagePayload,
    advance,
    buildClinicalBrief,
    FIRST_STAGE_ID
} from './stages.js';
import { saveConversation, loadConversation, createLead, getClient } from './database.js';
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

app.get('/privacy', (req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Privacy Policy | Stabilis Treatment Centre</title>
    <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2933; line-height: 1.6; max-width: 760px; margin: 0 auto; padding: 40px 20px; background: #faf8f5; }
        h1 { color: #145c58; line-height: 1.2; }
        h2 { color: #145c58; margin-top: 28px; }
        a { color: #145c58; }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p>Grace is the digital intake assistant for Stabilis Treatment Centre. Information you share is used to understand your situation, respond appropriately, and help the Stabilis team follow up where needed.</p>

    <h2>What We Collect</h2>
    <p>We may collect your name, contact details, general location, reason for reaching out, treatment or support preferences, and conversation details relevant to intake or referral.</p>

    <h2>How We Use It</h2>
    <p>Your information is used for intake, referral, safety triage, follow-up by Stabilis staff, and improving continuity of support. We do not use Grace for emergency response.</p>

    <h2>Confidentiality</h2>
    <p>Information is handled confidentially and shared only with appropriate Stabilis staff or referral partners involved in support or care coordination, unless disclosure is required for safety or by law.</p>

    <h2>Emergencies</h2>
    <p>Grace is not an emergency service. If there is immediate danger, call Netcare 911 on 082 911, emergency services on 10177, or go to the nearest emergency department.</p>

    <h2>Contact</h2>
    <p>For privacy questions, contact Stabilis Treatment Centre at <a href="mailto:reception@stabilistc.co.za">reception@stabilistc.co.za</a>.</p>
</body>
</html>`);
});

// Stage 1 opening — static text plus the next stage id the widget should request.
app.get('/api/init', (req, res) => {
    res.json(buildOpeningPayload());
});

/**
 * v2 message endpoint — routes to the new AI-driven conversation engine
 * (conversationEngine.js). Entirely separate from /api/stage and /api/chat;
 * does not touch the existing widget or GRACE_MODE='ai' path at all.
 *
 * Body: { sessionId, message }
 * Loads existing v2 conversation history from grace_conversations (via
 * the engine's own getConversationHistory), appends the new message,
 * calls conductIntake(), returns the result.
 */
let graceEngine = null;
function getGraceEngine() {
  if (!graceEngine) {
    graceEngine = new GraceConversationEngine(getClient(), logger);
  }
  return graceEngine;
}

app.post('/api/v2/message', chatLimiter, async (req, res) => {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) {
        return res.status(400).json({ error: 'Missing sessionId or message' });
    }
    if (message.length > 2000) {
        return res.status(400).json({ error: 'Message too long' });
    }

    try {
        const engine = getGraceEngine();
        const existing = await engine.getConversationHistory(sessionId);
        const messages = existing?.messages || [];

        const updatedMessages = [
            ...messages,
            { role: 'user', content: message },
        ];

        const result = await engine.conductIntake(sessionId, updatedMessages, existing?.id);

        res.json({
            reply: result.graceResponse,
            ended: result.status === 'completed',
            escalationFlag: result.escalationFlag || false,
            inviteUrl: result.inviteUrl || null,
            sessionId,
        });
    } catch (error) {
        logger.error({ error: error.message, sessionId }, 'v2 message error');
        res.status(500).json({
            error: 'Sorry, something went wrong. Please try again.',
            saved: false,
        });
    }
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

    // AI MODE: Route to Claude-powered conversation engine.
    // Skip when value is null — those are scripted auto-advances (e.g. stage1b),
    // not real user messages, and Claude rejects null content.
    if (process.env.GRACE_MODE === 'ai' && stageId && value != null) {
        try {
            const result = await handleAIMessage(sessionId, value);
            return res.json(result);
        } catch (error) {
            logger.error({ error: error.message, sessionId }, 'AI mode failed, falling back to scripted');
            // Fall through to scripted mode on error
        }
    }

    // SCRIPTED MODE: Original stage-based flow (default)
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

        // Closing reached — capture invite URL and include in response
        if (result.ended && !metadata.lead_created) {
            let responseMessages = [...(result.next.messages || [])];
            let inviteUrl = null;

            try {
                const brief = { ...buildClinicalBrief(leadData), ...(metadata.utm || {}) };
                if (brief.contact_name && brief.contact_phone) {
                    const leadId = await createLead(sessionId, brief);
                    updatedMetadata.lead_created = true;
                    updatedMetadata.lead_id = leadId;
                    
                    // Notify therapist and capture invite URL from SJ webhook
                    // This is synchronous so we can include the URL in the closing message
                    const sjResult = await notifyTherapist({
                        sessionId,
                        leadId,
                        priority: leadData.urgent ? 'HIGH' : 'NORMAL',
                        brief
                    }).catch(err => {
                        logger.warn({ error: err.message, leadId }, 'Therapist/SJ notification failed (non-blocking)');
                        return { inviteUrl: null };
                    });
                    
                    if (sjResult && sjResult.inviteUrl) {
                        inviteUrl = sjResult.inviteUrl;
                        updatedMetadata.sj_invite_url = inviteUrl;
                        logger.info({ leadId, inviteUrl }, 'Invite URL captured from SJ webhook');
                    }
                    
                    logger.info({ sessionId, leadId }, 'Lead qualified and therapist notified');
                }
            } catch (err) {
                logger.error({ error: err.message, sessionId }, 'Lead creation or therapist notification failed');
                // Continue anyway - don't block user
            }

            // Append invite URL to closing message if available
            if (inviteUrl && responseMessages.length > 0) {
                const lastMessage = responseMessages[responseMessages.length - 1];
                if (typeof lastMessage === 'string') {
                    responseMessages[responseMessages.length - 1] = lastMessage + `\n\n🔗 Join 'In the Meantime':\n${inviteUrl}`;
                } else {
                    responseMessages.push(`🔗 Join 'In the Meantime':\n${inviteUrl}`);
                }
            }

            // Save conversation after lead creation and therapist notification
            await saveConversation(sessionId, updatedMessages, updatedMetadata);

            res.json({
                ack: result.ack,
                next: { ...result.next, messages: responseMessages },
                ended: result.ended,
                qualified: !!updatedMetadata.lead_created,
                saved: true
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
const CHAT_STAGES = new Set(['stage4b', 'stage5c', 'stage_city', 'stage7a', 'stage7b', 'stage7c', 'wellness_intro', 'stage_mh_opening', 'notes']);

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
            await getResponseWithCrisisDetection(stageId, message, leadData);
        
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
