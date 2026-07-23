import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function fetchAll(table, select, orderColumn) {
    const pageSize = 1000;
    const rows = [];

    for (let from = 0; ; from += pageSize) {
        const to = from + pageSize - 1;
        const { data, error } = await supabase
            .from(table)
            .select(select)
            .order(orderColumn, { ascending: true })
            .range(from, to);

        if (error) throw error;
        rows.push(...(data || []));

        if (!data || data.length < pageSize) break;
    }

    return rows;
}

function metadataOf(conversation) {
    return conversation.metadata && typeof conversation.metadata === 'object'
        ? conversation.metadata
        : {};
}

function collectedDataOf(conversation) {
    const metadata = metadataOf(conversation);
    return metadata.collectedData && typeof metadata.collectedData === 'object'
        ? metadata.collectedData
        : {};
}

function triagePathOf(conversation) {
    const metadata = metadataOf(conversation);
    const collectedData = collectedDataOf(conversation);
    return metadata.triage_path || collectedData.triage_path || null;
}

function isLeadWorthyClose(conversation) {
    const metadata = metadataOf(conversation);
    const collectedData = collectedDataOf(conversation);
    const triagePath = triagePathOf(conversation);

    return metadata.phase === 'close'
        && (triagePath === 'clinical' || collectedData.invite_needed === true);
}

const conversations = await fetchAll(
    'conversations',
    'session_id, created_at, updated_at, metadata',
    'created_at'
);
const leads = await fetchAll('leads', 'session_id', 'created_at');
const leadSessionIds = new Set(leads.map(lead => lead.session_id));

const missing = conversations
    .filter(conversation => isLeadWorthyClose(conversation))
    .filter(conversation => !leadSessionIds.has(conversation.session_id))
    .map(conversation => {
        const metadata = metadataOf(conversation);
        const collectedData = collectedDataOf(conversation);

        return {
            session_id: conversation.session_id,
            created_at: conversation.created_at,
            updated_at: conversation.updated_at,
            triage_path: triagePathOf(conversation),
            invite_needed: collectedData.invite_needed === true,
            lead_created_flag: metadata.lead_created === true,
            lead_creation_failed: metadata.lead_creation_failed === true,
            lead_creation_failed_at: metadata.lead_creation_failed_at || null,
            has_name: Boolean(collectedData.name),
            has_phone: Boolean(collectedData.phone)
        };
    });

console.log(JSON.stringify({
    checked_at: new Date().toISOString(),
    checked_conversations: conversations.length,
    checked_leads: leads.length,
    missing_lead_count: missing.length,
    missing
}, null, 2));

if (missing.length > 0) {
    process.exitCode = 1;
}