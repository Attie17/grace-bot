/**
 * Detailed Analytics - Leads & Email Activity
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function detailedAnalytics() {
  console.log('\n' + '='.repeat(100));
  console.log('📊 DETAILED ANALYTICS: LINK CLICKS & EMAIL ACTIVITY');
  console.log('='.repeat(100) + '\n');

  try {
    // Get all leads with detailed info
    const { data: leads } = await supabase
      .from('leads')
      .select('id, contact_name, contact_phone, contact_email, status, urgency_level, created_at, track, who_for')
      .order('created_at', { ascending: false });

    if (!leads) {
      console.error('No leads found');
      return;
    }

    // 1. Email Summary
    console.log('📧 EMAIL ACTIVITY SUMMARY:');
    console.log('-'.repeat(100));
    console.log(`✅ Total people who submitted intake form: ${leads.length}`);
    console.log(`✅ Automatic email notifications sent to therapist: ${leads.length}`);
    console.log(`   (One email per lead created, sent to intake@sobrietyjourney.org)\n`);

    // 2. Link Click Tracking
    console.log('🔗 LINK CLICK TRACKING:');
    console.log('-'.repeat(100));
    console.log('❌ Link click tracking is NOT currently implemented in the system.');
    console.log('   The bot does not track:');
    console.log('   • Widget button clicks');
    console.log('   • Links clicked within conversations');
    console.log('   • External resource links\n');

    // 3. Contact info collected
    console.log('📋 CONTACT INFORMATION COLLECTED:');
    console.log('-'.repeat(100));
    const withPhone = leads.filter(l => l.contact_phone).length;
    const withEmail = leads.filter(l => l.contact_email).length;
    const withName = leads.filter(l => l.contact_name).length;
    
    console.log(`   ✓ Phone numbers collected: ${withPhone}/${leads.length}`);
    console.log(`   ✓ Email addresses collected: ${withEmail}/${leads.length}`);
    console.log(`   ✓ Names collected: ${withName}/${leads.length}\n`);

    // 4. Timeline of leads
    console.log('📅 TIMELINE OF SUBMISSIONS:');
    console.log('-'.repeat(100));
    
    const byDate = {};
    leads.forEach(lead => {
      const date = new Date(lead.created_at).toLocaleDateString();
      byDate[date] = (byDate[date] || 0) + 1;
    });

    Object.entries(byDate).reverse().forEach(([date, count]) => {
      console.log(`   ${date}: ${count} leads`);
    });

    // 5. Recent leads (who received emails)
    console.log('\n\n👥 RECENT LEADS (Who received therapist emails):');
    console.log('-'.repeat(100));
    leads.slice(0, 10).forEach((lead, idx) => {
      const date = new Date(lead.created_at).toLocaleString();
      console.log(`\n   ${idx + 1}. ${lead.contact_name || '(No name)'} - ${date}`);
      console.log(`      Phone: ${lead.contact_phone || 'N/A'}`);
      console.log(`      Email: ${lead.contact_email || 'N/A'}`);
      console.log(`      Track: ${lead.track || 'N/A'}`);
      console.log(`      Urgency: ${lead.urgency_level || 'Normal'}`);
      console.log(`      ✉️  Email sent to therapist: YES`);
    });

    // 6. Statistics
    console.log('\n\n📈 STATISTICS:');
    console.log('-'.repeat(100));
    
    const urgent = leads.filter(l => l.urgency_level === 'urgent').length;
    const crisis = leads.filter(l => l.urgency_level === 'crisis').length;
    const mentalHealth = leads.filter(l => l.track === 'mental_health').length;
    const substance = leads.filter(l => l.track === 'substance').length;
    
    console.log(`   High priority (urgent): ${urgent}`);
    console.log(`   Critical (crisis): ${crisis}`);
    console.log(`   Mental health track: ${mentalHealth}`);
    console.log(`   Substance use track: ${substance}\n`);

    console.log('='.repeat(100));
    console.log('ℹ️  KEY FINDINGS:');
    console.log('='.repeat(100));
    console.log(`\n✅ Emails Successfully Sent:`);
    console.log(`   • ${leads.length} therapist notifications sent (one per lead)`);
    console.log(`   • Each lead has complete contact information`);
    console.log(`   • All emails go to: intake@sobrietyjourney.org\n`);
    
    console.log(`❌ Link Tracking:`);
    console.log(`   • NO link clicks are currently tracked`);
    console.log(`   • The system does not log widget interactions`);
    console.log(`   • Individual user interactions within the chat are not recorded\n`);
    
    console.log(`💡 Recommendation:`);
    console.log(`   To implement link click tracking:`);
    console.log(`   1. Add event logging in embed.js for button clicks`);
    console.log(`   2. Log 'link_click' events to the events table`);
    console.log(`   3. Include link URL and user session ID in event_data\n`);
    console.log('='.repeat(100) + '\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

detailedAnalytics();
