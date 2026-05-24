import { useState } from 'react';

function RegisterPage({ onShowLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [message, setMessage] = useState('');

    const handleRegister = async () => {
        setMessage('');

        try {
            const response = await fetch('http://localhost:3000/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || 'Registration failed');
                return;
            }

            setEmailSent(true);
            setMessage(data.message || 'Verification email sent. Check your inbox.');
        } catch (error) {
            setMessage('Could not connect to the API');
            console.error(error);
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-visual" aria-label="Bank registration preview">
                <div className="brand-mark">B</div>
                <div className="auth-visual-copy">
                    <p className="eyebrow">Start in minutes</p>
                    <h1>Create your account</h1>
                    <p>
                        Open your banking dashboard with a starting balance and verified access.
                    </p>
                </div>

                <div className="account-preview">
                    <div>
                        <span>New account bonus</span>
                        <strong>$5,000.50</strong>
                    </div>
                    <div className="preview-row">
                        <span>Verification</span>
                        <b>Email link</b>
                    </div>
                </div>
            </section>

            <section className="auth-panel" aria-labelledby="register-title">
                <div className="auth-card">
                    <div className="auth-heading">
                        <p className="eyebrow">Register</p>
                        <h2 id="register-title">
                            {emailSent ? 'Check your email' : 'Create your account'}
                        </h2>
                        <p>
                            {emailSent
                                ? 'Open the verification link we sent, then log in.'
                                : 'Use your email and password.'}
                        </p>
                    </div>

                    {!emailSent ? (
                        <>
                            <label>
                                Email
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </label>

                            <label>
                                Password
                                <input
                                    type="password"
                                    placeholder="At least 3 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </label>

                            <button className="primary-button" onClick={handleRegister}>
                                Create account
                            </button>
                        </>
                    ) : (
                        <div className="email-verification-card">
                            <strong>{email}</strong>
                            <p>
                                After verifying your email, return here and sign in with your password.
                            </p>
                            <button className="primary-button" onClick={onShowLogin}>
                                Go to login
                            </button>
                        </div>
                    )}

                    {message && <p className="form-message">{message}</p>}

                    <p className="auth-switch">
                        Already have an account?
                        <button className="link-button" onClick={onShowLogin}>
                            Login
                        </button>
                    </p>
                </div>
            </section>
        </main>
    );
}

export default RegisterPage;
