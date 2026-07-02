/**
 * Clear All Test Leads
 * 
 * Deletes ALL leads from the database (careful!)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askConfirmation(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
}

async function clearAllLeads() {
    try {
        console.log('\n' + '='.repeat(100));
        console.log('⚠️  WARNING: DELETE ALL LEADS');
        console.log('='.repeat(100) + '\n');

        // First, get count
        const { data: leads, error: countError } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true });

        if (countError) {
            console.error('Error checking leads:', countError.message);
            rl.close();
            return;
        }

        console.log(`📊 Total leads in database: ${leads?.length || 'unknown'}\n`);

        // Ask for confirmation
        const confirmed = await askConfirmation('⚠️  Are you SURE you want to DELETE ALL LEADS? (type "yes" to confirm): ');

        if (!confirmed) {
            console.log('\n✅ Cancelled - no leads deleted.\n');
            rl.close();
            return;
        }

        // Double check
        const doubleCheck = await askConfirmation('⚠️  FINAL WARNING - This cannot be undone. Type "yes" again to confirm: ');

        if (!doubleCheck) {
            console.log('\n✅ Cancelled - no leads deleted.\n');
            rl.close();
            return;
        }

        console.log('\n🔄 Deleting all leads...\n');

        // Delete all leads
        const { error: deleteError, data: result } = await supabase
            .from('leads')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (this always evaluates to true for UUIDs)

        if (deleteError) {
            console.error('❌ Error deleting leads:', deleteError.message);
            rl.close();
            return;
        }

        // Verify deletion
        const { data: remaining } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true });

        console.log('✅ ALL LEADS DELETED SUCCESSFULLY\n');
        console.log(`Remaining leads in database: ${remaining?.length || 0}\n`);

        console.log('='.repeat(100));
        console.log('Database is now clean. Ready for real leads.\n');

        rl.close();

    } catch (error) {
        console.error('❌ Error:', error.message);
        rl.close();
    }
}

clearAllLeads();
