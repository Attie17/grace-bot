/**
 * Verify medical columns are saved correctly to Supabase
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtmtrbirhdxijpfuzntr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bXRyYmlyaGR4aWpwZnV6bnRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU2NjEzMywiZXhwIjoyMDk2MTQyMTMzfQ.cGrez58Gjxr2JN2KQeWwSdior9kXDksafO5XsvaAJ8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkMedicalColumns() {
    console.log('🏥 Checking medical columns in recent leads...\n');

    try {
        // Get the most recent lead
        const { data: leads, error } = await supabase
            .from('leads')
            .select('id, contact_phone, contact_name, created_at, medical_aid_name, medical_aid_provider, medical_aid_number, medical_aid_plan')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('❌ Error:', error.message);
            return;
        }

        if (!leads || leads.length === 0) {
            console.log('⚠️  No leads found');
            return;
        }

        console.log(`📊 Checking ${leads.length} most recent leads:\n`);
        
        leads.forEach((lead, index) => {
            console.log(`📌 Lead #${index + 1}`);
            console.log(`   Phone: ${lead.contact_phone}`);
            console.log(`   Name: ${lead.contact_name}`);
            console.log(`   Created: ${new Date(lead.created_at).toLocaleString()}`);
            console.log(`\n   Medical Columns:`);
            console.log(`   ✓ medical_aid_name: ${lead.medical_aid_name ? `"${lead.medical_aid_name}"` : 'NULL'}`);
            console.log(`   ✓ medical_aid_provider: ${lead.medical_aid_provider ? `"${lead.medical_aid_provider}"` : 'NULL'}`);
            console.log(`   ✓ medical_aid_number: ${lead.medical_aid_number ? `"${lead.medical_aid_number}"` : 'NULL'}`);
            console.log(`   ✓ medical_aid_plan: ${lead.medical_aid_plan ? `"${lead.medical_aid_plan}"` : 'NULL'}`);
            console.log();
        });

        const latestLead = leads[0];
        console.log(`${'='.repeat(70)}`);
        console.log('\n📋 LATEST LEAD SUMMARY:');
        
        const hasAllMedical = latestLead.medical_aid_name && latestLead.medical_aid_provider && latestLead.medical_aid_number;
        
        if (hasAllMedical) {
            console.log('✅ All medical columns populated!');
            console.log(`\n   • Aid Status: ${latestLead.medical_aid_name}`);
            console.log(`   • Provider: ${latestLead.medical_aid_provider}`);
            console.log(`   • Member #: ${latestLead.medical_aid_number}`);
        } else {
            console.log('⚠️  Some medical columns missing:');
            if (!latestLead.medical_aid_name) console.log('   ❌ medical_aid_name (Yes/No/Unsure status)');
            if (!latestLead.medical_aid_provider) console.log('   ❌ medical_aid_provider (provider name)');
            if (!latestLead.medical_aid_number) console.log('   ❌ medical_aid_number (member number)');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkMedicalColumns();
