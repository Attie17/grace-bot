import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Check latest lead
  const { data: leadData, error: leadError } = await supabase
    .from('leads')
    .select('id, contact_name, contact_phone, contact_email, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (leadError) {
    console.error('Error querying leads:', leadError.message);
    return;
  }
  
  if (leadData.length === 0) {
    console.log('No leads found');
    return;
  }
  
  const lead = leadData[0];
  console.log('Latest lead:');
  console.log(`  ID: ${lead.id}`);
  console.log(`  Name: ${lead.contact_name}`);
  console.log(`  Phone: ${lead.contact_phone}`);
  console.log(`  Email: ${lead.contact_email}`);
  console.log(`  Created: ${lead.created_at}`);
  
  // Check if it's the Test user
  if (lead.contact_name === 'Test') {
    console.log('\n✅ TEST LEAD FOUND! Lead was created successfully!');
  } else {
    console.log(`\nThis is a ${lead.contact_name} lead, not the Test lead we just created.`);
    
    // Check for Test user specifically
    const { data: testLead } = await supabase
      .from('leads')
      .select('id, contact_name, created_at')
      .eq('contact_name', 'Test')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (testLead && testLead.length > 0) {
      console.log(`\nFound Test lead: created at ${testLead[0].created_at}`);
    } else {
      console.log('\nNo Test lead found in database');
    }
  }
})();
