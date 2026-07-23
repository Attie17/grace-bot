import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const sql = fs.readFileSync('./config/migrations/002_grace_conversations.sql', 'utf8');

console.log('Executing migration via Supabase API...');
console.log('='.repeat(60));

try {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/rpc/exec`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({ sql })
    }
  );

  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2).substring(0, 1000));
  
  if (response.ok) {
    console.log('✅ Migration executed successfully!');
  }
} catch (e) {
  console.error('Error:', e.message);
}
