/**
 * AI-Guided Grace Conversation Engine
 * 
 * Replaces scripted stages with Claude-powered natural conversation.
 * Uses GRACE_MODE=ai toggle to switch between AI and scripted modes.
 * 
 * Session structure maintained in memory and database:
 * {
 *   sessionId: string,
 *   messages: [],        // full conversation history
 *   collectedData: { ... },
 *   phase: 'open'        // open/triage/intake/close
 * }
 */

import { getClient } from './claude-client.js';
import { loadConversation, saveConversation, createLead } from './database.js';
import { notifyTherapist } from './handoff.js';
import { logger } from './logger.js';
import { AI_GRACE_SYSTEM_PROMPT } from './prompts.js';

const LEAD_CREATE_RETRY_DELAY_MS = 750;

/**
 * Main handler for AI mode messages.
 * Called from /api/stage when GRACE_MODE=ai.
 */
export async function handleAIMessage(sessionId, userMessage) {
    try {
        // Load existing session or create new one
        let conversation = await loadConversation(sessionId);
        let messages = conversation?.messages || [];
        let metadata = conversation?.metadata || {};
        let collectedData = metadata.collectedData || initializeCollectedData();
        let phase = metadata.phase || 'open';

        // Add user message to history
        messages.push({
            role: 'user',
            content: userMessage
        });

        // Call Claude with system prompt and conversation history
        const graceResponse = await callClaudeAI(messages);
        
        // Parse response and extracted data
        const { message: cleanMessage, extractedData } = parseClaudeResponse(graceResponse);
        
        // Update collected data — only overwrite fields when Claude gives a non-null value.
        // This prevents a turn that doesn't re-confirm a field from wiping it back to null.
        for (const [key, value] of Object.entries(extractedData)) {
            if (value !== null && value !== undefined) {
                collectedData[key] = value;
            }
        }
        
        // Determine if conversation is complete and what path to follow
        const conversationComplete = extractedData.conversation_complete || false;
        const inviteNeeded = extractedData.invite_needed || false;
        const triagePath = extractedData.triage_path || collectedData.triage_path;

        // ── AUDIT-C SUBFLOW TRIGGER ──
        // If the deterministic subflow is currently active, route to it instead of
        // returning Claude's response. The subflow handles parsing and scoring.
        if (collectedData.audit_c_pending) {
            const auditResult = handleAuditCSubflow(userMessage, collectedData);
            if (auditResult.stillPending) {
                // Subflow needs another response (retry or next question)
                messages.push({ role: 'assistant', content: auditResult.reply });
                metadata.collectedData = collectedData;
                metadata.phase = phase;
                metadata.triage_path = triagePath;
                await saveConversation(sessionId, messages, metadata);
                return {
                    reply: auditResult.reply,
                    ack: [],
                    next: { messages: [], inputType: 'text', stageId: 'ai_mode', ended: false },
                    ended: false
                };
            }
            // Subflow complete (scored, declined, or skipped) — fall through
            // to normal AI response handling. Claude will ask the next question
            // in the intake flow using the updated collectedData.
        }

        // ── AUDIT-C SUBFLOW INITIATION ──
        // Trigger when: alcohol is primary substance, caller is self or caring
        // (not professional), AUDIT-C has not yet been asked, and subflow is not pending.
        // NOTE: caller_type is LLM-inferred (upstream inference risk, accepted — see docs).
        const alcoholPrimary = collectedData.struggle &&
            /(alcohol|drink|wine|beer|whisky|spirits|brandy)/i.test(collectedData.struggle);
        const isEligibleCaller = collectedData.caller_type === 'self' ||
            collectedData.caller_type === 'caring';
        const auditCNotYetAsked = collectedData.audit_c_q1 === null &&
            collectedData.audit_c_pending === null;
        const hasName = !!collectedData.name;

        // Initiate after we know the struggle and name (enough context established)
        if (alcoholPrimary && isEligibleCaller && auditCNotYetAsked && hasName &&
            (triagePath === 'clinical' || collectedData.triage_path === 'clinical')) {
            collectedData.audit_c_pending = 'q1';
            const intro = `Before I pass your details across, I have three quick questions about your drinking — they help our team understand your situation better. There are no right or wrong answers.\n\nHow often do you have a drink containing alcohol?\n1 — Never\n2 — Monthly or less\n3 — 2–4 times per month\n4 — 2–3 times per week\n5 — 4 or more times per week\n\nPlease reply with the number (1–5).`;
            messages.push({ role: 'assistant', content: intro });
            metadata.collectedData = collectedData;
            metadata.phase = phase;
            metadata.triage_path = triagePath;
            await saveConversation(sessionId, messages, metadata);
            return {
                reply: intro,
                ack: [],
                next: { messages: [], inputType: 'text', stageId: 'ai_mode', ended: false },
                ended: false
            };
        }
        // ── END AUDIT-C LOGIC ──

        // Add assistant message to history
        messages.push({
            role: 'assistant',
            content: cleanMessage
        });

        // Prepare response
        let responseMessage = cleanMessage;

        // ── SAFETY NET: two-part fix for missing / hallucinated invite links ──
        //
        // Part 1 — Hallucinated URLs
        //   Claude Haiku sometimes invents URLs like:
        //     [https://app.sobrietyjourney.co.za/invite/JANE_SMITH_0829876543]
        //     https://sobrietyjourney.org/join/...
        //   These must be replaced with the real [INVITE_LINK] placeholder so
        //   the actual URL gets injected by generateInviteToken() below.
        let inviteNeededMutable = inviteNeeded;
        const hallucinatedUrlRegex = /\[?https?:\/\/[^\]\s,)]*sobrietyjourney[^\]\s,)]*\]?/gi;
        if (hallucinatedUrlRegex.test(responseMessage)) {
            hallucinatedUrlRegex.lastIndex = 0; // reset after .test()
            console.log('SAFETY NET Part 1: replacing hallucinated sobrietyjourney URL with [INVITE_LINK]');
            responseMessage = responseMessage.replace(hallucinatedUrlRegex, '[INVITE_LINK]');
            inviteNeededMutable = true;
        }

        // Part 2 — Completely missing placeholder
        //   If Grace closed an app_referral/info conversation without any
        //   invite mechanism at all, append the placeholder now.
        const hasRealUrl = /app\.sobrietyjourney\.org\/join\/[\w-]{4,}/.test(responseMessage);
        const hasPlaceholder = responseMessage.includes('[INVITE_LINK]');
        if (
            (triagePath === 'app_referral' || triagePath === 'info') &&
            conversationComplete &&
            !hasPlaceholder &&
            !hasRealUrl
        ) {
            console.log('SAFETY NET Part 2: Grace closed without [INVITE_LINK] — appending automatically');
            responseMessage += '\n\nHere is your invite to get started:\n\n[INVITE_LINK]\n\nClick the link above to create your free account.';
            inviteNeededMutable = true;
        }
        // ── END SAFETY NET ──

        // Handle app referral path — generate invite token
        if (inviteNeededMutable && (triagePath === 'app_referral' || triagePath === 'info')) {
            const inviteLink = await generateInviteToken(
                collectedData.name,
                collectedData.phone,
                collectedData.caller_type
            );
            
            // Log pre-replacement message
            console.log('PRE-REPLACE MESSAGE:', responseMessage.substring(0, 200));
            console.log('INVITE URL:', inviteLink || 'NULL - API FAILED');
            
            // Use regex to catch ANY variation of invite placeholder
            // Catches [INVITE_LINK], [SOBRIETY_JOURNEY_INVITE_LINK], 
            // [INVITE_LINK: sobrietyjourney.co.za/...], etc.
            const inviteRegex = /\[[\w_\s]*INVITE[^\]]*\]/gi;
            
            if (!inviteLink) {
                // If invite generation failed, replace placeholder with contact info
                responseMessage = responseMessage.replace(
                    inviteRegex,
                    '\n\nPlease contact us directly at reception@stabilistc.co.za and we will get you set up personally.'
                );
            } else {
                // Replace any placeholder variation with the real URL
                responseMessage = responseMessage.replace(inviteRegex, `\n\n${inviteLink}\n\n`);
            }
            
            // Remove WhatsApp-specific language that doesn't apply to URL delivery
            responseMessage = responseMessage
                .replace(/via WhatsApp/gi, '')
                .replace(/through WhatsApp/gi, '')
                .replace(/WhatsApp link/gi, '')
                .replace(/sent? (to|via) your \w+/gi, '')
                .replace(/[ \t]{2,}/g, ' ')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            // Log post-replacement message
            console.log('POST-REPLACE MESSAGE:', responseMessage.substring(0, 200));
            
            // Save to grace-bot leads table (for admin follow-up)
            if (collectedData.name && collectedData.phone) {
                const leadBrief = {
                    contact_name: collectedData.name,
                    contact_phone: collectedData.phone,
                    city: collectedData.city || null,
                    track: 'app_referral',
                    for_whom: triagePath === 'app_referral' ? 'deciding' : 'information',
                    urgency: 'researching',
                    urgency_level: 'normal',
                    notes_for_therapist: `Grace AI path: ${triagePath}. User introduced via widget. ${!inviteLink ? 'INVITE GENERATION FAILED - manual follow-up needed' : ''}`,
                    language_preference: 'en',
                    caller_type: collectedData.caller_type || 'self'
                };
                
                try {
                    const leadId = await createLeadWithRetry(sessionId, leadBrief);
                    logger.info({ sessionId, leadId, triagePath, inviteGenerated: !!inviteLink }, 'App referral lead created');
                    
                    // Notify reception for app referral (so they can follow up)
                    notifyTherapist({
                        sessionId,
                        leadId,
                        priority: 'APP_REFERRAL',
                        brief: leadBrief
                    }).then(() => {
                        logger.info({ sessionId, leadId }, 'App referral reception notified');
                    }).catch(err => {
                        logger.error({ error: err.message, sessionId, leadId }, 'App referral notification failed (non-blocking)');
                    });
                } catch (err) {
                    logger.warn({ error: err.message, sessionId }, 'Failed to create app referral lead');
                    await handleLeadCreationFailure({
                        sessionId,
                        messages,
                        metadata,
                        brief: leadBrief,
                        error: err,
                        path: triagePath,
                        priority: 'APP_REFERRAL'
                    });
                }
            }
        }

        // Handle clinical path — create full lead and notify therapist
        if (conversationComplete && triagePath === 'clinical') {
            if (collectedData.name && collectedData.phone) {
                const clinicalBrief = buildClinicalBrief(collectedData);
                try {
                    const leadId = await createLeadWithRetry(sessionId, clinicalBrief);
                    notifyTherapist({
                        sessionId,
                        leadId,
                        priority: collectedData.urgency === 'crisis' ? 'CRISIS' : 'HIGH',
                        brief: clinicalBrief
                    }).then(() => {
                        logger.info({ sessionId, leadId }, 'Clinical therapist notified');
                    }).catch(err => {
                        logger.error({ error: err.message, sessionId, leadId }, 'Clinical notification failed (non-blocking)');
                    });
                    logger.info({ sessionId, leadId }, 'Clinical lead created');
                    metadata.lead_created = true;
                    metadata.lead_id = leadId;
                } catch (err) {
                    logger.error({ error: err.message, sessionId }, 'Clinical lead creation failed');
                    await handleLeadCreationFailure({
                        sessionId,
                        messages,
                        metadata,
                        brief: clinicalBrief,
                        error: err,
                        path: triagePath,
                        priority: collectedData.urgency === 'crisis' ? 'CRISIS' : 'HIGH'
                    });
                }
            }
        }

        // SAFETY NET: catch any invite placeholder that slipped through
        // (e.g. Claude generated placeholder but didn't set invite_needed: true)
        const safetyInviteRegex = /\[[\w_\s]*INVITE[^\]]*\]/gi;
        if (safetyInviteRegex.test(responseMessage)) {
            console.log('SAFETY NET TRIGGERED: invite placeholder found outside invite block');
            const safetyInviteUrl = (collectedData.name && collectedData.phone)
                ? await generateInviteToken(collectedData.name, collectedData.phone, collectedData.caller_type)
                : null;
            const safetyInviteRegex2 = /\[[\w_\s]*INVITE[^\]]*\]/gi;
            if (safetyInviteUrl) {
                responseMessage = responseMessage.replace(safetyInviteRegex2, `\n\n${safetyInviteUrl}\n\n`);
            } else {
                responseMessage = responseMessage.replace(
                    safetyInviteRegex2,
                    'Please contact us directly at reception@stabilistc.co.za and we will get you set up personally.'
                );
            }
            console.log('SAFETY NET POST-REPLACE:', responseMessage.substring(0, 200));
        }

        // Update metadata and save conversation
        metadata.collectedData = collectedData;
        metadata.phase = conversationComplete ? 'close' : phase;
        metadata.triage_path = triagePath;
        
        await saveConversation(sessionId, messages, metadata);

        // Return response to widget in the format renderResponse() expects:
        // reply → rendered as a bot message, next → drives currentStage / input state.
        return {
            reply: responseMessage,
            ack: [],
            next: {
                messages: [],
                inputType: conversationComplete ? 'none' : 'text',
                stageId: 'ai_mode',
                ended: conversationComplete
            },
            ended: conversationComplete,
            triage_path: triagePath
        };

    } catch (error) {
        logger.error({ error: error.message, sessionId }, 'AI message handler failed');
        return {
            error: 'I apologize — I had trouble processing that. Could you try again?',
            next: {
                messages: [],
                inputType: 'text',
                stageId: 'ai_mode'
            },
            ended: false
        };
    }
}

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createLeadWithRetry(sessionId, brief) {
    let lastError;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
            return await createLead(sessionId, brief);
        } catch (err) {
            lastError = err;
            logger.warn({ error: err.message, sessionId, attempt }, 'Lead creation attempt failed');
            if (attempt < 2) {
                await wait(LEAD_CREATE_RETRY_DELAY_MS);
            }
        }
    }

    throw lastError;
}

async function handleLeadCreationFailure({ sessionId, messages, metadata, brief, error, path, priority }) {
    const failedAt = new Date().toISOString();
    const errorMessage = error?.message || 'Unknown lead creation error';

    metadata.lead_created = false;
    metadata.lead_creation_failed = true;
    metadata.lead_creation_error = errorMessage;
    metadata.lead_creation_failed_at = failedAt;
    metadata.lead_creation_path = path;

    await saveConversation(sessionId, messages, metadata);

    const manualBrief = {
        ...brief,
        notes_for_therapist: [
            `MANUAL LEAD REQUIRED: Grace collected a completed ${path} conversation, but automatic lead insert failed at ${failedAt}.`,
            `Session: ${sessionId}`,
            `Insert error: ${errorMessage}`,
            brief.notes_for_therapist || ''
        ].filter(Boolean).join('\n\n')
    };

    notifyTherapist({
        sessionId,
        leadId: null,
        priority,
        brief: manualBrief
    }).then(() => {
        logger.info({ sessionId, path }, 'Manual lead failure handoff sent');
    }).catch(err => {
        logger.error({ error: err.message, sessionId, path }, 'Manual lead failure handoff failed');
    });
}

/**
 * Call Claude API with conversation history.
 * Returns full response text including DATA: extraction instruction.
 */
async function callClaudeAI(messages) {
    const client = getClient();
    
    // Add data extraction instruction as final system message
    const extractionInstruction = `

After your response, on a new line, output ONLY this JSON (no backticks):
DATA:{"name":null,"phone":null,"city":null,"struggle":null,"caller_type":null,"urgency":null,"triage_path":null,"crisis":false,"conversation_complete":false,"invite_needed":false}
Rules for the DATA block:
- Review the ENTIRE conversation history before filling values.
- Include ALL data collected across ALL previous turns, not just this turn.
- NEVER output null for a field if that data was already provided earlier in the conversation.
- caller_type: "self" if calling for themselves, "caring" if calling for a loved one, "professional" for referrals.
- triage_path: "clinical" (needs treatment now), "app_referral" (support/explore), or "info" (general info).
- invite_needed: set to true the moment you are closing an app_referral or info conversation and have name + phone.
- conversation_complete: true only when you have sent the goodbye message.
- For caring callers: name = caller's name (not the referred person's name), phone = caller's phone number.
- DO NOT extract or infer audit_c_score or audit_c_tier — these are calculated by a separate validated subflow, never from narrative context.`;

    try {
        const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 600,
            system: AI_GRACE_SYSTEM_PROMPT + extractionInstruction,
            messages: messages
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        return text;
    } catch (error) {
        logger.error({ error: error.message }, 'Claude API call failed');
        throw new Error('Unable to connect to conversation engine');
    }
}

/**
 * Parse Claude's response to extract the message and JSON data.
 */
function parseClaudeResponse(response) {
    const parts = response.split('DATA:');
    const message = (parts[0] || '').trim();
    
    let extractedData = {};
    if (parts.length > 1) {
        try {
            const jsonStr = parts[1].trim();
            extractedData = JSON.parse(jsonStr);
        } catch (err) {
            logger.warn({ error: err.message, jsonStr: parts[1] }, 'Failed to parse Claude data extraction');
        }
    }

    return {
        message,
        extractedData
    };
}

// ── AUDIT-C SUBFLOW ──────────────────────────────────────────────────────────
//
// Deterministic 3-question screening. Called when collectedData.audit_c_pending
// is set. Parses the numeric response, advances to next question, or scores.
//
// Returns: { stillPending: bool, reply: string }
//   stillPending = true  → return reply to caller immediately (next Q or retry)
//   stillPending = false → subflow complete, fall through to normal AI turn
//
// KNOWN LIMITATION: The trigger (caller_type) is LLM-inferred; the scoring is
// deterministic. A wrong trigger = wrong Q asked (bad experience), not a wrong
// score (clinical error). Accepted trade-off — see docs.
//
function handleAuditCSubflow(userMessage, collectedData) {
    const QUESTIONS = {
        q1: {
            text: 'How often do you have a drink containing alcohol?\n1 — Never\n2 — Monthly or less\n3 — 2–4 times per month\n4 — 2–3 times per week\n5 — 4 or more times per week\n\nPlease reply with the number (1–5).',
            retryKey: 'retry_q1',
            nextPending: 'q2',
            field: 'audit_c_q1'
        },
        q2: {
            text: 'How many standard drinks do you have on a typical day when you are drinking?\n1 — 1 or 2\n2 — 3 or 4\n3 — 5 or 6\n4 — 7 to 9\n5 — 10 or more\n\nPlease reply with the number (1–5).',
            retryKey: 'retry_q2',
            nextPending: 'q3',
            field: 'audit_c_q2'
        },
        q3: {
            text: 'How often do you have 6 or more drinks on one occasion?\n1 — Never\n2 — Less than monthly\n3 — Monthly\n4 — Weekly\n5 — Daily or almost daily\n\nPlease reply with the number (1–5).',
            retryKey: 'retry_q3',
            nextPending: null,
            field: 'audit_c_q3'
        }
    };

    const pending = collectedData.audit_c_pending;
    const isRetry = pending?.startsWith('retry_');
    const qKey = isRetry ? pending.replace('retry_', '') : pending;
    const question = QUESTIONS[qKey];

    if (!question) {
        // Unknown pending state — clear and fall through
        collectedData.audit_c_pending = null;
        return { stillPending: false, reply: null };
    }

    // Parse the user's answer — accept just the digit, possibly with surrounding text
    const match = userMessage.trim().match(/\b([1-5])\b/);
    const answer = match ? parseInt(match[1]) : null;

    if (answer === null) {
        if (isRetry) {
            // Second bad answer — skip this question gracefully, no score assigned
            collectedData[question.field] = null;
            collectedData.audit_c_pending = question.nextPending;
            if (!question.nextPending) {
                // Was on q3, can't score without it — clear all
                collectedData.audit_c_score = null;
                collectedData.audit_c_tier = null;
                collectedData.audit_c_pending = null;
                return { stillPending: false, reply: null };
            }
            const nextQ = QUESTIONS[question.nextPending];
            return { stillPending: true, reply: `No problem — let\'s move on.\n\n${nextQ.text}` };
        }
        // First bad answer — offer one retry
        collectedData.audit_c_pending = question.retryKey;
        return {
            stillPending: true,
            reply: `I just need a number between 1 and 5 for that one. No pressure — take your time.\n\n${question.text}`
        };
    }

    // Valid answer — store it
    collectedData[question.field] = answer;

    if (question.nextPending) {
        // Move to next question
        collectedData.audit_c_pending = question.nextPending;
        return { stillPending: true, reply: QUESTIONS[question.nextPending].text };
    }

    // All three answered — score
    const q1 = collectedData.audit_c_q1;
    const q2 = collectedData.audit_c_q2;
    const q3 = collectedData.audit_c_q3;

    if (q1 !== null && q2 !== null && q3 !== null) {
        const score = (q1 - 1) + (q2 - 1) + (q3 - 1);
        collectedData.audit_c_score = score;
        collectedData.audit_c_tier = score <= 2 ? 'universal'
            : score <= 5 ? 'selective'
            : 'indicated';
    }
    // If any Q was skipped (null), leave score/tier null — partial data, no score assigned

    collectedData.audit_c_pending = null;
    return { stillPending: false, reply: null };
}
// ── END AUDIT-C SUBFLOW ───────────────────────────────────────────────────────

/**
 * Initialize empty collected data structure.
 */
function initializeCollectedData() {
    return {
        name: null,
        phone: null,
        city: null,
        struggle: null,
        caller_type: null,
        medical_aid: null,
        urgency: null,
        involves_minor: false,
        guardian_name: null,
        guardian_phone: null,
        // AUDIT-C: set by deterministic subflow, never inferred by Claude
        audit_c_q1: null,
        audit_c_q2: null,
        audit_c_q3: null,
        audit_c_score: null,
        audit_c_tier: null,
        audit_c_pending: null,   // 'q1' | 'q2' | 'q3' | 'retry_q1' | 'retry_q2' | 'retry_q3' | null
        health_notes: null,
        triage_path: null
    };
}

/**
 * Generate an invite token by calling the real Sobriety Journey API.
 * Calls SJ API endpoint /api/invite/grace.
 * Returns null if API fails or env vars are missing.
 */
async function generateInviteToken(name, phone, callerType) {
    if (!process.env.SJ_APP_URL || !process.env.GRACE_WEBHOOK_SECRET) {
        console.error('Missing SJ_APP_URL or GRACE_WEBHOOK_SECRET');
        console.error('SJ_APP_URL:', process.env.SJ_APP_URL);
        console.error('GRACE_WEBHOOK_SECRET:', process.env.GRACE_WEBHOOK_SECRET ? process.env.GRACE_WEBHOOK_SECRET.substring(0, 20) + '...' : 'undefined');
        logger.error({ name, phone }, 'Cannot generate invite: missing SJ config');
        return null;
    }

    try {
        console.log('CALLING SJ API:', process.env.SJ_APP_URL + '/api/invite/grace');
        console.log('WEBHOOK SECRET (first 20 chars):', process.env.GRACE_WEBHOOK_SECRET.substring(0, 20));
        
        const response = await fetch(
            `${process.env.SJ_APP_URL}/api/invite/grace`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-webhook-secret': process.env.GRACE_WEBHOOK_SECRET
                },
                body: JSON.stringify({
                    name,
                    phone,
                    role: callerType === 'caring' ? 'caring' : 'deciding',
                    source: 'grace',
                    callerType
                })
            }
        );

        if (!response.ok) {
            console.error('SJ invite API failed:', response.status);
            logger.error({ status: response.status, name, phone }, 'SJ invite API returned error');
            return null;
        }

        const data = await response.json();
        console.log('INVITE GENERATED:', data.inviteUrl);
        logger.info({ name, phone, inviteUrl: data.inviteUrl }, 'Invite generated successfully');
        return data.inviteUrl;

    } catch (err) {
        console.error('INVITE API ERROR:', err);
        logger.error({ error: err.message, name, phone }, 'Failed to call SJ invite API');
        return null;
    }
}

/**
 * Build clinical brief from collected data.
 * Used when triage_path is 'clinical'.
 */
function buildClinicalBrief(collectedData) {
    return {
        contact_name: collectedData.name,
        contact_phone: collectedData.phone,
        city: collectedData.city,
        track: 'substance',
        substance_primary: collectedData.struggle,
        caller_type: collectedData.caller_type || 'self',
        for_whom: collectedData.caller_type === 'caring' ? 'family' : 'self',
        urgency: collectedData.urgency || 'soon',
        urgency_level: collectedData.crisis ? 'crisis' : 'urgent',
        medical_aid: collectedData.medical_aid,
        notes_for_therapist: collectedData.health_notes,
        involves_minor: collectedData.involves_minor,
        guardian_name: collectedData.guardian_name,
        guardian_phone: collectedData.guardian_phone,
        audit_c_score: collectedData.audit_c_score,
        audit_c_tier: collectedData.audit_c_tier,
        language_preference: 'en',
        status: 'new'
    };
}

export default {
    handleAIMessage,
    generateInviteToken
};
