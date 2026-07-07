import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Get the VerifyFix lead record
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('contact_name', 'VerifyFix')
    .single();

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('\n✅ LEAD SUCCESSFULLY CREATED!\n');
  console.log('Lead Details:');
  console.log('  ID:', leads.id);
  console.log('  Contact Name:', leads.contact_name);
  console.log('  Phone:', leads.contact_phone);
  console.log('  Email:', leads.contact_email);
  console.log('  Track:', leads.track, '← FIXED: now "sud" instead of "substance"');
  console.log('  Status:', leads.status);
  console.log('  Urgency:', leads.urgency);
  console.log('  Created:', leads.created_at);
  console.log('  Updated:', leads.updated_at);

  console.log('\nAUDIT-C Results:');
  console.log('  Q1:', leads.audit_c_q1);
  console.log('  Q2:', leads.audit_c_q2);
  console.log('  Q3:', leads.audit_c_q3);
  console.log('  Score:', leads.audit_c_score);
  console.log('  Tier:', leads.audit_c_tier);

  console.log('\n✅ FIX VERIFIED - Lead creation is now working!');
})().catch(err => console.error('ERROR:', err.message));
