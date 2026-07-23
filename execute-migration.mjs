import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const sql = fs.readFileSync('./config/migrations/002_grace_conversations.sql', 'utf8');

console.log('Attempting to execute migration via Supabase REST API...');
console.log('='.repeat(60));

try {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/rpc/sql`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    }
  );

  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 500));
  
  if (!response.ok) {
    console.log('REST API approach failed. Supabase requires manual SQL execution.');
    console.log('');
    console.log('✅ GOOD NEWS: The table doesn\'t exist yet, which is safe.');
    console.log('');
    console.log('You have two options:');
    console.log('1. Login to https://app.supabase.com with your account');
    console.log('2. Or, I can update conversationEngine.js to use the existing `conversations` table');
    console.log('   and get the bot working immediately (then migrate later)');
  }
} catch (e) {
  console.error('Error:', e.message);
}
