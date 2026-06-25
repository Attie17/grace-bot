/**
 * WhatsApp Business API Integration
 * 
 * Uses Twilio as the WhatsApp provider (easiest for SA market).
 * For production scale, consider 360dialog or direct Meta integration.
 * 
 * Webhook flow:
 * 1. User messages your WhatsApp number
 * 2. Twilio POSTs to /api/whatsapp/webhook
 * 3. We look up session by phone number
 * 4. Route through same conversation engine as web widget
 * 5. Send response back via Twilio
 */

import twilio from 'twilio';
import { chat, detectCrisis } from './claude-client.js';
import { loadConversation, saveConversation, createLead } from './database.js';
import { notifyTherapist } from './handoff.js';
import { logger } from './logger.js';
import { getWhatsAppInitialStage, advanceWhatsAppStage, formatStageForWhatsApp } from './whatsapp-stages.js';

const twilioClient = process.env.TWILIO_ACCOUNT_SID
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

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

    // Use phone number as session ID (stable across conversation)
    const sessionId = `wa_${From.replace('whatsapp:', '')}`;

    logger.info({ from: From, preview: Body.substring(0, 50) }, 'WhatsApp message received');

    try {
        // Crisis detection runs first for fast response
        logger.debug({ sessionId }, 'Starting crisis detection');
        const crisis = await detectCrisis(Body);
        logger.debug({ sessionId, crisis }, 'Crisis detection completed');
        
        if (crisis.crisis && crisis.confidence > 0.9) {
            const crisisResponses = {
                overdose: `This sounds like a medical emergency. Please call for help immediately:\n\n📞 Emergency: 112 or 10177\n📞 Poison Centre: 0861 555 777\n\nStay on the line with them. A member of our team has been alerted.`,
                withdrawal: `What you're describing sounds medically serious. Please get to an emergency room or call:\n\n📞 Emergency: 112 or 10177\n\nA member of our team has been alerted.`,
                violence: `I'm concerned about your safety right now. Please call for immediate help:\n\n📞 Emergency: 112 or 10177\n\nA member of our team has been alerted.`,
                medical: `This sounds like a medical emergency. Please call:\n\n📞 Emergency: 112 or 10177\n\nA member of our team has been alerted.`
            };
            const crisisResponse = crisisResponses[crisis.type] || `It sounds like you may need immediate help. Please call:\n\n📞 Emergency: 112 or 10177\n\nA member of our team has been alerted.`;

            await sendWhatsApp(From, crisisResponse);
            await notifyTherapist({
                sessionId,
                priority: 'CRISIS',
                type: crisis.type,
                lastMessage: Body
            });

            return;
        }

        // Load conversation history
        logger.debug({ sessionId }, 'Loading conversation history');
        const conversation = await loadConversation(sessionId);
        const existingMetadata = conversation?.metadata || {};
        const messages = conversation?.messages || [];
        logger.debug({ sessionId, messageCount: messages.length }, 'Conversation loaded');

        // First-time user? Send warm welcome + start intake flow
        if (messages.length === 0) {
            const welcome = `Hello${ProfileName ? ` ${ProfileName}` : ''} 👋

Thank you for reaching out to Stabilis Treatment Centre. You've taken a brave step, and we're here to help.

I'm Grace, the first point of contact. I'll ask a few quick questions so our clinical team can call you back with real information about how we can help.

Everything you share is confidential. 💙`;

            logger.debug({ sessionId }, 'Sending welcome message');
            await sendWhatsApp(From, welcome);
            
            // Send first stage
            const initialStage = getWhatsAppInitialStage();
            await new Promise(resolve => setTimeout(resolve, 1500));
            await sendWhatsApp(From, initialStage.formattedMessage);

            // Save conversation with stage tracking
            await saveConversation(sessionId, [], {
                ...existingMetadata,
                channel: 'whatsapp',
                phone: From,
                profile_name: ProfileName,
                currentStage: initialStage.stageId,
                leadData: {}
            });
            return;
        }

        // User is responding during intake flow
        let responseText = null;
        let shouldContinueIntake = false;
        let nextStageId = null;
        let updatedLeadData = existingMetadata.leadData || {};

        if (existingMetadata.currentStage && !existingMetadata.lead_created) {
            // Advance through intake stage
            logger.debug({ sessionId, currentStage: existingMetadata.currentStage }, 'Advancing stage');
            
            try {
                const stageResult = advanceWhatsAppStage(
                    existingMetadata.currentStage,
                    Body,
                    updatedLeadData
                );

                if (stageResult.error) {
                    // Invalid input (e.g., wrong number), ask again
                    responseText = stageResult.error;
                    nextStageId = stageResult.stageId;
                    shouldContinueIntake = true;
                } else {
                    // Valid stage advance
                    responseText = stageResult.formattedMessage;
                    nextStageId = stageResult.nextStageId;
                    updatedLeadData = stageResult.leadData;
                    shouldContinueIntake = !stageResult.ended;

                    // Include acknowledgements
                    if (stageResult.ack && stageResult.ack.length > 0) {
                        responseText = stageResult.ack.join('\n\n') + '\n\n' + responseText;
                    }
                }
            } catch (error) {
                logger.error({ error: error.message, sessionId }, 'Stage advance failed');
                // Fall back to AI chat on error
                shouldContinueIntake = false;
            }
        }

        // If not in intake or intake ended, use AI chat
        if (!shouldContinueIntake && !responseText) {
            logger.debug({ sessionId }, 'Starting chat');
            const { text, clinicalBrief } = await chat(messages, Body);
            logger.debug({ sessionId, textLength: text?.length }, 'Chat completed');
            responseText = text;

            // Check if conversation should end based on clinical brief
            if (clinicalBrief?.conversation_complete) {
                shouldContinueIntake = false;
            }
        }

        // Save conversation with updated stage tracking
        const updatedMessages = [
            ...messages,
            { role: 'user', content: Body },
            { role: 'assistant', content: responseText }
        ];

        const updatedMetadata = {
            ...existingMetadata,
            channel: 'whatsapp',
            phone: From,
            profile_name: ProfileName,
            leadData: updatedLeadData
        };

        if (shouldContinueIntake && nextStageId) {
            updatedMetadata.currentStage = nextStageId;
        } else if (!shouldContinueIntake) {
            delete updatedMetadata.currentStage;
        }

        await saveConversation(sessionId, updatedMessages, updatedMetadata);

        // Send response
        logger.debug({ sessionId }, 'Sending response');
        await sendWhatsApp(From, responseText);

        // If intake ended and qualified, create lead + notify therapist
        if (!shouldContinueIntake && updatedLeadData && Object.keys(updatedLeadData).length > 2 && !existingMetadata.lead_created) {
            try {
                // Construct clinical brief from leadData
                const enrichedBrief = {
                    ...updatedLeadData,
                    contact_phone: updatedLeadData.contact_phone || From.replace('whatsapp:', ''),
                    intake_complete: true
                };

                const leadId = await createLead(sessionId, enrichedBrief);
                await notifyTherapist({
                    sessionId,
                    leadId,
                    priority: updatedLeadData.urgent === 'urgent' ? 'HIGH' : 'NORMAL',
                    brief: enrichedBrief
                });

                await saveConversation(sessionId, updatedMessages, {
                    ...updatedMetadata,
                    lead_created: true,
                    lead_id: leadId
                });
            } catch (error) {
                logger.error({ error: error.message, sessionId }, 'Lead creation failed');
            }
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
