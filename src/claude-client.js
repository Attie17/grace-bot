/**
 * Claude API Client
 * Wraps the Anthropic SDK with conversation management and error handling.
 */

import Anthropic from '@anthropic-ai/sdk';
import { CORE_SYSTEM_PROMPT, CRISIS_DETECTION_PROMPT } from './prompts.js';
import { logger } from './logger.js';

let client = null;

function getClient() {
    if (!client) {
        client = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
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

/**
 * Stage 4b acknowledgement — short, empathetic response to the user's
 * free-text health notes. No conversation history; no clinical brief.
 */
export async function respondToHealthNotes(userInput) {
    try {
        const response = await getClient().messages.create({
            model: getModel(),
            max_tokens: 200,
            system: STAGE_4B_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userInput }]
        });
        return {
            text: response.content[0].text.trim(),
            usage: response.usage
        };
    } catch (error) {
        logger.error({ error: error.message }, 'Stage 4b ack failed');
        // Soft-fail keeps the scripted flow moving if the model is down.
        return { text: 'Thank you for sharing that with me.', usage: null };
    }
}

/**
 * Quick crisis detection - runs before main chat for fast response.
 */
export async function detectCrisis(message) {
    try {
        const response = await getClient().messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 150,
            system: CRISIS_DETECTION_PROMPT,
            messages: [{ role: 'user', content: message }]
        });

        const text = response.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return { crisis: false, type: 'none', confidence: 0 };

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        logger.error({ error: error.message }, 'Crisis detection failed');
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
