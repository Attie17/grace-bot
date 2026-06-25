/**
 * WhatsApp Stage Handler
 * 
 * Adapts the scripted intake stages for WhatsApp by converting button options
 * to numbered text format (since WhatsApp doesn't support buttons without
 * Business API).
 * 
 * Format: "Message\n\n1. Option A\n2. Option B\n\nReply with the number (e.g., 1)"
 */

import { getStagePayload, advance, FIRST_STAGE_ID } from './stages.js';
import { logger } from './logger.js';

/**
 * Format a stage payload for WhatsApp display.
 * Converts button options to numbered text.
 */
export function formatStageForWhatsApp(payload) {
    if (!payload) return null;

    const messages = Array.isArray(payload.messages) 
        ? payload.messages 
        : [payload.messages];
    
    let text = messages.join('\n\n');

    // If stage has button options, convert to numbered format
    if (payload.inputType === 'buttons' && payload.options && payload.options.length > 0) {
        const numbered = payload.options
            .map((opt, i) => `${i + 1}. ${opt.label}`)
            .join('\n');
        
        text += `\n\n${numbered}\n\nPlease reply with the number of your choice (e.g., 1)`;
    } else if (payload.inputType === 'text') {
        text += '\n\n(Please type your response)';
    }

    return text;
}

/**
 * Get the initial stage for WhatsApp.
 */
export function getWhatsAppInitialStage(leadData = {}) {
    const payload = getStagePayload(FIRST_STAGE_ID, leadData);
    return {
        stageId: FIRST_STAGE_ID,
        payload,
        formattedMessage: formatStageForWhatsApp(payload)
    };
}

/**
 * Advance a WhatsApp user through stages.
 * 
 * If the user's response is a number for a button stage, convert it to the
 * button value. Otherwise, treat it as typed input.
 */
export function advanceWhatsAppStage(stageId, userInput, leadData = {}) {
    const currentStage = getStagePayload(stageId, leadData);
    
    let value = userInput;
    
    // If current stage is buttons and user input is a number, map to option value
    if (currentStage.inputType === 'buttons' && currentStage.options) {
        const num = parseInt(userInput.trim());
        if (!isNaN(num) && num > 0 && num <= currentStage.options.length) {
            value = currentStage.options[num - 1].value;
        } else {
            // Invalid number selection - ask again
            return {
                error: `Please reply with a number between 1 and ${currentStage.options.length}`,
                stageId,
                formattedMessage: formatStageForWhatsApp(currentStage)
            };
        }
    }

    try {
        const result = advance(stageId, value, leadData);
        
        return {
            ack: result.ack,
            nextStageId: result.next.stageId,
            nextPayload: result.next,
            formattedMessage: formatStageForWhatsApp(result.next),
            leadData: result.leadData,
            ended: result.ended
        };
    } catch (error) {
        logger.error({ error: error.message, stageId }, 'WhatsApp stage advance failed');
        throw error;
    }
}
