/**
 * Meta WhatsApp Cloud API — send/receive layer
 *
 * Replaces the Twilio SDK for all WhatsApp traffic.
 * Uses Node 24 native fetch — no extra dependency required.
 *
 * Security surface:
 *   Inbound  — Meta signs every webhook POST with HMAC-SHA256 of the raw body
 *              using the App Secret.  verifyMetaSignature() must be called
 *              BEFORE the parsed body is acted on.
 *   Outbound — Bearer token in Authorization header.  Never expose the access
 *              token in logs.
 */

import crypto from 'crypto';
import { logger } from './logger.js';

const GRAPH_API_VERSION = 'v22.0';

/**
 * Normalise any phone-number string to the format Meta expects:
 * international digits only, no leading +, no spaces/dashes.
 * Examples: "+27 72 123 4567" → "27721234567"
 *           "whatsapp:+27721234567" → "27721234567"
 *           "0721234567" → "27721234567"   (assumes ZA)
 */
export function toMetaRecipient(phoneStr) {
    let s = String(phoneStr)
        .replace(/^whatsapp:/i, '')
        .replace(/[^\d+]/g, '');
    if (s.startsWith('+')) s = s.slice(1);
    if (s.startsWith('0')) s = '27' + s.slice(1); // local ZA → international
    return s;
}

/**
 * Send a text message via Meta WhatsApp Cloud API.
 * @param {string} to  - recipient in any supported format (see toMetaRecipient)
 * @param {string} message
 * @returns {Promise<object>} Meta API response body
 */
export async function sendWhatsAppViaMeta(to, message) {
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    const accessToken   = process.env.META_WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
        logger.warn('Meta WhatsApp not configured (META_WHATSAPP_PHONE_NUMBER_ID / META_WHATSAPP_ACCESS_TOKEN missing)');
        return null;
    }

    const recipient = toMetaRecipient(to);
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: recipient,
            type: 'text',
            text: { body: message },
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Meta WhatsApp API ${response.status}: ${errText}`);
    }

    const result = await response.json();
    logger.info(
        { recipient, messageId: result.messages?.[0]?.id },
        'Meta WhatsApp sent'
    );
    return result;
}

/**
 * Verify the X-Hub-Signature-256 header on an inbound Meta webhook POST.
 *
 * Meta computes: sha256=HMAC_SHA256(appSecret, rawBodyBuffer)
 * We do the same and compare with crypto.timingSafeEqual to prevent
 * timing oracle attacks.
 *
 * Returns false (not throws) on any failure so callers can always 403.
 *
 * @param {Buffer} rawBody           - exact bytes of the request body
 * @param {string} signatureHeader   - value of X-Hub-Signature-256 header
 */
export function verifyMetaSignature(rawBody, signatureHeader) {
    const appSecret = process.env.META_WHATSAPP_APP_SECRET;

    if (!appSecret) {
        logger.warn('META_WHATSAPP_APP_SECRET not set — webhook signature cannot be verified');
        return false;
    }

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
        return false;
    }

    const expected = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

    // Length check before timingSafeEqual (Buffer.from pads, but explicit is safer)
    if (Buffer.byteLength(signatureHeader) !== Buffer.byteLength(expected)) {
        return false;
    }

    return crypto.timingSafeEqual(
        Buffer.from(signatureHeader),
        Buffer.from(expected)
    );
}

/**
 * Extract a normalised { Body, From, ProfileName, MessageId } object from
 * Meta's nested webhook payload.  Returns null for non-text messages
 * (media, reactions, status updates, read receipts) so callers can silently
 * ignore them.
 *
 * Meta payload shape:
 *   entry[0].changes[0].value.messages[0]   ← inbound text message
 *   entry[0].changes[0].value.statuses[0]   ← delivery/read receipt (ignored)
 *
 * The returned `From` is "+27721234567" (with leading +) so that existing
 * callerId logic in whatsapp.js (`wa_${From.replace('whatsapp:', '')}`)
 * produces the same "wa_+27721234567" key that Twilio produced — no DB
 * migration needed.
 *
 * @param {object} body  - parsed request body
 * @returns {{ Body: string, From: string, ProfileName: string, MessageId: string } | null}
 */
export function parseMetaWebhookBody(body) {
    if (body?.object !== 'whatsapp_business_account') return null;

    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value) return null;

    // Status updates (delivery/read receipts) have no messages array — ignore them.
    if (!value.messages?.length) return null;

    const msg = value.messages[0];

    // Only handle text messages for now; media/interactive/etc. logged + skipped.
    if (msg.type !== 'text') {
        logger.debug({ type: msg.type, id: msg.id }, 'Non-text Meta webhook message — skipped');
        return null;
    }

    return {
        Body: msg.text?.body || '',
        From: `+${msg.from}`,    // "27721234567" → "+27721234567"
        ProfileName: value.contacts?.[0]?.profile?.name || '',
        MessageId: msg.id,
    };
}

/** True when Meta credentials are present and provider is not forced to twilio. */
export function isMetaEnabled() {
    return !!(
        process.env.META_WHATSAPP_ACCESS_TOKEN &&
        process.env.WHATSAPP_PROVIDER !== 'twilio'
    );
}
