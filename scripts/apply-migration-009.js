import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Read migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/20260626130000_009_track_field.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('Applying migration 009...');
console.log('SQL:', sql);

// Execute migration using raw SQL via rpc
const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}

console.log('Migration applied successfully!');
console.log('Result:', data);
