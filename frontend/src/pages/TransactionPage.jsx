import { useState } from 'react';

function TransactionPage({ user, latestNotification, onBack }) {
    const [recipientEmail, setRecipientEmail] = useState('');
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [currentBalance, setCurrentBalance] = useState(Number(user?.balance || 0));
    const displayUser = user || {};
    const displayedBalance = typeof latestNotification?.balance === 'number'
        ? latestNotification.balance
        : currentBalance;
    const balance = displayedBalance.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
    });

    const handleSendMoney = async () => {
        const numericAmount = Number(amount);

        setMessage('');

        if (!recipientEmail || !amount) {
            setMessage('Please enter recipient email and amount.');
            return;
        }

        if (Number.isNaN(numericAmount) || numericAmount < 0.01) {
            setMessage('Please enter an amount of at least $0.01.');
            return;
        }

        setIsSending(true);

        try {
            const response = await fetch('http://localhost:3000/transaction/send', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipientEmail,
                    amount: numericAmount
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || 'Transaction failed.');
                return;
            }

            setCurrentBalance((balanceValue) => balanceValue - numericAmount);
            setRecipientEmail('');
            setAmount('');
            setMessage('Money sent successfully.');
        } catch (error) {
            setMessage('Could not connect to the API.');
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <main className="dashboard-page">
            <header className="dashboard-header">
                <div className="dashboard-title">
                    <div className="brand-mark small">B</div>
                    <div>
                        <p className="eyebrow">Transfer</p>
                        <h1>Send money</h1>
                    </div>
                </div>
            </header>

            <section className="dashboard-summary" aria-label="Account summary">
                <article className="summary-card">
                    <span>Email</span>
                    <strong>{displayUser.email || 'Not loaded'}</strong>
                </article>

                <article className="summary-card balance-card">
                    <span>Available balance</span>
                    <strong>{balance}</strong>
                </article>
            </section>

            {latestNotification && (
                <section className="notification-banner" aria-live="polite">
                    {latestNotification.message}
                </section>
            )}

            <section className="dashboard-panel transaction-panel">
                <div className="panel-header">
                    <h2>New transfer</h2>
                    <span className="panel-meta">Enter recipient details</span>
                </div>

                <div className="transaction-form">
                    <label>
                        Recipient email
                        <input
                            type="email"
                            placeholder="friend@example.com"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                        />
                    </label>

                    <label>
                        Amount
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="25.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </label>

                    <button
                        className="primary-button"
                        disabled={isSending}
                        onClick={handleSendMoney}
                    >
                        {isSending ? 'Sending...' : 'Send'}
                    </button>

                    {message && <p className="form-message">{message}</p>}
                </div>
            </section>

            <button className="secondary-button transaction-back-button" onClick={onBack}>
                Back to dashboard
            </button>
        </main>
    );
}

export default TransactionPage;
