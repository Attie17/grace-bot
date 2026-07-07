import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkRecentSessions() {
    try {
        const { data, error } = await supabase
            .from('conversations')
            .select('session_id, created_at, updated_at, metadata')
            .order('updated_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error:', error.message);
            return;
        }

        console.log(`\n✅ Latest ${data.length} sessions:\n`);
        data.forEach((session, idx) => {
            console.log(`${idx + 1}. Session: ${session.session_id}`);
            console.log(`   Updated: ${session.updated_at}`);
            const metadata = session.metadata || {};
            console.log(`   Lead Created: ${metadata.lead_created ? 'YES ✅' : 'NO'}`);
            console.log(`   Lead ID: ${metadata.lead_id || 'N/A'}`);
            console.log();
        });
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkRecentSessions();
