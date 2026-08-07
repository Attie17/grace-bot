/**
 * WhatsApp Business API Integration
 *
 * Routes incoming WhatsApp messages through conversationEngine.js
 * (AI-driven, MI-informed, trauma-aware intake).
 *
 * Model: claude-haiku-4-5-20251001 (set in conversationEngine.js)
 *
 * Webhook flow (Meta Cloud API — active):
 * 1. Caller messages the WhatsApp number
 * 2. Meta POSTs to GET /api/whatsapp/webhook for verification, then
 *    POST /api/whatsapp/webhook for each inbound message
 * 3. server.js verifies X-Hub-Signature-256, parses Meta format
 * 4. Route through conductIntake() in conversationEngine.js
 * 5. Send Grace's response back via Meta Graph API
 *
 * Rollback: set WHATSAPP_PROVIDER=twilio in env to revert to Twilio.
 */

import { sendWhatsAppViaMeta, parseMetaWebhookBody, isMetaEnabled } from './whatsapp-meta.js';
import { getClient } from './database.js';
import { GraceConversationEngine } from './conversationEngine.js';
import { notifyTherapist } from './handoff.js';
import { logger } from './logger.js';

/* TWILIO FALLBACK — leave in place for rollback (set WHATSAPP_PROVIDER=twilio):
import twilio from 'twilio';
const twilioClient = process.env.TWILIO_ACCOUNT_SID
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;
*/

// Initialize conversation engine (single instance, reused across requests)
// Uses shared Supabase client from database.js — no duplicate connections
const engine = new GraceConversationEngine(getClient(), logger);

/**
 * Handle incoming WhatsApp message.
 * Supports both Meta Cloud API format (active) and Twilio format (dormant).
 *
 * Meta format: nested JSON with entry[].changes[].value.messages[]
 * Twilio format: flat body with Body, From, ProfileName keys
 */
export async function handleWhatsAppMessage(body) {
    // Parse payload — Meta format or Twilio flat format
    let parsed;
    if (body?.object === 'whatsapp_business_account') {
        parsed = parseMetaWebhookBody(body);
        if (!parsed) {
            // Status updates (delivery/read receipts) — silently ignore
            return;
        }
    } else {
        // Twilio flat format (dormant path)
        parsed = { Body: body.Body, From: body.From, ProfileName: body.ProfileName || '' };
    }

    const { Body, From, ProfileName } = parsed;

    if (!Body || !From) {
        logger.warn({ body }, 'Malformed WhatsApp webhook');
        return;
    }

    // callerId is stable across the conversation.
    // Both Twilio ("whatsapp:+27721234567") and Meta ("+27721234567") normalise
    // to "wa_+27721234567" after stripping the whatsapp: prefix.
    const callerId = `wa_${From.replace('whatsapp:', '')}`;

    logger.info({ from: From, preview: Body.substring(0, 50) }, 'WhatsApp message received');

    try {
        // Load existing conversation (if any)
        const existing = await engine.getConversationHistory(callerId);

        let messages;
        let conversationId = null;

        if (existing && existing.status !== 'completed') {
            // Continuing an active conversation — append new message to history
            messages = [...existing.messages, { role: 'user', content: Body }];
            conversationId = existing.id;
            logger.debug({ callerId, conversationId, messageCount: messages.length }, 'Continuing conversation');
        } else {
            // First message or previous conversation already completed — start fresh
            messages = [{ role: 'user', content: Body }];
            logger.debug({ callerId }, 'Starting new conversation');
        }

        // conductIntake() handles everything:
        // - Escalation detection (detectEscalation from escalationDetector.js)
        // - AI response generation (Claude Haiku)
        // - Field extraction (fieldExtractor.js)
        // - Sentiment analysis
        // - Conversation state persistence (grace_conversations table)
        // - Wrap-up: invite link generation + SJ lead webhook
        const result = await engine.conductIntake(callerId, messages, conversationId);

        // Send Grace's response via WhatsApp
        await sendWhatsApp(From, result.graceResponse);

        // Escalation — notify receptionist immediately
        if (result.escalationFlag) {
            logger.warn({ callerId, reason: result.escalationReason }, 'Escalation triggered — notifying receptionist');
            await notifyTherapist({
                sessionId: callerId,
                priority: 'CRISIS',
                type: result.escalationReason,
                lastMessage: Body
            });
        }

        // Lead created (conversation complete) — notify receptionist + send invite to caller
        if (result.nextAction === 'CREATE_LEAD') {
            const urgency = result.extractedFields?.urgency_level?.value;
            const inviteUrl = result.inviteUrl || null;
            logger.info({ callerId, urgency, inviteUrl }, 'Lead created — notifying receptionist');

            // Notify receptionist (non-blocking — do not await)
            notifyTherapist({
                sessionId: callerId,
                priority: urgency === 'crisis' || urgency === 'immediate' ? 'HIGH' : 'NORMAL',
                brief: result.extractedFields
            }).catch(err => logger.error({ error: err.message, callerId }, 'notifyTherapist failed'));
        }

    } catch (error) {
        logger.error({ error: error.message, from: From }, 'WhatsApp handling error');
        await sendWhatsApp(From, 'Sorry, something went wrong on our end. A team member will follow up with you shortly, or you can call us on 012 333 7702.');
    }
}

/**
 * Send WhatsApp message — Meta Cloud API (active) or Twilio fallback.
 */
async function sendWhatsApp(to, message) {
    if (isMetaEnabled()) {
        return sendWhatsAppViaMeta(to, message);
    }

    /* TWILIO FALLBACK (WHATSAPP_PROVIDER=twilio):
    if (!twilioClient) {
        logger.warn('Twilio not configured - would send:', message);
        return;
    }
    await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: to,
        body: message
    });
    return;
    */

    logger.warn({ to }, 'No WhatsApp provider configured — message not sent');
}

/**
 * Send outbound WhatsApp (for follow-ups).
 */
export async function sendOutboundWhatsApp(phoneNumber, message) {
    const to = phoneNumber.startsWith('whatsapp:') 
        ? phoneNumber 
        : `whatsapp:${phoneNumber}`;
    
    return sendWhatsApp(to, message);
}

