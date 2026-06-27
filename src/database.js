/**
 * Database Client - Supabase (Postgres)
 * 
 * Handles conversation persistence, lead creation, and analytics.
 * Schema defined in config/schema.sql
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

let supabase = null;

function getClient() {
    if (!supabase) {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY ||
            process.env.SUPABASE_URL.includes('xxxxx')) {
            logger.warn('Supabase not configured — database calls will be skipped');
            return null;
        }
        supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
    }
    return supabase;
}

/**
 * Load conversation history for a session.
 */
export async function loadConversation(sessionId) {
    const db = getClient();
    if (!db) return null;

    const { data, error } = await db
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found, which is fine
        logger.error({ error, sessionId }, 'Failed to load conversation');
    }

    return data;
}

/**
 * Save or update conversation.
 */
export async function saveConversation(sessionId, messages, metadata = {}) {
    const db = getClient();
    if (!db) return null;

    const { data, error } = await db
        .from('conversations')
        .upsert({
            session_id: sessionId,
            messages: messages,
            metadata: metadata,
            updated_at: new Date().toISOString()
        }, { onConflict: 'session_id' });

    if (error) {
        logger.error({ error, sessionId }, 'Failed to save conversation');
        throw error;
    }

    return data;
}

/**
 * Create a qualified lead from a clinical brief.
 */
export async function createLead(sessionId, brief) {
    const db = getClient();
    if (!db) return null;

    // Sanitize enum fields — Claude sometimes adds extra text
    const validEnum = (value, allowed, fallback) => {
        if (!value) return fallback;
        const clean = value.toLowerCase().trim();
        const match = allowed.find(v => clean.startsWith(v));
        return match || fallback;
    };

    const { data, error } = await db
        .from('leads')
        .insert({
            session_id: sessionId,
            contact_name: brief.contact_name,
            contact_phone: brief.contact_phone,
            contact_email: brief.contact_email || null,
            urgency: validEnum(brief.urgency, ['immediate', 'soon', 'planning', 'researching'], 'researching'),
            for_whom: validEnum(brief.for_whom, ['self', 'family', 'friend', 'employer'], 'self'),
            who_for: brief.who_for || null,
            caller_relation: brief.caller_relation || null,
            referred_name: brief.referred_name || null,
            track: brief.track || null,
            substance_primary: brief.substance_primary,
            usage_pattern: brief.usage_pattern,
            previous_treatment: validEnum(brief.previous_treatment, ['none', 'once', 'multiple'], 'none'),
            mental_health: validEnum(brief.mental_health, ['none', 'suspected', 'diagnosed', 'unknown'], 'unknown'),
            medical_flags: brief.medical_flags,
            medical_aid: brief.medical_aid,
            medical_aid_name: brief.medical_aid_name || null,
            medical_aid_provider: brief.medical_aid || null,
            medical_aid_number: brief.medical_member_number || null,
            medical_aid_plan: null,
            readiness_score: brief.readiness_score,
            recommended_programme: brief.recommended_programme,
            preferred_callback_time: brief.preferred_callback_time,
            notes_for_therapist: brief.notes_for_therapist,
            mh_description: brief.mh_description || null,
            urgency_level: brief.urgency_level || null,
            language_preference: brief.language_preference,
            city: brief.city,
            caller_type: brief.caller_type,
            involves_minor: brief.involves_minor || false,
            caller_age_band: brief.caller_age_band || 'adult',
            guardian_name: brief.guardian_name || null,
            guardian_phone: brief.guardian_phone || null,
            guardian_relation: brief.guardian_relation || null,
            funding_source: brief.funding_source || null,
            utm_source: brief.utm_source || null,
            utm_medium: brief.utm_medium || null,
            utm_campaign: brief.utm_campaign || null,
            utm_content: brief.utm_content || null,
            utm_term: brief.utm_term || null,
            status: 'new'
        })
        .select()
        .single();

    if (error) {
        logger.error({ error, sessionId }, 'Failed to create lead');
        throw error;
    }

    return data.id;
}

/**
 * Get lead by ID for therapist follow-up.
 */
export async function getLead(leadId) {
    const db = getClient();
    if (!db) return null;

    const { data, error } = await db
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

    if (error) {
        logger.error({ error, leadId }, 'Failed to get lead');
        return null;
    }

    return data;
}

/**
 * Update lead status (called by therapist when they action the lead).
 */
export async function updateLeadStatus(leadId, status, notes = '') {
    const db = getClient();
    if (!db) return;

    const { error } = await db
        .from('leads')
        .update({
            status: status, // 'new' | 'contacted' | 'scheduled' | 'admitted' | 'not_fit' | 'lost'
            therapist_notes: notes,
            updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

    if (error) {
        logger.error({ error, leadId }, 'Failed to update lead');
        throw error;
    }
}

/**
 * Get all leads (cumulative) for CSV export.
 */
export async function getAllLeads() {
    const db = getClient();
    if (!db) return [];

    const { data, error } = await db
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        logger.error({ error }, 'Failed to fetch all leads');
        return [];
    }

    return data;
}

/**
 * Analytics: get stats for a date range.
 */
export async function getStats(startDate, endDate) {
    const db = getClient();
    if (!db) return { total_conversations: 0, qualified_leads: 0, admitted: 0, conversion_rate: 0 };

    const { data: conversations } = await db
        .from('conversations')
        .select('session_id, created_at, metadata')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

    const { data: leads } = await db
        .from('leads')
        .select('id, status, urgency, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

    return {
        total_conversations: conversations?.length || 0,
        qualified_leads: leads?.length || 0,
        admitted: leads?.filter(l => l.status === 'admitted').length || 0,
        conversion_rate: leads?.length && conversations?.length
            ? (leads.length / conversations.length * 100).toFixed(2)
            : 0
    };
}
