/**
 * Apply Contact Email Migration
 * Adds contact_email column to leads table in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://dtmtrbirhdxijpfuzntr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bXRyYmlyaGR4aWpwZnV6bnRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU2NjEzMywiZXhwIjoyMDk2MTQyMTMzfQ.cGrez58Gjxr2JN2KQeWwSdior9kXDksafO5XsvaAJ8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
    console.log('\n' + '='.repeat(80));
    console.log('🗄️  APPLYING CONTACT EMAIL MIGRATION');
    console.log('='.repeat(80) + '\n');

    try {
        // Read migration SQL
        const migrationSql = fs.readFileSync('config/migrations/006_add_contact_email.sql', 'utf8');
        
        console.log('📋 Migration SQL:');
        console.log(migrationSql);
        console.log('\n⏳ Applying migration...\n');

        // Execute raw SQL through Supabase
        const { data, error } = await supabase.rpc('exec_sql', { 
            sql: migrationSql 
        }).catch(err => {
            // If rpc doesn't exist, we'll need to apply manually
            return { error: err };
        });

        if (error) {
            console.log('ℹ️  Note: Direct SQL execution not available. Please run the following SQL manually in Supabase:\n');
            console.log(migrationSql);
            console.log('\n📍 To apply:');
            console.log('   1. Go to Supabase Dashboard: https://supabase.com/dashboard');
            console.log('   2. Select your project');
            console.log('   3. Go to SQL Editor');
            console.log('   4. Paste and run the SQL above');
            return;
        }

        console.log('✅ Migration applied successfully!');
        console.log('   • Added contact_email column to leads table');
        console.log('   • Created index on contact_email\n');

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.log('\n📍 To apply manually:');
        console.log('   1. Go to Supabase Dashboard: https://supabase.com/dashboard');
        console.log('   2. Select your project');
        console.log('   3. Go to SQL Editor');
        console.log('   4. Read and run config/migrations/006_add_contact_email.sql\n');
    }

    console.log('='.repeat(80) + '\n');
}

applyMigration();
