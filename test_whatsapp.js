import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log('\n=== TWILIO WHATSAPP CONFIGURATION ===\n');
console.log(`Account SID: ${accountSid ? accountSid.substring(0, 10) + '...' : 'NOT SET'}`);
console.log(`Auth Token: ${authToken ? authToken.substring(0, 10) + '...' : 'NOT SET'}`);
console.log(`WhatsApp From: ${process.env.TWILIO_WHATSAPP_NUMBER}`);
console.log(`Therapist To: ${process.env.THERAPIST_WHATSAPP}`);

if (!accountSid || !authToken) {
  console.error('\n❌ Twilio credentials not configured!');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testWhatsApp() {
  console.log('\n=== TESTING TWILIO WHATSAPP CONNECTION ===\n');
  
  try {
    // Test 1: Verify account
    console.log('Testing Twilio account connection...');
    const account = await client.api.accounts(accountSid).fetch();
    console.log(`✅ Account verified: ${account.friendlyName}`);
    console.log(`   Status: ${account.status}`);

    // Test 2: Get available phone numbers
    console.log('\nFetching available phone numbers...');
    const numbers = await client.incomingPhoneNumbers.list({ limit: 5 });
    if (numbers.length > 0) {
      console.log(`✅ Found ${numbers.length} phone numbers:`);
      numbers.forEach(num => {
        console.log(`   - ${num.phoneNumber} (${num.friendlyName || 'No name'})`);
      });
    } else {
      console.log('⚠️  No phone numbers found');
    }

    // Test 3: Try to send a WhatsApp message
    console.log('\nAttempting to send test WhatsApp message...');
    console.log(`From: ${process.env.TWILIO_WHATSAPP_NUMBER}`);
    console.log(`To: ${process.env.THERAPIST_WHATSAPP}`);
    
    const message = await client.messages.create({
      body: '🧪 Test WhatsApp from Grace Bot (Ignore)',
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: process.env.THERAPIST_WHATSAPP
    });

    console.log('✅ WhatsApp message sent!');
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);

  } catch (error) {
    console.error('\n❌ Error:');
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    
    if (error.code === 20003) {
      console.error('\n   ℹ️  Error 20003 = Account not authorized for this service');
      console.error('   Solution: Verify your Twilio account has WhatsApp enabled');
    }
    if (error.code === 21608) {
      console.error('\n   ℹ️  Error 21608 = Invalid phone number format');
      console.error('   Solution: Verify phone numbers are in E.164 format (e.g., +12345678901)');
    }
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.error('\n   ℹ️  Timeout = Network connectivity issue');
      console.error('   Solution: Check your internet connection or Twilio API availability');
    }
  }
}

testWhatsApp();
