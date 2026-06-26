/**
 * Claude API Client
 * Wraps the Anthropic SDK with conversation management and error handling.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
    CORE_SYSTEM_PROMPT,
    CRISIS_DETECTION_PROMPT
} from './prompts.js';
import { logger } from './logger.js';

let client = null;

function getClient() {
    if (!client) {
        client = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
            timeout: 10000
        });
    }
    return client;
}

function getModel() {
    return process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
}

/**
 * Send a message in an ongoing conversation.
 * @param {Array} messages - Previous conversation history
 * @param {string} userMessage - New message from user
 * @returns {Promise<{text: string, clinicalBrief: object|null}>}
 */
export async function chat(messages, userMessage) {
    const conversationHistory = [
        ...messages,
        { role: 'user', content: userMessage }
    ];

    try {
        const response = await getClient().messages.create({
            model: getModel(),
            max_tokens: 1024,
            system: CORE_SYSTEM_PROMPT,
            messages: conversationHistory
        });

        const text = response.content[0].text;
        const clinicalBrief = extractClinicalBrief(text);
        const conversationEnded = /<conversation_ended\s*\/>/.test(text);
        const cleanText = text
            .replace(/<clinical_brief>[\s\S]*?<\/clinical_brief>/g, '')
            .replace(/<conversation_ended\s*\/>/g, '')
            .trim();

        return {
            text: cleanText,
            clinicalBrief,
            conversationEnded,
            usage: response.usage
        };
    } catch (error) {
        logger.error({ error: error.message }, 'Claude API error');
        throw new Error('Unable to process message. Please try again.');
    }
}

const STAGE_4B_SYSTEM_PROMPT = `You are Grace, a warm care counsellor for Stabilis Treatment Centre. The person has just shared free-text health notes in response to "Are there any other health concerns I should note — physical or mental health?"

Respond in 1-2 sentences with warmth and empathy, acknowledging what they shared. Do not ask any questions. Do not give medical advice. End warmly.`;

const WELLNESS_INTRO_ACK_PROMPT = `You are Grace, a warm care counsellor for Stabilis Wellness Centre. The person has just shared their wellness journey or concerns. 

Respond in 1-2 sentences with warmth and empathy, acknowledging what they shared. Do not ask any questions. End warmly with a gentle invitation to continue.`;

const ADDITIONAL_NOTES_ACK_PROMPT = `You are Grace, a warm care counsellor for Stabilis Treatment Centre. The person has shared additional thoughts or concerns they wanted to mention.

Respond in 1-2 sentences with warmth and empathy, acknowledging what they shared. Do not ask any questions. End warmly.`;

/**
 * Generate personalized opening acknowledgement based on caller context.
 * Called after track selection to provide warm, context-aware greeting.
 */
export async function generateOpeningAcknowledgement(callerContext) {
    const systemPrompt = `You are Grace, a warm and compassionate intake assistant for Stabilis Treatment Centre. Generate a single short acknowledgement message (2-3 sentences maximum) for the caller based on their context. Never mention clinical diagnoses. Never give advice. Be warm, non-judgmental, human. Do not mention that you are an AI.`;
    
    const fallback = "Thank you for reaching out. I'm here to help you through this process.";
    
    try {
        const response = await getClient().messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            system: systemPrompt,
            messages: [{
                role: 'user',
                content: `Caller context: ${JSON.stringify(callerContext)}`
            }]
        });
        
        const text = response.content[0].text.trim();
        return {
            message: text || fallback,
            usage: response.usage
        };
    } catch (error) {
        logger.warn({ error: error.message }, 'Opening ack generation failed - using fallback');
        return {
            message: fallback,
            usage: null
        };
    }
}

const EMPATHY_PROMPTS = {
    stage4b:        STAGE_4B_SYSTEM_PROMPT,
    wellness_intro: WELLNESS_INTRO_ACK_PROMPT,
    notes:          ADDITIONAL_NOTES_ACK_PROMPT
};

const EMPATHY_FALLBACK = {
    stage4b:        'Thank you for sharing that with me.',
    wellness_intro: "Thank you for trusting us with that. You're not alone in this.",
    notes:          'Got it — the team will see that. Thank you.'
};

/**
 * Short, empathetic acknowledgement for a free-text answer in the scripted
 * flow. `context` selects the prompt + soft-fail copy.
 */
export async function respondEmpathetically(context, userInput) {
    const systemPrompt = EMPATHY_PROMPTS[context] || STAGE_4B_SYSTEM_PROMPT;
    const fallback = EMPATHY_FALLBACK[context] || EMPATHY_FALLBACK.stage4b;

    try {
        const response = await getClient().messages.create({
            model: getModel(),
            max_tokens: 200,
            system: systemPrompt,
            messages: [{ role: 'user', content: userInput }]
        });
        return {
            text: response.content[0].text.trim(),
            usage: response.usage
        };
    } catch (error) {
        logger.error({ error: error.message, context }, 'Empathetic ack failed');
        // Soft-fail keeps the scripted flow moving if the model is down.
        return { text: fallback, usage: null };
    }
}

/**
 * Stage 4b acknowledgement — kept as a thin wrapper for existing callers.
 */
export async function respondToHealthNotes(userInput) {
    return respondEmpathetically('stage4b', userInput);
}

/**
 * Combined crisis detection + empathetic response in a single API call.
 * Returns both the empathetic ack and crisis flags.
 * Halves API cost and latency compared to two separate calls.
 */
function buildCombinedSystemPrompt(context) {
    const empathyBase = EMPATHY_PROMPTS[context] || STAGE_4B_SYSTEM_PROMPT;
    return `${empathyBase}

Also analyze for crisis indicators:
${CRISIS_DETECTION_PROMPT}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "response": "your empathetic acknowledgement",
  "crisis": true or false,
  "type": "none" or "overdose" or "withdrawal" or "violence" or "medical",
  "confidence": number between 0 and 1
}`;
}

export async function getResponseWithCrisisDetection(context, userInput) {
    const systemPrompt = buildCombinedSystemPrompt(context);
    const fallback = EMPATHY_FALLBACK[context] || EMPATHY_FALLBACK.stage4b;
    const timeoutFallback = "Thank you for sharing that. Our team will give this the attention it deserves.";

    try {
        const response = await getClient().messages.create({
            model: getModel(),
            max_tokens: 500,
            system: systemPrompt,
            messages: [{ role: 'user', content: userInput }]
        });

        const text = response.content[0].text.trim();
        
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                logger.warn({ context }, 'No JSON in combined response');
                return {
                    response: fallback,
                    crisis: false,
                    type: 'none',
                    confidence: 0,
                    usage: response.usage
                };
            }
            
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                response: parsed.response || fallback,
                crisis: parsed.crisis || false,
                type: parsed.type || 'none',
                confidence: parsed.confidence || 0,
                usage: response.usage
            };
        } catch (parseError) {
            logger.warn({ error: parseError.message, context }, 'Failed to parse combined JSON');
            return {
                response: fallback,
                crisis: false,
                type: 'none',
                confidence: 0,
                usage: response.usage
            };
        }
    } catch (error) {
        // Handle timeout gracefully with warm fallback message
        if (error.code === 'ERR_HTTP_REQUEST_TIMEOUT' || error.name === 'APIConnectionTimeoutError' || error.message.includes('timeout')) {
            logger.warn({ error: error.message, context }, 'Claude API timeout (10s) — using fallback');
            return {
                response: timeoutFallback,
                crisis: false,
                type: 'none',
                confidence: 0,
                usage: null
            };
        }
        
        logger.error({ error: error.message, context }, 'Combined API call failed');
        return {
            response: fallback,
            crisis: false,
            type: 'none',
            confidence: 0,
            usage: null
        };
    }
}

/**
 * Quick crisis detection - runs before main chat for fast response.
 * DEPRECATED: Use getResponseWithCrisisDetection() for combined call.
 */
export async function detectCrisis(message) {
    try {
        const response = await getClient().messages.create({
            model: getModel(),
            max_tokens: 150,
            system: CRISIS_DETECTION_PROMPT,
            messages: [{ role: 'user', content: message }]
        });

        const text = response.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return { crisis: false, type: 'none', confidence: 0 };

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        logger.warn({ error: error.message }, 'Crisis detection failed - continuing without crisis check');
        return { crisis: false, type: 'none', confidence: 0 };
    }
}

function extractClinicalBrief(text) {
    const match = text.match(/<clinical_brief>([\s\S]*?)<\/clinical_brief>/);
    if (!match) return null;

    try {
        return JSON.parse(match[1].trim());
    } catch (error) {
        logger.warn({ content: match[1] }, 'Failed to parse clinical brief');
        return null;
    }
}
