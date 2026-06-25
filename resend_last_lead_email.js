/**
 * Resend Email for Last Completed Form
 * Manually triggers email notification for the most recent lead
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = 'https://dtmtrbirhdxijpfuzntr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bXRyYmlyaGR4aWpwZnV6bnRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU2NjEzMywiZXhwIjoyMDk2MTQyMTMzfQ.cGrez58Gjxr2JN2KQeWwSdior9kXDksafO5XsvaAJ8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function resendLastLeadEmail() {
    console.log('\n' + '='.repeat(80));
    console.log('📧 RESENDING EMAIL FOR LAST FORM COMPLETED');
    console.log('='.repeat(80) + '\n');

    try {
        // Get the most recent lead
        const { data: lead, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !lead) {
            console.error('❌ No lead found');
            return;
        }

        console.log('📌 Lead Details:');
        console.log(`   ID: ${lead.id}`);
        console.log(`   Name: ${lead.contact_name}`);
        console.log(`   Phone: ${lead.contact_phone}`);
        console.log(`   City: ${lead.city}`);
        console.log(`   Caller Type: ${lead.caller_type}`);
        console.log(`   Urgency: ${lead.urgency}`);
        console.log(`   Created: ${new Date(lead.created_at).toLocaleString()}\n`);

        // Build HTML email
        const trackTag = lead.usage_pattern ? '🚨 SUD' : '🌱 Wellness';
        const subject = lead.urgency === 'immediate'
            ? `🚨 URGENT — New ${trackTag} Lead: ${lead.contact_name} — Grace Bot`
            : `New ${trackTag} Lead: ${lead.contact_name} — Grace Bot`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: ${lead.urgency === 'immediate' ? '#c0392b' : '#27ae60'};">
                    ${lead.urgency === 'immediate' ? '🚨 URGENT' : '✅'} New Intake Lead
                </h2>
                
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Contact Name:</strong> ${lead.contact_name}</p>
                    <p><strong>Phone:</strong> ${lead.contact_phone}</p>
                    <p><strong>City:</strong> ${lead.city}</p>
                    <p><strong>Caller Type:</strong> ${lead.caller_type}</p>
                    <p><strong>Substance/Area:</strong> ${lead.substance_primary || 'Not specified'}</p>
                    <p><strong>Urgency:</strong> ${lead.urgency}</p>
                    <p><strong>Medical Aid:</strong> ${lead.medical_aid || 'Not specified'}</p>
                    ${lead.medical_aid_provider ? `<p><strong>Provider:</strong> ${lead.medical_aid_provider}</p>` : ''}
                    ${lead.medical_aid_number ? `<p><strong>Member #:</strong> ${lead.medical_aid_number}</p>` : ''}
                    <p><strong>Previous Treatment:</strong> ${lead.previous_treatment || 'Unknown'}</p>
                    <p><strong>Submitted:</strong> ${new Date(lead.created_at).toLocaleString()}</p>
                </div>

                ${lead.notes_for_therapist ? `
                    <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                        <strong>Notes for Therapist:</strong>
                        <p>${lead.notes_for_therapist}</p>
                    </div>
                ` : ''}

                <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
                    This is an automated alert from Grace Bot — Stabilis Treatment Centre intake system
                </p>
            </div>
        `;

        // Send email
        console.log('📧 Sending email...');
        await emailTransporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.RECEPTION_EMAIL,
            subject,
            html
        });

        console.log('✅ Email sent successfully!\n');
        console.log(`   To: ${process.env.RECEPTION_EMAIL}`);
        console.log(`   Subject: ${subject}\n`);

        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error('='.repeat(80) + '\n');
        process.exit(1);
    }
}

resendLastLeadEmail();
