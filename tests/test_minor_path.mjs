// Drives the full SUD "under 18" minor path through the live API on :3002
const BASE = 'http://localhost:3002';
const sessionId = `test_minor_${Date.now()}`;

async function stage(stageId, value) {
    const res = await fetch(`${BASE}/api/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId, value })
    });
    const data = await res.json();
    console.log(`stage ${stageId ?? '(init)'} -> next: ${data?.next?.stageId ?? '(none)'} ended:${!!data.ended}`);
    return data;
}

async function chat(stageId, message) {
    const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stageId, message })
    });
    const data = await res.json();
    console.log(`chat  ${stageId} -> next: ${data?.next?.stageId ?? '(none)'}`);
    return data;
}

(async () => {
    console.log('Session:', sessionId, '\n');
    await stage(undefined);                                 // bootstrap -> stage1b
    await stage('stage1b', 'sud');                          // -> stage_caller_type
    await stage('stage_caller_type', 'under_18');           // -> stage_guardian_name (MINOR)
    await stage('stage_guardian_name', 'Clive');            // -> stage_guardian_phone
    await stage('stage_guardian_phone', '08255544425');     // -> stage3
    await stage('stage3', 'Alcohol');                       // -> stage4a
    await stage('stage4a', 'No — first time');              // -> stage4b (useAI)
    await chat('stage4b', 'none');                          // -> stage5
    await stage('stage5', 'No');                            // -> stage_city
    await stage('stage_city', 'Cape Town');                 // -> stage6
    await stage('stage6', 'Within the next week');          // -> notes
    await stage('notes', null);                             // Skip -> stage7a
    await stage('stage7a', 'Clive Jr');                     // -> stage7b
    await stage('stage7b', '0824516786');                   // -> stage7c
    await stage('stage7c', 'minor-test@example.com');       // -> stage8
    await stage('stage8', 'morning');                       // -> closing (ended, creates lead)

    console.log('\nSession complete. Waiting 4s for background lead creation...');
    await new Promise(r => setTimeout(r, 4000));

    const { createClient } = await import('@supabase/supabase-js');
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await db
        .from('leads')
        .select('id, contact_name, involves_minor, caller_age_band, guardian_name, guardian_phone, city, substance_primary')
        .eq('session_id', sessionId)
        .single();

    console.log('\n=== LEAD RECORD ===');
    if (error) console.error('Error:', error.message);
    else console.log(JSON.stringify(data, null, 2));
})();
