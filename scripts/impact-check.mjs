/**
 * Impact check: find conversations between 4 Aug and now that hit
 * the extraction-failure pattern (many messages, no lead created).
 *
 * Run: node scripts/impact-check.mjs
 */
import '../src/load-env.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CUTOFF = '2026-08-04T00:00:00.000Z';

async function main() {
  // 1. All conversations created/updated since 4 Aug
  const { data: conversations, error: convErr } = await supabase
    .from('grace_conversations')
    .select('id, caller_id, status, messages, extracted_fields, created_at')
    .gte('created_at', CUTOFF)
    .order('created_at', { ascending: true });

  if (convErr) {
    console.error('Failed to query conversations:', convErr.message);
    process.exit(1);
  }

  console.log(`\nConversations since 4 Aug: ${conversations.length}`);

  // 2. All leads created since 4 Aug (to cross-reference)
  const { data: leads, error: leadErr } = await supabase
    .from('leads')
    .select('session_id, contact_name, contact_phone, created_at')
    .gte('created_at', CUTOFF);

  if (leadErr) {
    console.error('Failed to query leads:', leadErr.message);
    process.exit(1);
  }

  const leadsById = new Set(leads.map(l => l.session_id));
  console.log(`Leads created since 4 Aug:  ${leads.length}`);

  // 3. Classify each conversation
  const stuck    = [];  // many messages, completed, no lead, name/phone blank in extracted_fields
  const complete = [];  // completed, lead exists
  const short    = [];  // fewer than 4 user messages — likely test/accidental
  const ongoing  = [];  // still in_progress

  for (const conv of conversations) {
    const msgs = conv.messages || [];
    const userMsgs = msgs.filter(m => m.role === 'user');
    const hasLead = leadsById.has(conv.caller_id) || leadsById.has(conv.id);

    // Extract name/phone from stored extracted_fields (if any)
    const ef = conv.extracted_fields || {};
    const storedName  = ef.name?.value  || null;
    const storedPhone = ef.phone?.value || null;

    if (conv.status === 'completed' && hasLead) {
      complete.push({ ...conv, userMsgCount: userMsgs.length });
    } else if (conv.status === 'completed' && !hasLead) {
      stuck.push({
        id: conv.id,
        caller_id: conv.caller_id,
        userMsgCount: userMsgs.length,
        totalMsgCount: msgs.length,
        storedName,
        storedPhone,
        created_at: conv.created_at,
      });
    } else if (userMsgs.length < 4) {
      short.push({ ...conv, userMsgCount: userMsgs.length });
    } else {
      ongoing.push({ ...conv, userMsgCount: userMsgs.length });
    }
  }

  console.log(`\n--- SUMMARY ---`);
  console.log(`Completed with lead:        ${complete.length}`);
  console.log(`Completed WITHOUT lead:     ${stuck.length}   ← extraction-failure candidates`);
  console.log(`Still in progress:          ${ongoing.length}`);
  console.log(`Short / test (<4 messages): ${short.length}`);

  if (stuck.length > 0) {
    console.log(`\n--- COMPLETED WITHOUT LEAD (detail) ---`);
    for (const s of stuck) {
      console.log(`  caller_id:  ${s.caller_id}`);
      console.log(`  conv_id:    ${s.id}`);
      console.log(`  messages:   ${s.userMsgCount} user / ${s.totalMsgCount} total`);
      console.log(`  name:       ${s.storedName || '(not extracted)'}`);
      console.log(`  phone:      ${s.storedPhone || '(not extracted)'}`);
      console.log(`  created_at: ${s.created_at}`);

      // Print the last 3 user messages to see what was actually said
      const msgs = conversations.find(c => c.id === s.id)?.messages || [];
      const userMsgs = msgs.filter(m => m.role === 'user').slice(-3);
      console.log(`  last 3 user messages:`);
      userMsgs.forEach((m, i) => console.log(`    [${i + 1}] ${m.content.substring(0, 120)}`));
      console.log('');
    }
  }

  if (ongoing.length > 0) {
    console.log(`\n--- STILL IN PROGRESS (detail) ---`);
    for (const s of ongoing) {
      const ef = s.extracted_fields || {};
      console.log(`  caller_id: ${s.caller_id} | ${s.userMsgCount} user msgs | name: ${ef.name?.value || '–'} | phone: ${ef.phone?.value || '–'} | updated: ${s.created_at}`);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
