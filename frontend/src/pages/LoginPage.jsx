import { useState } from 'react';

function LoginPage({ onLogin, onShowRegister }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleLogin = async (event) => {
        event.preventDefault();
        setMessage('');

        try {
            const response = await fetch(
                'http://localhost:3000/auth/login',
                {
                    method: 'POST',
                    credentials: 'include',

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
                setMessage(data.error || 'Login failed');
                return;
            }

            setMessage('Login successful');
            onLogin(data.user);
            console.log(data);
        } catch (error) {
            setMessage('Could not connect to the API');
            console.error(error);
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-visual" aria-label="Secure banking sign in">
                <div className="brand-lockup">
                    <div className="brand-mark">B</div>
                    <span>Boolean Bank</span>
                </div>
                <div className="auth-visual-copy">
                    <p className="eyebrow">Secure banking</p>
                    <h1>Welcome back</h1>
                    <p>
                        Check your balance, manage transfers, and keep your account activity close.
                    </p>
                </div>

                <div className="account-preview">
                    <div>
                        <span>Security</span>
                        <strong>Private banking access</strong>
                    </div>
                    <div className="preview-row">
                        <span>Email verification</span>
                        <b>Enabled</b>
                    </div>
                </div>
            </section>

            <section className="auth-panel" aria-labelledby="login-title">
                <form className="auth-card" onSubmit={handleLogin}>
                    <div className="auth-heading">
                        <p className="eyebrow">Sign in</p>
                        <h2 id="login-title">Login to your account</h2>
                        <p>Enter your details to continue to the dashboard.</p>
                    </div>

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
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </label>

                    <button className="primary-button" type="submit">
                        Login
                    </button>

                    {message && <p className="form-message">{message}</p>}

                    <p className="auth-switch">
                        Do not have an account?
                        <button className="link-button" onClick={onShowRegister}>
                            Register
                        </button>
                    </p>
                </form>
            </section>
        </main>
    );
}

export default LoginPage;
