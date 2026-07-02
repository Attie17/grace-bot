/**
 * Analytics Query Script
 * 
 * Shows:
 * 1. Total leads created (triggers email notifications to therapist)
 * 2. Email sends tracked in events table
 * 3. Link clicks tracked in events table (if available)
 * 4. Breakdown by status and priority
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAnalytics() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 STABILIS BOT - ANALYTICS REPORT');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Get total leads created
    console.log('📋 LEADS CREATED (Email Triggers):');
    console.log('-'.repeat(80));

    const { data: allLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, contact_name, contact_phone, status, created_at, urgency_level');

    if (leadsError) {
      console.error('❌ Error fetching leads:', leadsError.message);
      return;
    }

    console.log(`   Total leads created: ${allLeads.length}`);
    console.log(`   Last updated: ${new Date().toLocaleString()}\n`);

    // Breakdown by status
    const byStatus = {};
    allLeads.forEach(lead => {
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    });

    console.log('   Status breakdown:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`     • ${status}: ${count}`);
    });

    // Breakdown by urgency
    console.log('\n   Urgency breakdown:');
    const byUrgency = {};
    allLeads.forEach(lead => {
      const urgency = lead.urgency_level || 'not_set';
      byUrgency[urgency] = (byUrgency[urgency] || 0) + 1;
    });
    Object.entries(byUrgency).forEach(([urgency, count]) => {
      console.log(`     • ${urgency}: ${count}`);
    });

    // 2. Check events table for email_sent events
    console.log('\n\n📧 EMAIL SENDS TRACKED IN EVENTS TABLE:');
    console.log('-'.repeat(80));

    const { data: emailEvents, error: emailError } = await supabase
      .from('events')
      .select('*')
      .eq('event_type', 'email_sent')
      .order('created_at', { ascending: false });

    if (emailError) {
      console.error('   Warning:', emailError.message);
    } else {
      console.log(`   Total email events logged: ${emailEvents.length}`);
      if (emailEvents.length > 0) {
        console.log('\n   Recent email sends:');
        emailEvents.slice(0, 5).forEach((evt, idx) => {
          console.log(`     ${idx + 1}. ${new Date(evt.created_at).toLocaleString()}`);
          if (evt.event_data) {
            console.log(`        Data: ${JSON.stringify(evt.event_data)}`);
          }
        });
      }
    }

    // 3. Check for link click events
    console.log('\n\n🔗 LINK CLICKS TRACKED IN EVENTS TABLE:');
    console.log('-'.repeat(80));

    const { data: clickEvents, error: clickError } = await supabase
      .from('events')
      .select('*')
      .eq('event_type', 'link_click')
      .order('created_at', { ascending: false });

    if (clickError) {
      console.error('   Warning:', clickError.message);
    } else {
      console.log(`   Total link click events logged: ${clickEvents.length}`);
      if (clickEvents.length > 0) {
        console.log('\n   Recent link clicks:');
        clickEvents.slice(0, 5).forEach((evt, idx) => {
          console.log(`     ${idx + 1}. ${new Date(evt.created_at).toLocaleString()}`);
          if (evt.event_data) {
            console.log(`        Data: ${JSON.stringify(evt.event_data)}`);
          }
        });
      } else {
        console.log('   ℹ️  No link click events found.');
        console.log('   Note: Link tracking is not currently implemented in the bot.');
      }
    }

    // 4. Check for widget button clicks
    console.log('\n\n🔘 WIDGET BUTTON CLICKS TRACKED IN EVENTS TABLE:');
    console.log('-'.repeat(80));

    const { data: widgetEvents, error: widgetError } = await supabase
      .from('events')
      .select('*')
      .eq('event_type', 'widget_click')
      .order('created_at', { ascending: false });

    if (widgetError) {
      console.error('   Warning:', widgetError.message);
    } else {
      console.log(`   Total widget click events logged: ${widgetEvents.length}`);
      if (widgetEvents.length > 0) {
        console.log('\n   Recent widget clicks:');
        widgetEvents.slice(0, 5).forEach((evt, idx) => {
          console.log(`     ${idx + 1}. ${new Date(evt.created_at).toLocaleString()}`);
        });
      } else {
        console.log('   ℹ️  No widget click events found.');
        console.log('   Note: Widget click tracking is not currently implemented in the bot.');
      }
    }

    // 5. Get all unique event types
    console.log('\n\n📈 ALL EVENT TYPES IN DATABASE:');
    console.log('-'.repeat(80));

    const { data: allEvents, error: allEventsError } = await supabase
      .from('events')
      .select('event_type');

    if (allEventsError) {
      console.error('   Warning:', allEventsError.message);
    } else if (allEvents.length === 0) {
      console.log('   No events logged in the events table yet.');
    } else {
      const eventTypes = {};
      allEvents.forEach(evt => {
        eventTypes[evt.event_type] = (eventTypes[evt.event_type] || 0) + 1;
      });
      console.log('   Event type breakdown:');
      Object.entries(eventTypes).forEach(([type, count]) => {
        console.log(`     • ${type}: ${count}`);
      });
    }

    // 6. Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(80));
    console.log(`✅ Total leads created: ${allLeads.length}`);
    console.log(`   (Each lead triggers an email notification to the therapist)`);
    console.log(`   Contact info received from: ${allLeads.filter(l => l.contact_phone).length} with phone`);
    console.log(`   Contact info received from: ${allLeads.filter(l => l.contact_name).length} with name`);
    console.log(`\n⚠️  NOTE: Link click tracking is NOT currently implemented.`);
    console.log(`   The system tracks leads and sends emails, but does not track individual link clicks.`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error running analytics:', error.message);
    process.exit(1);
  }
}

runAnalytics();
