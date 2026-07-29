/**
 * WhatsApp Business API Integration — REWRITTEN
 * 
 * Routes incoming WhatsApp messages through conversationEngine.js
 * (AI-driven, MI-informed, trauma-aware intake) instead of the old
 * scripted stage engine.
 * 
 * Model: claude-haiku-4-5-20251001 (set in conversationEngine.js)
 * 
 * Webhook flow:
 * 1. Caller messages the WhatsApp number (via social media ad button)
 * 2. Twilio POSTs to /api/whatsapp/webhook
 * 3. We look up conversation history by phone number
 * 4. Route through conductIntake() in conversationEngine.js
 * 5. Send Grace's response back via Twilio
 * 6. Notify receptionist on escalation or lead creation
 * 
 * Previous version used advanceWhatsAppStage() from whatsapp-stages.js
 * and detectCrisis() from claude-client.js — both retired in this rewrite.
 */

import twilio from 'twilio';
import { getClient } from './database.js';
import { GraceConversationEngine } from './conversationEngine.js';
import { notifyTherapist } from './handoff.js';
import { logger } from './logger.js';

const twilioClient = process.env.TWILIO_ACCOUNT_SID
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

// Initialize conversation engine (single instance, reused across requests)
// Uses shared Supabase client from database.js — no duplicate connections
const engine = new GraceConversationEngine(getClient(), logger);

/**
 * Handle incoming WhatsApp message from Twilio webhook.
 * Twilio sends: Body, From, To, MessageSid, ProfileName, etc.
 */
export async function handleWhatsAppMessage(body) {
    const { Body, From, ProfileName } = body;

    if (!Body || !From) {
        logger.warn({ body }, 'Malformed WhatsApp webhook');
        return;
    }

    // Use phone number as caller ID (stable across conversation)
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
 * Send WhatsApp message via Twilio.
 */
async function sendWhatsApp(to, message) {
    if (!twilioClient) {
        logger.warn('Twilio not configured - would send:', message);
        return;
    }

    try {
        await twilioClient.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: to, // Already in whatsapp: format from webhook
            body: message
        });
    } catch (error) {
        logger.error({ error: error.message, to }, 'Failed to send WhatsApp');
        throw error;
    }
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

