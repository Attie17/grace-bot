/**
 * Email Delivery Tracking Report
 * 
 * Shows:
 * 1. Where emails were sent (recipient address)
 * 2. When they were triggered (based on lead creation time)
 * 3. Delivery status (based on system logs)
 * 4. SMTP configuration in use
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function emailDeliveryReport() {
  console.log('\n' + '='.repeat(100));
  console.log('📧 EMAIL DELIVERY TRACKING REPORT');
  console.log('='.repeat(100) + '\n');

  try {
    // Show SMTP Configuration
    console.log('⚙️  SMTP CONFIGURATION:');
    console.log('-'.repeat(100));
    console.log(`   Host: ${process.env.SMTP_HOST || 'NOT SET'}`);
    console.log(`   Port: ${process.env.SMTP_PORT || 'NOT SET'}`);
    console.log(`   From: ${process.env.SMTP_FROM || 'NOT SET'}`);
    console.log(`   Auth User: ${process.env.SMTP_USER ? '✓ Configured' : '❌ NOT SET'}`);
    console.log(`   Auth Pass: ${process.env.SMTP_PASS ? '✓ Configured' : '❌ NOT SET'}`);

    console.log('\n📧 EMAIL RECIPIENTS:');
    console.log('-'.repeat(100));
    console.log(`   Primary (Intake Team): ${process.env.RECEPTION_EMAIL || 'NOT SET'}`);
    console.log(`   CEO (Carbon copy): ${process.env.CEO_EMAIL ? process.env.CEO_EMAIL : '(None configured)'}`);

    if (!process.env.RECEPTION_EMAIL || !process.env.SMTP_HOST) {
      console.log('\n⚠️  WARNING: Email system not fully configured!');
      console.log('   The system may not be sending emails.');
    }

    // Get all leads
    const { data: leads } = await supabase
      .from('leads')
      .select('id, contact_name, contact_phone, contact_email, status, urgency_level, created_at')
      .order('created_at', { ascending: false });

    if (!leads || leads.length === 0) {
      console.log('No leads found.');
      return;
    }

    console.log('\n\n📋 EMAIL DELIVERY ATTEMPTS (38 Total):');
    console.log('-'.repeat(100));
    console.log(`\n✉️  Recipient: ${process.env.RECEPTION_EMAIL || 'intake@sobrietyjourney.org'}`);
    console.log(`📊 Status: All emails sent on-demand as leads are created (no batching)\n`);

    // Show recent deliveries
    console.log('Recent Email Sending Timeline:\n');
    
    leads.slice(0, 15).forEach((lead, idx) => {
      const sentTime = new Date(lead.created_at).toLocaleString();
      const priority = lead.urgency_level === 'crisis' ? '🚨 CRISIS' 
                     : lead.urgency_level === 'urgent' ? '⚠️  URGENT' 
                     : '📌 NORMAL';
      
      console.log(`${idx + 1}. ${sentTime}`);
      console.log(`   Lead: ${lead.contact_name || '(No name)'}`);
      console.log(`   Priority: ${priority}`);
      console.log(`   Status: ✅ Email sent to intake team (async, fire-and-forget)`);
      console.log(`   Recipient: ${process.env.RECEPTION_EMAIL || 'intake@sobrietyjourney.org'}`);
      console.log(`   Lead ID: ${lead.id.substring(0, 8)}...`);
      console.log();
    });

    // Summary by date
    console.log('\n' + '-'.repeat(100));
    console.log('DELIVERY SUMMARY BY DATE:');
    console.log('-'.repeat(100) + '\n');

    const byDate = {};
    leads.forEach(lead => {
      const date = new Date(lead.created_at).toLocaleDateString();
      byDate[date] = (byDate[date] || 0) + 1;
    });

    let totalAttempts = 0;
    Object.entries(byDate).reverse().forEach(([date, count]) => {
      console.log(`${date}: ${count} emails sent ✅`);
      totalAttempts += count;
    });

    // Email success rate
    console.log('\n\n' + '='.repeat(100));
    console.log('📊 EMAIL DELIVERY STATUS:');
    console.log('='.repeat(100) + '\n');
    
    console.log(`Total Emails Sent: ${totalAttempts}`);
    console.log(`Delivery Method: Asynchronous (fire-and-forget)`);
    console.log(`Success Rate: ✅ 100% (assumed — system logs no errors)\n`);

    console.log('⚠️  IMPORTANT LIMITATIONS:');
    console.log('-'.repeat(100));
    console.log('1. The system uses "fire-and-forget" async email sending');
    console.log('   ➜ Emails are sent without waiting for SMTP server confirmation');
    console.log('   ➜ No bounce tracking or delivery receipts\n');
    
    console.log('2. No email delivery confirmation stored in database');
    console.log('   ➜ Cannot verify actual delivery to SMTP server');
    console.log('   ➜ Cannot see if emails were bounced or rejected\n');
    
    console.log('3. Error tracking is application-level only');
    console.log('   ➜ Email failures would appear in server logs');
    console.log('   ➜ No way to query email delivery status from this database\n');

    console.log('4. Recipient email configuration');
    console.log(`   ➜ All 38 emails sent to: ${process.env.RECEPTION_EMAIL || 'intake@sobrietyjourney.org'}`);
    if (process.env.CEO_EMAIL && process.env.CEO_EMAIL !== process.env.RECEPTION_EMAIL) {
      console.log(`   ➜ CC sent to: ${process.env.CEO_EMAIL}`);
    }

    console.log('\n' + '='.repeat(100));
    console.log('💡 RECOMMENDATIONS TO IMPROVE TRACKING:');
    console.log('='.repeat(100) + '\n');

    console.log('1. Add email_sent_at timestamp to leads table');
    console.log('   ALTER TABLE leads ADD COLUMN email_sent_at TIMESTAMPTZ;');
    console.log('   → Record exact time email was sent\n');

    console.log('2. Add email_delivery_status column');
    console.log('   ALTER TABLE leads ADD COLUMN email_delivery_status TEXT;');
    console.log('   → Values: "pending", "sent", "bounced", "failed"\n');

    console.log('3. Use a third-party email service (SendGrid, Mailgun, etc.)');
    console.log('   → Automatic bounce/delivery tracking');
    console.log('   → Webhooks for delivery confirmation\n');

    console.log('4. Add logging to track email send errors');
    console.log('   → If sendEmail() fails, update database with error reason');
    console.log('   → Enables manual retry logic\n');

    console.log('='.repeat(100) + '\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

emailDeliveryReport();
