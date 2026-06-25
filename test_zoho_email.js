/**
 * Test Zoho SMTP Email Configuration
 * Verifies that Zoho email sending works with the new configuration
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testZohoSMTP() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 ZOHO SMTP EMAIL TEST');
    console.log('='.repeat(80) + '\n');

    console.log('📋 Configuration:');
    console.log(`   Host: ${process.env.SMTP_HOST}`);
    console.log(`   Port: ${process.env.SMTP_PORT}`);
    console.log(`   User: ${process.env.SMTP_USER}`);
    console.log(`   From: ${process.env.SMTP_FROM}`);
    console.log(`   Password: ${process.env.SMTP_PASS ? '✓ Set' : '✗ Missing'}\n`);

    if (!process.env.SMTP_PASS) {
        console.error('❌ SMTP_PASS not set in .env.local');
        process.exit(1);
    }

    try {
        // Create transporter with Zoho settings
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        console.log('🔍 Testing connection...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!\n');

        // Send test email
        console.log('📧 Sending test email...');
        const result = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.RECEPTION_EMAIL,
            subject: '🧪 Zoho SMTP Configuration Test',
            html: `
                <div style="font-family: Arial; padding: 20px;">
                    <h2 style="color: #27ae60;">✅ Zoho SMTP Test Email</h2>
                    <p>If you're reading this, the Zoho SMTP configuration is working correctly!</p>
                    <p><strong>Test Details:</strong></p>
                    <ul>
                        <li>Timestamp: ${new Date().toISOString()}</li>
                        <li>From: ${process.env.SMTP_FROM}</li>
                        <li>Host: ${process.env.SMTP_HOST}</li>
                        <li>Port: ${process.env.SMTP_PORT} (SSL)</li>
                    </ul>
                    <p style="color: #7f8c8d; font-size: 12px;">Grace Bot intake form system</p>
                </div>
            `
        });

        console.log('✅ Email sent successfully!\n');
        console.log('📌 Email Details:');
        console.log(`   Message ID: ${result.messageId}`);
        console.log(`   Sent To: ${process.env.RECEPTION_EMAIL}`);
        console.log(`   Status: Delivered to Zoho SMTP\n`);

        console.log('='.repeat(80));
        console.log('✅ ZOHO SMTP CONFIGURATION VERIFIED');
        console.log('='.repeat(80) + '\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ ERROR:\n');
        console.error(`   ${error.message}\n`);
        
        if (error.code === 'EAUTH') {
            console.error('   → Authentication failed. Check SMTP_USER and SMTP_PASS');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('   → Connection refused. Check SMTP_HOST and SMTP_PORT');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('   → Connection timeout. Check firewall/network settings');
        }
        
        console.error('\n' + '='.repeat(80) + '\n');
        process.exit(1);
    }
}

testZohoSMTP();
