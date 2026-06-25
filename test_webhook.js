/**
 * Test WhatsApp Webhook
 */

async function testWebhook() {
    const webhookUrl = 'https://grace-bot-production.up.railway.app/api/whatsapp/webhook';
    
    const testPayload = {
        MessageSid: 'SMtest123456789',
        From: 'whatsapp:+27761234567',
        To: 'whatsapp:+1415523886',
        Body: 'Test message',
        ProfileName: 'Test User',
        AccountSid: 'test'
    };

    try {
        console.log('Testing webhook URL:', webhookUrl);
        console.log('Payload:', JSON.stringify(testPayload, null, 2));
        console.log('\nSending POST request...\n');

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(testPayload)
        });

        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        
        const text = await response.text();
        console.log('Response:', text);

        if (response.status === 200) {
            console.log('\n✅ Webhook is working!');
        } else {
            console.log('\n❌ Webhook returned error status');
        }
    } catch (error) {
        console.error('❌ Error testing webhook:', error.message);
    }
}

testWebhook();
