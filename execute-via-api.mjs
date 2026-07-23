import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const sql = fs.readFileSync('./config/migrations/002_grace_conversations.sql', 'utf8');

console.log('🚀 Executing migration via Supabase REST API');
console.log('='.repeat(70));
console.log('URL:', process.env.SUPABASE_URL);
console.log('Service Key Present:', !!process.env.SUPABASE_SERVICE_KEY);
console.log('');

// Split SQL into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

console.log(`Total statements: ${statements.length}`);
console.log('');

async function executeStatement(stmt, index) {
  const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
  console.log(`[${index + 1}/${statements.length}] ${preview}...`);

  try {
    // Try multiple RPC function names
    const rpcNames = ['exec', 'exec_sql', 'sql', 'execute_sql', 'query'];
    
    for (const rpcName of rpcNames) {
      try {
        const response = await fetch(
          `${process.env.SUPABASE_URL}/rest/v1/rpc/${rpcName}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({ 
              sql: stmt,
              query: stmt,
              statement: stmt,
            })
          }
        );

        if (response.ok) {
          console.log(`   ✅ Success via rpc/${rpcName}`);
          return true;
        } else if (response.status !== 404) {
          console.log(`   ⚠️  rpc/${rpcName}: Status ${response.status}`);
        }
      } catch (e) {
        // Continue to next RPC name
      }
    }

    console.log(`   ❌ No RPC function worked`);
    return false;
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return false;
  }
}

// Try to execute all statements
let successful = 0;
for (let i = 0; i < statements.length; i++) {
  if (await executeStatement(statements[i], i)) {
    successful++;
  }
}

console.log('');
console.log('='.repeat(70));
console.log(`Result: ${successful}/${statements.length} statements executed`);
console.log('');

if (successful === 0) {
  console.log('⚠️  No RPC functions available on this Supabase instance.');
  console.log('');
  console.log('Alternative: You need to manually execute the SQL in Supabase:');
  console.log('1. Login at: https://app.supabase.com');
  console.log('2. Go to SQL Editor');
  console.log('3. Paste the migration SQL');
  console.log('4. Click Run');
  console.log('');
  console.log('The SQL file is at: ./config/migrations/002_grace_conversations.sql');
}

// Try to verify the table exists
console.log('Checking if grace_conversations table exists...');
try {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/grace_conversations?limit=0`,
    {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      }
    }
  );

  if (response.ok) {
    console.log('✅ grace_conversations table EXISTS and is accessible!');
  } else if (response.status === 404) {
    console.log('❌ grace_conversations table does NOT exist');
  }
} catch (e) {
  console.log('Could not verify table:', e.message);
}
