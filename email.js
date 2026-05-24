const nodemailer = require('nodemailer');

function createTransporter() {
    const {
        SMTP_HOST,
        SMTP_PORT,
        SMTP_USER,
        SMTP_PASS
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        return null;
    }

    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });
}

async function sendVerificationEmail(email, verificationLink) {
    const transporter = createTransporter();

    if (!transporter) {
        console.log(`Email verification link for ${email}: ${verificationLink}`);
        return;
    }

    const info = await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Verify your bank account',
        text: `Verify your account by opening this link: ${verificationLink}`,
        html: `
            <p>Welcome.</p>
            <p>Verify your account by opening this link:</p>
            <p><a href="${verificationLink}">Verify account</a></p>
            <p>This link expires in 24 hours.</p>
        `
    });

    console.log(`Verification email sent to ${email}: ${info.messageId}`);
}

module.exports = {
    sendVerificationEmail
};
