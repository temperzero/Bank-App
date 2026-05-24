import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const TRANSACTIONS_PER_PAGE = 6;

function DashboardPage({
    user,
    latestNotification,
    notifications = [],
    onAcknowledgeNotification,
    onLogout,
    onShowTransactions
}) {
    const [transactions, setTransactions] = useState([]);
    const [transactionsError, setTransactionsError] = useState('');
    const [transactionsLoading, setTransactionsLoading] = useState(true);
    const [transactionsPage, setTransactionsPage] = useState(1);
    const [transactionsPageInput, setTransactionsPageInput] = useState('1');
    const [transactionsPagination, setTransactionsPagination] = useState({
        page: 1,
        limit: TRANSACTIONS_PER_PAGE,
        total: 0,
        totalPages: 0
    });
    const [chatMessages, setChatMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Hi, I can help with balances, recent transactions, and confirmed transfers.'
        }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatError, setChatError] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatMessagesRef = useRef(null);
    const shouldRestoreScrollRef = useRef(false);
    const savedScrollPositionRef = useRef({ x: 0, y: 0 });
    const displayUser = user || {};
    const balance = Number(displayUser.balance || 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
    });

    useEffect(() => {
        const loadTransactions = async () => {
            setTransactionsLoading(true);
            setTransactionsError('');

            try {
                const response = await fetch(
                    `http://localhost:3000/transaction/history?page=${transactionsPage}&limit=${TRANSACTIONS_PER_PAGE}`,
                    {
                        credentials: 'include'
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    setTransactionsError(data.error || 'Could not load transactions.');
                    return;
                }

                setTransactions(data.transactions || []);
                setTransactionsPagination(data.pagination || {
                    page: transactionsPage,
                    limit: TRANSACTIONS_PER_PAGE,
                    total: 0,
                    totalPages: 0
                });
                setTransactionsPageInput(String(data.pagination?.page || transactionsPage));
            } catch (error) {
                setTransactionsError('Could not connect to the API.');
                console.error(error);
            } finally {
                setTransactionsLoading(false);
            }
        };

        loadTransactions();
    }, [transactionsPage, latestNotification?.id]);

    useEffect(() => {
        if (!chatMessagesRef.current) {
            return;
        }

        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }, [chatMessages, chatLoading]);

    useLayoutEffect(() => {
        if (transactionsLoading || !shouldRestoreScrollRef.current) {
            return;
        }

        const { x, y } = savedScrollPositionRef.current;

        shouldRestoreScrollRef.current = false;
        window.requestAnimationFrame(() => {
            window.scrollTo({
                left: x,
                top: y,
                behavior: 'auto'
            });
        });
    }, [transactionsLoading, transactions, transactionsError]);

    const hasPreviousTransactionsPage = transactionsPagination.page > 1;
    const hasNextTransactionsPage = transactionsPagination.page < transactionsPagination.totalPages;
    const totalTransactionPages = Math.max(transactionsPagination.totalPages, 1);

    const preserveScrollForTransactionPageChange = () => {
        shouldRestoreScrollRef.current = true;
        savedScrollPositionRef.current = {
            x: window.scrollX,
            y: window.scrollY
        };
    };

    const formatAmount = (transaction) => {
        const amount = Number(transaction.amount || 0).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });

        return transaction.type === 'received' ? `+${amount}` : `-${amount}`;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) {
            return 'Date unavailable';
        }

        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleSendChatMessage = async (event) => {
        event.preventDefault();

        const message = chatInput.trim();

        if (!message || chatLoading) {
            return;
        }

        const userMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: message
        };

        setChatMessages((messages) => [...messages, userMessage]);
        setChatInput('');
        setChatError('');
        setChatLoading(true);

        try {
            const response = await fetch('http://localhost:3000/chat', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setChatError(data.error || 'Could not send message.');
                return;
            }

            setChatMessages((messages) => [
                ...messages,
                {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: data.reply || 'I could not create a response.'
                }
            ]);
        } catch (error) {
            setChatError('Could not connect to the chatbot.');
            console.error(error);
        } finally {
            setChatLoading(false);
        }
    };

    const handleTransactionPageJump = (event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const nextPage = Number(formData.get('transactionPage'));

        if (!Number.isInteger(nextPage)) {
            setTransactionsPageInput(String(transactionsPagination.page));
            return;
        }

        const clampedPage = Math.min(
            Math.max(nextPage, 1),
            totalTransactionPages
        );

        preserveScrollForTransactionPageChange();
        setTransactionsPage(clampedPage);
        setTransactionsPageInput(String(clampedPage));
    };

    return (
        <main className="dashboard-page">
            <header className="dashboard-header">
                <div className="dashboard-title">
                    <div className="brand-mark small">B</div>
                    <div>
                        <p className="eyebrow">Account overview</p>
                        <h1>Dashboard</h1>
                    </div>
                </div>

                <button className="secondary-button" onClick={onLogout}>
                    Logout
                </button>
            </header>

            <section className="dashboard-summary" aria-label="Account summary">
                <article className="summary-card balance-card">
                    <span>Available balance</span>
                    <strong>{balance}</strong>
                </article>

                <article className="summary-card">
                    <span>Email</span>
                    <strong>{displayUser.email || 'Not loaded'}</strong>
                </article>

                <article className="summary-card">
                    <span>Status</span>
                    <strong>{displayUser.isVerified ? 'Verified' : 'Pending'}</strong>
                </article>
            </section>

            <section className="dashboard-grid">
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <h2>Quick actions</h2>
                    </div>

                    <div className="quick-actions">
                        <button onClick={onShowTransactions}>Send money</button>
                        <button>Deposit</button>
                        <button>View profile</button>
                    </div>

                    <section className="notification-box" aria-label="Notifications">
                        <div className="notification-box-header">
                            <h3>Notifications</h3>
                            <span>{notifications.length}</span>
                        </div>

                        {notifications.length === 0 && (
                            <p className="notification-empty">No new notifications.</p>
                        )}

                        {notifications.length > 0 && (
                            <ul className="notification-list" aria-live="polite">
                                {notifications.map((notification) => (
                                    <li key={notification.id}>
                                        <button
                                            className="notification-item"
                                            onClick={() => onAcknowledgeNotification(notification.id)}
                                            type="button"
                                        >
                                            <span>{notification.message}</span>
                                            <small>
                                                {formatDate(notification.receivedAt || notification.transaction?.timestamp)}
                                            </small>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                <div className="dashboard-panel chat-panel">
                    <div className="panel-header">
                        <h2>Assistant</h2>
                        <span className="panel-meta">Account help</span>
                    </div>

                    <div className="chat-messages" ref={chatMessagesRef} aria-live="polite">
                        {chatMessages.map((chatMessage) => (
                            <div
                                className={`chat-message ${chatMessage.role}`}
                                key={chatMessage.id}
                            >
                                {chatMessage.content}
                            </div>
                        ))}

                        {chatLoading && (
                            <div className="chat-message assistant">
                                Thinking...
                            </div>
                        )}
                    </div>

                    {chatError && (
                        <p className="form-message">{chatError}</p>
                    )}

                    <form className="chat-form" onSubmit={handleSendChatMessage}>
                        <input
                            aria-label="Message the banking assistant"
                            placeholder="Ask about recent transactions"
                            value={chatInput}
                            onChange={(event) => setChatInput(event.target.value)}
                        />

                        <button
                            className="primary-button"
                            disabled={chatLoading || !chatInput.trim()}
                            type="submit"
                        >
                            Send
                        </button>
                    </form>
                </div>

                <div className="dashboard-panel activity-panel">
                    <div className="panel-header">
                        <h2>Recent activity</h2>
                        <span className="panel-meta">Latest transactions</span>
                    </div>

                    {transactionsLoading && (
                        <div className="empty-state">Loading transactions...</div>
                    )}

                    {!transactionsLoading && transactionsError && (
                        <div className="empty-state">{transactionsError}</div>
                    )}

                    {!transactionsLoading && !transactionsError && transactions.length === 0 && (
                        <div className="empty-state">No transactions yet.</div>
                    )}

                    {!transactionsLoading && !transactionsError && transactions.length > 0 && (
                        <>
                            <ul className="transaction-list">
                                {transactions.map((transaction) => (
                                    <li className="transaction-item" key={transaction._id}>
                                        <div>
                                            <strong>
                                                {transaction.type === 'received' ? 'Received from' : 'Sent to'}{' '}
                                                {transaction.otherParty}
                                            </strong>
                                            <span>{formatDate(transaction.timestamp)}</span>
                                        </div>

                                        <b className={`transaction-amount ${transaction.type}`}>
                                            {formatAmount(transaction)}
                                        </b>
                                    </li>
                                ))}
                            </ul>

                            <div className="pagination-controls" aria-label="Transaction history pagination">
                                <button
                                    className="secondary-button"
                                    disabled={!hasPreviousTransactionsPage || transactionsLoading}
                                    onClick={() => {
                                        const previousPage = transactionsPage - 1;

                                        preserveScrollForTransactionPageChange();
                                        setTransactionsPage(previousPage);
                                        setTransactionsPageInput(String(previousPage));
                                    }}
                                >
                                    Previous
                                </button>

                                <form className="page-jump-form" onSubmit={handleTransactionPageJump}>
                                    <label>
                                        Page
                                        <input
                                            aria-label="Transaction history page number"
                                            inputMode="numeric"
                                            min="1"
                                            max={totalTransactionPages}
                                            name="transactionPage"
                                            type="number"
                                            value={transactionsPageInput}
                                            onChange={(event) => setTransactionsPageInput(event.target.value)}
                                        />
                                    </label>

                                    <span>of {totalTransactionPages}</span>

                                    <button
                                        className="secondary-button"
                                        disabled={transactionsLoading}
                                        type="submit"
                                    >
                                        Go
                                    </button>
                                </form>

                                <button
                                    className="secondary-button"
                                    disabled={!hasNextTransactionsPage || transactionsLoading}
                                    onClick={() => {
                                        const nextPage = transactionsPage + 1;

                                        preserveScrollForTransactionPageChange();
                                        setTransactionsPage(nextPage);
                                        setTransactionsPageInput(String(nextPage));
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}

export default DashboardPage;
