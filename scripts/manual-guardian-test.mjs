import { GraceConversationEngine } from './src/conversationEngine.js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

// Manually load .env.local to avoid dotenv issues
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      if (key.trim()) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

// Mock logger
const mockLogger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.log('[WARN]', ...args),
  error: (...args) => console.log('[ERROR]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args),
};

// Mock supabase client
const mockSupabase = {
  from: (table) => ({
    insert: async (data) => {
      return {
        data: [{ id: 'test-conversation-id' }],
        error: null,
      };
    },
    select: () => ({
      eq: () => ({
        order: () => ({
          limit: () => ({
            single: async () => ({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      }),
    }),
    update: async () => ({
      error: null,
    }),
  }),
};

// Test messages: minor caller, mentions guardian, mentions alcohol
const testMessages = [
  {
    role: 'user',
    content: 'Hi, I\'m calling because I\'m 16 and I\'ve been drinking alcohol.',
  },
  {
    role: 'assistant',
    content: 'Thank you for reaching out. That takes courage. Can you tell me more about what\'s been happening?',
  },
  {
    role: 'user',
    content: 'I\'ve been drinking beer most weekends. My mom doesn\'t know yet. Her name is Linda and you can reach her at 0821234567 if you need to.',
  },
  {
    role: 'assistant',
    content: 'I appreciate you sharing that. How long has this been going on?',
  },
  {
    role: 'user',
    content: 'About 6 months now. I\'m worried I might have a problem.',
  },
];

async function testConversationEngine() {
  console.log('=== Testing Guardian Extraction with Real Anthropic API ===\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY not found in environment');
    process.exit(1);
  }

  // Create a REAL Anthropic client for guardian extraction (uses Haiku)
  const realAnthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  console.log('✓ Real Anthropic client created (Haiku model)\n');

  // Import the field extractor
  const { extractFieldsFromConversation } = await import('./src/fieldExtractor.js');

  try {
    console.log('Extracting fields from test conversation...\n');
    const extracted = await extractFieldsFromConversation(testMessages, realAnthropicClient);

    console.log('\n=== FULL EXTRACTED FIELDS ===');
    console.log(JSON.stringify(extracted, null, 2));

    console.log('\n=== GUARDIAN EXTRACTION RESULTS ===');
    console.log('\nguardian_name:', JSON.stringify(extracted.guardian_name, null, 2));
    console.log('\nguardian_phone:', JSON.stringify(extracted.guardian_phone, null, 2));
    console.log('\nguardian_relation:', JSON.stringify(extracted.guardian_relation, null, 2));
    console.log('\nguardian_extraction_status:', JSON.stringify(extracted.guardian_extraction_status, null, 2));

    console.log('\n=== OTHER KEY FIELDS ===');
    console.log('\ninvolves_minor:', JSON.stringify(extracted.involves_minor, null, 2));
    console.log('\ntrack:', JSON.stringify(extracted.track, null, 2));
    console.log('\nprimary_substance:', JSON.stringify(extracted.primary_substance, null, 2));
    console.log('\ncaller_type:', JSON.stringify(extracted.caller_type, null, 2));

    console.log('\n=== TEST PASSED ===');
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testConversationEngine();
