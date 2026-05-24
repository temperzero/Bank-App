const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { signupValidation } = require('../models');
const { createToken, createPublicUser } = require('../helpers');
const { sendVerificationEmail } = require('../email');

/* ===== AUTH ROUTES ===== */

const ONE_HOUR = 60 * 60 * 1000;

const authCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ONE_HOUR
};

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send({ error: 'Missing fields' });
        }

        const { error } = signupValidation.validate(req.body);

        if (error) {
            return res.status(400).send({ error: error.details[0].message });
        }

        const existingUser = await db.user.findByEmail(email);

        if (existingUser) {
            return res.status(400).send({ error: 'User already exists' });
        }

        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const newUser = await db.user.create({
            email,
            password,
            balance: 5000.50,
            isVerified: false,
            otp: '123456',
            emailVerificationToken,
            emailVerificationExpires,
            createdAt: new Date().toISOString()
        });

        const apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
        const verificationLink = `${apiUrl}/auth/verify-email?token=${emailVerificationToken}`;

        try {
            await sendVerificationEmail(newUser.email, verificationLink);
        } catch (error) {
            console.error('Failed to send verification email:', error);
            await db.user.deleteById(newUser._id);

            return res.status(502).send({
                error: 'Could not send verification email. Please check SMTP settings.'
            });
        }

        return res.status(201).send({
            message: 'Verification email sent',
            userId: newUser._id
        });
    } catch (error) {
        console.error('Signup failed:', error);

        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyPattern || {})[0];

            return res.status(409).send({
                error: duplicateField === 'phone'
                    ? 'Legacy phone index still exists. Restart the API or run npm run cleanup:phone.'
                    : 'User already exists'
            });
        }

        return res.status(500).send({ error: 'Registration failed' });
    }
});

// Verify email link
router.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('Missing verification token');
    }

    const user = await db.user.findByEmailVerificationToken(token);

    if (!user) {
        return res.status(400).send('Verification link is invalid or expired');
    }

    await db.user.verify(user._id);

    res.send(`
        <!doctype html>
        <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Email verified</title>
                <style>
                    body {
                        align-items: center;
                        background: #f4f7fb;
                        color: #0f172a;
                        display: flex;
                        font-family: Inter, system-ui, sans-serif;
                        justify-content: center;
                        margin: 0;
                        min-height: 100vh;
                    }

                    main {
                        background: #ffffff;
                        border: 1px solid #dbe4ef;
                        border-radius: 8px;
                        box-shadow: 0 14px 38px rgba(15, 23, 42, 0.08);
                        max-width: 440px;
                        padding: 32px;
                        text-align: center;
                    }

                    a {
                        color: #2563eb;
                        font-weight: 800;
                    }
                </style>
            </head>
            <body>
                <main>
                    <h1>Email verified</h1>
                    <p>Your account is ready. You can close this tab and log in.</p>
                    <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">Go to login</a></p>
                </main>
            </body>
        </html>
    `);
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
        return res.status(400).send({ error: 'Missing userId or OTP' });
    }

    const user = await db.user.findById(userId);

    if (!user) {
        return res.status(400).send({ error: 'User not found' });
    }

    if (user.otp !== otp) {
        return res.status(400).send({ error: 'Invalid OTP' });
    }

    await db.user.verify(userId);
    user.isVerified = true;

    res.send({
        user: createPublicUser(user)
    });
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send({ error: 'Missing credentials' });
    }

    const user = await db.user.findByEmail(email);

    if (!user || user.password !== password) {
        return res.status(401).send({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
        return res.status(401).send({ error: 'User not verified' });
    }

    res.cookie('token', createToken(user), authCookieOptions);

    res.send({
        user: createPublicUser(user)
    });
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });

    res.send({ message: 'Logged out' });
});

module.exports = router;
