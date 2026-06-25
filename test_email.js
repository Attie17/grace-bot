import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function testEmail() {
    console.log('\n=== EMAIL CONFIGURATION ===');
    console.log(`Host: ${process.env.SMTP_HOST}`);
    console.log(`Port: ${process.env.SMTP_PORT}`);
    console.log(`User: ${process.env.SMTP_USER}`);
    console.log(`From: ${process.env.SMTP_FROM}`);
    console.log(`To: ${process.env.RECEPTION_EMAIL}`);
    
    console.log('\n=== TESTING EMAIL SEND ===');
    
    try {
        // Verify connection
        await emailTransporter.verify();
        console.log('✅ SMTP connection verified');

        // Send test email
        const info = await emailTransporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.RECEPTION_EMAIL,
            subject: '🧪 Test Email — Grace Bot (Ignore)',
            html: `
                <div style="font-family: Arial; padding: 20px;">
                    <h1>Test Email</h1>
                    <p>This is a test email from Grace Bot to verify SMTP configuration.</p>
                    <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
                    <p>If you received this, SMTP is working correctly!</p>
                </div>
            `
        });

        console.log('✅ Email sent successfully!');
        console.log(`Response: ${info.response}`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Email send failed:');
        console.error(`Error: ${error.message}`);
        console.error(`Code: ${error.code}`);
        console.error(`Command: ${error.command}`);
        process.exit(1);
    }
}

testEmail();
