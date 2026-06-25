/**
 * Check Supabase leads table for recent entries
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtmtrbirhdxijpfuzntr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bXRyYmlyaGR4aWpwZnV6bnRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU2NjEzMywiZXhwIjoyMDk2MTQyMTMzfQ.cGrez58Gjxr2JN2KQeWwSdior9kXDksafO5XsvaAJ8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkLeads() {
    console.log('🔍 Checking Supabase leads table...\n');
    
    try {
        // Get the 10 most recent leads
        const { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('❌ Error fetching leads:', error.message);
            return;
        }

        if (!leads || leads.length === 0) {
            console.log('⚠️  No leads found in the database');
            return;
        }

        console.log(`📊 Found ${leads.length} recent leads\n`);
        console.log('='.repeat(80));

        // Check for specific fields
        leads.forEach((lead, index) => {
            console.log(`\n📌 Lead #${index + 1}`);
            console.log(`   ID: ${lead.id}`);
            console.log(`   Phone: ${lead.contact_phone}`);
            console.log(`   Name: ${lead.contact_name}`);
            console.log(`   Created: ${lead.created_at}`);
            
            // Check the three required fields
            console.log(`   \n   ✓ city: ${lead.city ? `"${lead.city}"` : '❌ NULL'}`);
            console.log(`   ✓ caller_type: ${lead.caller_type ? `"${lead.caller_type}"` : '❌ NULL'}`);
            
            // Check UTM fields
            const utm_fields = {
                utm_source: lead.utm_source,
                utm_medium: lead.utm_medium,
                utm_campaign: lead.utm_campaign,
                utm_content: lead.utm_content,
                utm_term: lead.utm_term
            };
            
            console.log(`   ✓ UTM fields present:`);
            Object.entries(utm_fields).forEach(([key, value]) => {
                console.log(`      - ${key}: ${value ? `"${value}"` : 'null'}`);
            });
        });

        console.log('\n' + '='.repeat(80));
        
        // Summary
        console.log('\n📋 VERIFICATION SUMMARY:');
        
        const latestLead = leads[0];
        console.log(`\n✓ Latest lead record exists: YES`);
        console.log(`✓ city populated: ${latestLead.city ? 'YES ✅' : 'NO ❌'}`);
        console.log(`✓ caller_type populated: ${latestLead.caller_type ? 'YES ✅' : 'NO ❌'}`);
        
        const hasUTM = Object.values(utm_fields).some(v => v !== null && v !== undefined);
        console.log(`✓ UTM fields present: ${hasUTM ? 'YES ✅' : 'NO ❌'}`);

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

checkLeads();
