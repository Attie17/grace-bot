/**
 * Scheduled Jobs
 *
 * Daily CSV summary email at 17:00 SAST (15:00 UTC).
 * Sends a cumulative CSV of all leads to reception.
 */

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { getAllLeads } from './database.js';
import { logger } from './logger.js';

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
 * Convert leads array to CSV string.
 */
function leadsToCSV(leads) {
    const headers = [
        'id', 'created_at', 'contact_name', 'contact_phone',
        'preferred_callback_time', 'for_whom', 'substance_primary',
        'previous_treatment', 'mental_health', 'medical_flags',
        'medical_aid', 'urgency', 'readiness_score',
        'recommended_programme', 'status', 'language_preference',
        'notes_for_therapist',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'
    ];

    const escape = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows = leads.map(lead =>
        headers.map(h => escape(lead[h])).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
}

/**
 * Send the daily summary email with CSV attachment.
 */
export async function sendDailySummary() {
    if (!process.env.RECEPTION_EMAIL) {
        logger.warn('RECEPTION_EMAIL not configured — skipping daily summary');
        return;
    }

    try {
        const leads = await getAllLeads();

        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
        const ddmmyyyy = today.toLocaleDateString('en-ZA', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            timeZone: 'Africa/Johannesburg'
        }).replace(/\//g, '-'); // DD-MM-YYYY

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const newToday = leads.filter(l =>
            new Date(l.created_at) >= todayStart
        ).length;

        const urgentToday = leads.filter(l =>
            new Date(l.created_at) >= todayStart && l.urgency === 'immediate'
        ).length;

        const csv = leadsToCSV(leads);
        const filename = `Grace-Leads-${ddmmyyyy}.csv`;

        const subject = `Grace Bot — Daily Summary — ${ddmmyyyy} — ${leads.length} total leads`;

        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px;">
            <div style="background: #2E5A87; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 20px;">Grace Bot — Daily Summary</h1>
                <p style="margin: 6px 0 0; opacity: 0.85;">${ddmmyyyy}</p>
            </div>
            <div style="padding: 24px; background: #f9f9f9;">
                <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total leads (all time)</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd; font-size: 18px; font-weight: bold; color: #2E5A87;">${leads.length}</td>
                    </tr>
                    <tr style="background: #fff;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>New today</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd; font-size: 18px; font-weight: bold; color: #27ae60;">${newToday}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Urgent today</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd; font-size: 18px; font-weight: bold; color: ${urgentToday > 0 ? '#e67e22' : '#7f8c8d'};">${urgentToday}</td>
                    </tr>
                </table>
            </div>
            <div style="padding: 16px 24px; font-size: 12px; color: #888; text-align: center;">
                Full cumulative lead list attached as ${filename}
            </div>
        </div>`;

        await emailTransporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.RECEPTION_EMAIL,
            subject,
            html,
            attachments: [
                {
                    filename,
                    content: csv,
                    contentType: 'text/csv'
                }
            ]
        });

        logger.info({ total: leads.length, newToday, urgentToday }, 'Daily summary email sent');

    } catch (error) {
        logger.error({ error: error.message }, 'Failed to send daily summary');
    }
}

/**
 * Start the daily scheduler.
 * Runs at 15:00 UTC = 17:00 SAST every day.
 */
export function startScheduler() {
    cron.schedule('0 15 * * *', () => {
        logger.info('Running daily summary job');
        sendDailySummary();
    }, {
        timezone: 'UTC'
    });

    logger.info('Daily summary scheduler started (17:00 SAST / 15:00 UTC)');
}
