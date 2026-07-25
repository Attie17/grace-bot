/**
 * Therapist Handoff System
 * 
 * When a lead is qualified, alert the therapist immediately via:
 * 1. WhatsApp (for urgency — people actually read these)
 * 2. Email (with full clinical brief)
 * 
 * Priority levels:
 * - CRISIS: Respond within 5 minutes
 * - HIGH: Call within 1 hour (immediate urgency)
 * - NORMAL: Call within 24 hours
 */

import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { logger } from './logger.js';

const twilioClient = process.env.TWILIO_ACCOUNT_SID
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Notify therapist of a new lead.
 * Returns invite URL from SJ webhook if available.
 */
export async function notifyTherapist({ sessionId, leadId, priority, brief, type, lastMessage }) {
    const isCrisis = priority === 'CRISIS';
    let sjWebhookResult = null;

    try {
        // Always notify reception via WhatsApp for every completed lead
        if (brief) {
            sendReceptionWhatsApp(brief).catch(err => {
                logger.error({ error: err.message, leadId }, 'Reception WhatsApp failed');
            });
        }

        // Send WhatsApp in background (non-blocking) - don't wait
        // If WhatsApp fails, email will still be sent
        if (priority === 'CRISIS') {
            sendWhatsAppAlert({ priority, brief, type, lastMessage }).catch(err => {
                logger.warn({ error: err.message, leadId, priority }, 'WhatsApp alert failed (continuing with email)');
            });
        } else if ((priority === 'HIGH' || brief?.involves_minor || brief?.urgency_level === 'crisis') && brief) {
            sendWhatsAppAlert({ priority, brief, type, lastMessage }).catch(err => {
                logger.warn({ error: err.message, leadId, priority }, 'WhatsApp alert failed (continuing with email)');
            });
        }

        // Always send email with full brief - critical path that must not fail silently
        if (brief) {
            await sendEmail({ leadId, priority, brief });
        } else if (isCrisis) {
            await sendCrisisEmail({ sessionId, type, lastMessage });
        }

        // Notify Sobriety Journey of new admission (capture result for invite URL)
        if (brief && leadId) {
            sjWebhookResult = await notifySobrietyJourney(brief, leadId).catch(err => {
                logger.warn({ error: err.message, leadId }, 'SJ webhook notification failed (non-blocking)');
                return null;
            });
        }

        logger.info({ leadId, priority }, 'Therapist notified (email sent)');

        // Return invite URL if available
        return { inviteUrl: sjWebhookResult?.inviteUrl || null };

    } catch (error) {
        logger.error({ error: error.message, leadId }, 'Failed to notify therapist - email not sent');
        // Don't throw - conversation should continue even if alert fails
        return { inviteUrl: null };
    }
}

/**
 * Send WhatsApp alert to therapist via Twilio.
 * Includes timeout handling for Railway deployments.
 */
async function sendWhatsAppAlert({ priority, brief, type, lastMessage }) {
    if (!twilioClient || !process.env.THERAPIST_WHATSAPP) {
        logger.warn('WhatsApp alerts not configured, skipping');
        return;
    }

    let message;
    if (priority === 'CRISIS') {
        message = `🚨 *STABILIS CRISIS ALERT*\n\nType: ${type}\nMessage: "${lastMessage?.substring(0, 200)}"\n\n⚡ Action: Contact user within 5 mins if possible.`;
    } else {
        const isMentalHealth = brief.track === 'mental_health';
        const trackTag = isMentalHealth ? 'Wellness' : 'SUD';
        const trackLine = isMentalHealth
            ? `What they're going through: ${(brief.wellness_brief || 'Not shared').substring(0, 200)}`
            : `Struggling with: ${brief.substance_primary}\nMedical Aid: ${brief.medical_aid || 'Not specified'}`;
        const extraNotes = brief.additional_notes
            ? `\nAdditional notes: ${brief.additional_notes.substring(0, 200)}`
            : '';
        message = `📋 *URGENT GRACE BOT LEAD (${trackTag})*\n\nName: ${brief.contact_name}\nPhone: ${brief.contact_phone}\nBest time to call: ${brief.preferred_callback_time || 'Any time'}\n${trackLine}\nReadiness: ${brief.urgency}${extraNotes}\n\nPlease contact within 1 hour.`;
    }

    const therapistNumber = process.env.THERAPIST_WHATSAPP.startsWith('whatsapp:')
        ? process.env.THERAPIST_WHATSAPP
        : `whatsapp:${process.env.THERAPIST_WHATSAPP}`;

    // Wrap in timeout to prevent hanging on slow networks (Railway)
    return Promise.race([
        twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: therapistNumber
        }),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('WhatsApp send timeout (30s)')), 30000)
        )
    ]);
}

/**
 * Send WhatsApp intake summary to reception for every completed lead.
 * Replaces broken email flow as primary notification method.
 */
async function sendReceptionWhatsApp(brief) {
    if (!twilioClient || !process.env.RECEPTION_WHATSAPP || !brief) {
        return Promise.resolve();
    }

    const urgencyEmoji =
        brief.urgency_level === 'crisis' ? '🚨' :
        brief.involves_minor ? '👶' :
        brief.priority === 'HIGH' ? '⚠️' : '📋';

    const lines = [
        `${urgencyEmoji} *NEW GRACE INTAKE*`,
        ``,
        `👤 ${brief.contact_name || 'Unknown'}`,
        `📞 ${brief.contact_phone || 'No phone'}`,
        `🏙️ ${brief.city || 'City not provided'}`,
        `💊 ${brief.substance_primary || brief.track || 'Not specified'}`,
        `💳 ${brief.medical_aid || 'No medical aid'}`,
        `⏰ Best time: ${brief.preferred_callback_time || 'Any time'}`,
        `🎯 Readiness: ${brief.urgency || 'Not stated'}`,
        `📊 AUDIT-C: ${brief.audit_c_score !== undefined ?
            `Score ${brief.audit_c_score} (${brief.audit_c_tier})` :
            'Not completed'}`,
        brief.involves_minor ? `👶 MINOR — guardian contact required` : null,
        ``,
        `📝 ${brief.health_notes ?
            brief.health_notes.substring(0, 200) : 'No health notes'}`,
    ].filter(Boolean).join('\n');

    const receptionNumber = process.env.RECEPTION_WHATSAPP.startsWith('whatsapp:')
        ? process.env.RECEPTION_WHATSAPP
        : `whatsapp:${process.env.RECEPTION_WHATSAPP}`;

    return Promise.race([
        twilioClient.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: receptionNumber,
            body: lines
        }),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Reception WhatsApp send timeout (30s)')), 30000)
        )
    ]);
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const TRACK_LABEL = {
    mental_health: '💚 Wellness — Emotional / Mental Health',
    substance:     '💊 Substance Use',
    digital:       '📱 Digital / Screen / Gaming',
    not_sure:      '🤔 General Inquiry'
};

async function sendEmail({ leadId, priority, brief }) {
    if (!process.env.RECEPTION_EMAIL) {
        logger.warn('RECEPTION_EMAIL not configured, skipping');
        return;
    }

    const isUrgent = priority === 'HIGH';
    const urgencyColor = {
        'CRISIS': '#c0392b',
        'HIGH': '#e67e22',
        'NORMAL': '#27ae60'
    }[priority] || '#7f8c8d';

    const isMentalHealth = brief.track === 'mental_health';
    const track = brief.track || 'substance';
    const trackLabel = TRACK_LABEL[track] || TRACK_LABEL.substance;
    const trackBadgeColor = isMentalHealth ? '#27ae60' : '#2E5A87';

    const additionalNotesBlock = brief.additional_notes ? `
        <div style="padding: 20px; background: #FFF8E1; border-left: 4px solid #F9A825;">
            <h3 style="color: #7E5A00; margin-top: 0;">📌 Additional notes from the user</h3>
            <p style="line-height: 1.6; white-space: pre-wrap;">${escapeHtml(brief.additional_notes)}</p>
        </div>
    ` : `
        <div style="padding: 12px 20px; background: #f9f9f9; color: #888; font-size: 13px;">
            No additional notes — the user skipped the optional catch-all.
        </div>
    `;

    const clinicalBlock = isMentalHealth ? `
        <div style="padding: 20px;">
            <h2 style="color: #2E5A87;">Clinical Brief</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>For whom</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(brief.for_whom)}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Primary substance</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(brief.substance_primary)}</td>
                </tr>
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Usage pattern</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(brief.usage_pattern)}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Previous treatment</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(brief.previous_treatment)}</td>
                </tr>
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Mental health</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(brief.mental_health)}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Medical flags</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(brief.medical_flags) || 'None'}</td>
                </tr>
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Medical aid</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong style="color: #27ae60;">${escapeHtml(brief.medical_aid) || 'None specified'}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Urgency</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong style="color: ${urgencyColor};">${escapeHtml(brief.urgency)}</strong></td>
                </tr>
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Readiness (1-10)</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${brief.readiness_score ? `${escapeHtml(brief.readiness_score)}/10` : '—'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Recommended programme</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(brief.recommended_programme)}</td>
                </tr>
            </table>
        </div>
    ` : `
        <div style="padding: 20px;">
            <h2 style="color: #2E5A87;">What they're going through (own words)</h2>
            <div style="background: #F4F9F4; border-left: 4px solid #27ae60; padding: 14px; border-radius: 6px;">
                <p style="line-height: 1.6; white-space: pre-wrap; margin: 0;">${escapeHtml(brief.wellness_brief) || '<span style="color:#888;">Not shared.</span>'}</p>
            </div>
        </div>
    `;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${urgencyColor}; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">${isUrgent ? '🚨 URGENT — ' : ''}New Lead</h1>
            <p style="margin: 5px 0;">Grace Bot — Stabilis Treatment & Wellness Centre</p>
            <div style="display: inline-block; margin-top: 8px; background: ${trackBadgeColor}; color: white; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px;">
                ${trackLabel}
            </div>
        </div>

        <div style="padding: 20px; background: #f9f9f9;">
            <h2 style="color: #2E5A87; margin-top: 0;">Contact Details</h2>
            <p><strong>Name:</strong> ${escapeHtml(brief.contact_name)}</p>
            <p><strong>Phone:</strong> <a href="tel:${escapeHtml(brief.contact_phone)}">${escapeHtml(brief.contact_phone)}</a></p>
            <p><strong>WhatsApp:</strong> <a href="https://wa.me/${escapeHtml(brief.contact_phone?.replace(/\D/g, ''))}">Message on WhatsApp</a></p>
            <p><strong>Preferred Callback:</strong> ${escapeHtml(brief.preferred_callback_time) || 'Any time'}</p>
            <p><strong>Language:</strong> ${escapeHtml(brief.language_preference) || 'English'}</p>
            <p><strong>Track:</strong> <strong style="color: ${trackBadgeColor};">${trackLabel}</strong></p>
        </div>

        ${additionalNotesBlock}

        ${clinicalBlock}

        ${brief.audit_c_score !== null ? `
        <div style="padding: 20px;">
            <h2 style="color: #2E5A87;">AUDIT-C Screening Results</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>AUDIT-C Score</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>${brief.audit_c_score} / 12</strong></td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Risk Tier</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong style="color: ${brief.audit_c_tier === 'indicated' ? '#c0392b' : brief.audit_c_tier === 'selective' ? '#e67e22' : '#27ae60'};">${escapeHtml(brief.audit_c_tier)}</strong></td>
                </tr>
            </table>
            <div style="margin-top: 10px; background: #F9F9F9; padding: 10px; border-radius: 4px; font-size: 12px; line-height: 1.5;">
                <strong>Tier Guide:</strong><br>
                • <strong>Universal</strong> (0–2): Low risk — general information appropriate<br>
                • <strong>Selective</strong> (3–5): Moderate risk — brief intervention recommended<br>
                • <strong>Indicated</strong> (6–12): High risk — professional assessment required
            </div>
        </div>
        ` : `
        <div style="padding: 20px;">
            <h2 style="color: #2E5A87;">AUDIT-C Screening</h2>
            <p style="color: #888;">AUDIT-C screening not completed during intake</p>
        </div>
        `}

        <div style="padding: 20px;">
            <h2 style="color: #2E5A87;">Lead Source</h2>
            <table style="width: 100%; border-collapse: collapse;">
                ${[
                    ['Source',   brief.utm_source],
                    ['Medium',   brief.utm_medium],
                    ['Campaign', brief.utm_campaign],
                    ['Content',  brief.utm_content],
                    ['Term',     brief.utm_term]
                ].map(([label, value], i) => `
                <tr${i % 2 === 0 ? ' style="background: #f0f0f0;"' : ''}>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>${label}</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(value) || '<span style="color: #888;">Not tracked</span>'}</td>
                </tr>`).join('')}
            </table>
        </div>

        ${brief.notes_for_therapist ? `
        <div style="padding: 20px; background: #EBF2F9;">
            <h3 style="color: #2E5A87; margin-top: 0;">Notes for Therapist</h3>
            <p style="line-height: 1.6; white-space: pre-wrap;">${escapeHtml(brief.notes_for_therapist)}</p>
        </div>` : ''}

        <div style="padding: 20px; text-align: center; color: #888; font-size: 12px;">
            Lead ID: ${escapeHtml(leadId)} | Generated by Grace Bot
        </div>
    </div>
    `;

    const trackTag = isMentalHealth ? 'Wellness' : 'SUD';
    const subject = priority === 'HIGH'
        ? `🚨 URGENT — New ${trackTag} Lead: ${brief.contact_name} — Grace Bot`
        : `New ${trackTag} Lead: ${brief.contact_name} — Grace Bot`;

    // Send to reception
    await emailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.RECEPTION_EMAIL,
        subject,
        html,
        ...(process.env.DEV_EMAIL && { bcc: process.env.DEV_EMAIL })
    });

    // Also send to CEO on every completed lead
    if (process.env.CEO_EMAIL && process.env.CEO_EMAIL !== process.env.RECEPTION_EMAIL) {
        await emailTransporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.CEO_EMAIL,
            subject,
            html,
            ...(process.env.DEV_EMAIL && { bcc: process.env.DEV_EMAIL })
        });
    }
}

async function sendCrisisEmail({ sessionId, type, lastMessage }) {
    if (!process.env.RECEPTION_EMAIL) return;

    const crisisHtml = `
    <div style="font-family: Arial; padding: 20px;">
        <h1 style="color: #c0392b;">🚨 Crisis Alert</h1>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Session:</strong> ${sessionId}</p>
        <p><strong>Last message:</strong></p>
        <blockquote style="border-left: 3px solid #c0392b; padding-left: 15px;">
            ${lastMessage}
        </blockquote>
        <p>The user has been shown crisis resources. If you can safely reach out, please do so.</p>
    </div>
    `;

    // Send to reception
    await emailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.RECEPTION_EMAIL,
        subject: `🚨 CRISIS ALERT — Grace Bot`,
        html: crisisHtml,
        ...(process.env.DEV_EMAIL && { bcc: process.env.DEV_EMAIL })
    });

    // Also send to CEO for crisis
    if (process.env.CEO_EMAIL && process.env.CEO_EMAIL !== process.env.RECEPTION_EMAIL) {
        await emailTransporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.CEO_EMAIL,
            subject: `🚨 CRISIS ALERT — Grace Bot`,
            html: crisisHtml,
            ...(process.env.DEV_EMAIL && { bcc: process.env.DEV_EMAIL })
        });
    }
}

/**
 * Notify Sobriety Journey of new Grace intake
 * Creates patient account + generates invite URL
 * Non-blocking — failures logged but don't affect Grace Bot flow.
 */
async function notifySobrietyJourney(brief, leadId) {
    const endpoint = process.env.SJ_WEBHOOK_URL;
    const secret = process.env.SJ_WEBHOOK_SECRET;

    if (!endpoint) {
        logger.warn({ leadId }, 'SJ_WEBHOOK_URL not set — skipping SJ notification');
        return null;
    }

    try {
        // Build payload for SJ webhook
        const payload = {
            name: brief.contact_name || 'Unknown',
            phone: brief.contact_phone || '',
            email: brief.contact_email || '',
            role: brief.who_for === 'someone_else' ? 'caring' : 'deciding',
            source: 'grace',
            callerType: brief.caller_type || 'myself'
        };

        logger.info(
            { leadId, endpoint },
            'Calling SJ webhook to create patient account'
        );

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-webhook-secret': secret || ''
            },
            body: JSON.stringify(payload),
            timeout: 5000
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(
                { leadId, status: response.status, error: errorText },
                'SJ webhook returned error'
            );
            return null;
        }

        const result = await response.json();
        
        logger.info(
            { leadId, patientId: result.patientId, inviteUrl: result.inviteUrl },
            'SJ webhook success — patient account created'
        );

        return {
            inviteUrl: result.inviteUrl,
            patientId: result.patientId,
            success: true
        };

    } catch (error) {
        logger.error(
            { leadId, error: error.message },
            'SJ webhook call failed'
        );
        return null;
    }
}
