import { useState } from 'react';
import { API_URL } from '../config';

function RegisterPage({ onShowLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [message, setMessage] = useState('');

    const handleRegister = async (event) => {
        event.preventDefault();
        setMessage('');

        try {
            const response = await fetch(
                `${API_URL}/auth/signup`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setMessage(
                    data.error || 'Registration failed'
                );

                return;
            }

            setEmailSent(true);

            setMessage(
                data.message ||
                'Verification email sent. Check your inbox.'
            );
        } catch (error) {
            setMessage('Could not connect to the API');

            console.error(error);
        }
    };

    return (
        <main className="auth-page">
            <section
                className="auth-visual"
                aria-label="Bank registration preview"
            >
                <div className="brand-lockup">
                    <div className="brand-mark">B</div>
                    <span>Boolean Bank</span>
                </div>

                <div className="auth-visual-copy">
                    <p className="eyebrow">
                        Start in minutes
                    </p>

                    <h1>Create your account</h1>

                    <p>
                        Open your banking dashboard,
                        verify your email, and keep
                        your account activity close.
                    </p>
                </div>

                <div className="account-preview">
                    <div>
                        <span>Security</span>

                        <strong>Verified banking access</strong>
                    </div>

                    <div className="preview-row">
                        <span>Verification</span>

                        <b>Email link</b>
                    </div>
                </div>
            </section>

            <section
                className="auth-panel"
                aria-labelledby="register-title"
            >
                <form
                    className="auth-card"
                    onSubmit={handleRegister}
                >
                    <div className="auth-heading">
                        <p className="eyebrow">
                            Register
                        </p>

                        <h2 id="register-title">
                            {emailSent
                                ? 'Check your email'
                                : 'Create your account'}
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
                                    onChange={(e) =>
                                        setEmail(
                                            e.target.value
                                        )
                                    }
                                />
                            </label>

                            <label>
                                Password

                                <input
                                    type="password"
                                    placeholder="At least 3 characters"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(
                                            e.target.value
                                        )
                                    }
                                />
                            </label>

                            <button
                                className="primary-button"
                                type="submit"
                            >
                                Create account
                            </button>
                        </>
                    ) : (
                        <div className="email-verification-card">
                            <strong>{email}</strong>

                            <p>
                                After verifying your email,
                                return here and sign in
                                with your password.
                            </p>

                            <button
                                className="primary-button"
                                onClick={onShowLogin}
                                type="button"
                            >
                                Go to login
                            </button>
                        </div>
                    )}

                    {message && (
                        <p className="form-message">
                            {message}
                        </p>
                    )}

                    <p className="auth-switch">
                        Already have an account?

                        <button
                            className="link-button"
                            onClick={onShowLogin}
                            type="button"
                        >
                            Login
                        </button>
                    </p>
                </form>
            </section>
        </main>
    );
}

export default RegisterPage;
