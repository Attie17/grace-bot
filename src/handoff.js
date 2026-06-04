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
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Notify therapist of a new lead.
 */
export async function notifyTherapist({ sessionId, leadId, priority, brief, type, lastMessage }) {
    const isCrisis = priority === 'CRISIS';

    try {
        // Send WhatsApp for urgent leads and crisis
        if (priority === 'CRISIS') {
            await sendWhatsAppAlert({ priority, brief, type, lastMessage });
        } else if (priority === 'HIGH' && brief) {
            await sendWhatsAppAlert({ priority, brief, type, lastMessage });
        }

        // Always send email with full brief
        if (brief) {
            await sendEmail({ leadId, priority, brief });
        } else if (isCrisis) {
            await sendCrisisEmail({ sessionId, type, lastMessage });
        }

        logger.info({ leadId, priority }, 'Therapist notified');

    } catch (error) {
        logger.error({ error: error.message, leadId }, 'Failed to notify therapist');
        // Don't throw - conversation should continue even if alert fails
    }
}

/**
 * Send WhatsApp alert to therapist via Twilio.
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
        message = `📋 *URGENT GRACE BOT LEAD*\n\nName: ${brief.contact_name}\nPhone: ${brief.contact_phone}\nBest time to call: ${brief.preferred_callback_time || 'Any time'}\nStruggling with: ${brief.substance_primary}\nReadiness: ${brief.urgency}\nMedical Aid: ${brief.medical_aid || 'Not specified'}\n\nPlease contact within 1 hour.`;
    }

    const therapistNumber = process.env.THERAPIST_WHATSAPP.startsWith('whatsapp:')
        ? process.env.THERAPIST_WHATSAPP
        : `whatsapp:${process.env.THERAPIST_WHATSAPP}`;

    await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: therapistNumber
    });
}

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

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${urgencyColor}; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">${isUrgent ? '🚨 URGENT — ' : ''}New Lead</h1>
            <p style="margin: 5px 0;">Grace Bot — Stabilis Treatment Centre</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
            <h2 style="color: #2E5A87; margin-top: 0;">Contact Details</h2>
            <p><strong>Name:</strong> ${brief.contact_name}</p>
            <p><strong>Phone:</strong> <a href="tel:${brief.contact_phone}">${brief.contact_phone}</a></p>
            <p><strong>WhatsApp:</strong> <a href="https://wa.me/${brief.contact_phone?.replace(/\D/g, '')}">Message on WhatsApp</a></p>
            <p><strong>Preferred Callback:</strong> ${brief.preferred_callback_time || 'Any time'}</p>
            <p><strong>Language:</strong> ${brief.language_preference || 'English'}</p>
        </div>

        <div style="padding: 20px;">
            <h2 style="color: #2E5A87;">Clinical Brief</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>For whom</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${brief.for_whom}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Primary substance</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${brief.substance_primary}</td>
                </tr>
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Usage pattern</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${brief.usage_pattern}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Previous treatment</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${brief.previous_treatment}</td>
                </tr>
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Mental health</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${brief.mental_health}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Medical flags</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${brief.medical_flags || 'None'}</td>
                </tr>
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Medical aid</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong style="color: #27ae60;">${brief.medical_aid || 'None specified'}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Urgency</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong style="color: ${urgencyColor};">${brief.urgency}</strong></td>
                </tr>
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Readiness (1-10)</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${brief.readiness_score}/10</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Recommended programme</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${brief.recommended_programme}</td>
                </tr>
            </table>
        </div>

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
                    <td style="padding: 10px; border: 1px solid #ddd;">${value || '<span style="color: #888;">Not tracked</span>'}</td>
                </tr>`).join('')}
            </table>
        </div>

        <div style="padding: 20px; background: #EBF2F9;">
            <h3 style="color: #2E5A87; margin-top: 0;">Notes for Therapist</h3>
            <p style="line-height: 1.6;">${brief.notes_for_therapist}</p>
        </div>

        <div style="padding: 20px; text-align: center; color: #888; font-size: 12px;">
            Lead ID: ${leadId} | Generated by Grace Bot
        </div>
    </div>
    `;

    const subject = priority === 'HIGH'
        ? `🚨 URGENT — New Lead: ${brief.contact_name} — Grace Bot`
        : `New Lead: ${brief.contact_name} — Grace Bot`;

    await emailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.RECEPTION_EMAIL,
        subject,
        html
    });
}

async function sendCrisisEmail({ sessionId, type, lastMessage }) {
    if (!process.env.RECEPTION_EMAIL) return;

    await emailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.RECEPTION_EMAIL,
        subject: `🚨 CRISIS ALERT — Grace Bot`,
        html: `
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
        `
    });
}
