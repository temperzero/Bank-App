import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
            content:
                'Hi, I can help with balances, recent transactions, and confirmed transfers.'
        }
    ]);

    const [chatInput, setChatInput] = useState('');
    const [chatError, setChatError] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    const chatMessagesRef = useRef(null);

    const shouldRestoreScrollRef = useRef(false);

    const savedScrollPositionRef = useRef({
        x: 0,
        y: 0
    });

    const displayUser = user || {};

    const balance = Number(displayUser.balance || 0).toLocaleString(
        'en-US',
        {
            style: 'currency',
            currency: 'USD'
        }
    );

    useEffect(() => {
        const loadTransactions = async () => {
            setTransactionsLoading(true);
            setTransactionsError('');

            try {
                const response = await fetch(
                    `${API_URL}/transaction/history?page=${transactionsPage}&limit=${TRANSACTIONS_PER_PAGE}`,
                    {
                        credentials: 'include'
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    setTransactionsError(
                        data.error || 'Could not load transactions.'
                    );

                    return;
                }

                setTransactions(data.transactions || []);

                setTransactionsPagination(
                    data.pagination || {
                        page: transactionsPage,
                        limit: TRANSACTIONS_PER_PAGE,
                        total: 0,
                        totalPages: 0
                    }
                );

                setTransactionsPageInput(
                    String(data.pagination?.page || transactionsPage)
                );
            } catch (error) {
                setTransactionsError('Could not connect to the API.');

                console.error('Transaction fetch failed:', error);
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

        chatMessagesRef.current.scrollTop =
            chatMessagesRef.current.scrollHeight;
    }, [chatMessages, chatLoading]);

    useLayoutEffect(() => {
        if (
            transactionsLoading ||
            !shouldRestoreScrollRef.current
        ) {
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
    }, [
        transactionsLoading,
        transactions,
        transactionsError
    ]);

    const hasPreviousTransactionsPage =
        transactionsPagination.page > 1;

    const hasNextTransactionsPage =
        transactionsPagination.page <
        transactionsPagination.totalPages;

    const totalTransactionPages = Math.max(
        transactionsPagination.totalPages,
        1
    );

    const preserveScrollForTransactionPageChange = () => {
        shouldRestoreScrollRef.current = true;

        savedScrollPositionRef.current = {
            x: window.scrollX,
            y: window.scrollY
        };
    };

    const formatAmount = (transaction) => {
        const amount = Number(
            transaction.amount || 0
        ).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });

        return transaction.type === 'received'
            ? `+${amount}`
            : `-${amount}`;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) {
            return 'Date unavailable';
        }

        return new Date(timestamp).toLocaleDateString(
            'en-US',
            {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }
        );
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

        setChatMessages((messages) => [
            ...messages,
            userMessage
        ]);

        setChatInput('');
        setChatError('');
        setChatLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/chat`,
                {
                    method: 'POST',
                    credentials: 'include',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        message
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setChatError(
                    data.error || 'Could not send message.'
                );

                return;
            }

            setChatMessages((messages) => [
                ...messages,
                {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content:
                        data.reply ||
                        'I could not create a response.'
                }
            ]);
        } catch (error) {
            setChatError(
                'Could not connect to the chatbot.'
            );

            console.error('Chat request failed:', error);
        } finally {
            setChatLoading(false);
        }
    };

    const handleTransactionPageJump = (event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        const nextPage = Number(
            formData.get('transactionPage')
        );

        if (!Number.isInteger(nextPage)) {
            setTransactionsPageInput(
                String(transactionsPagination.page)
            );

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
                        <p className="eyebrow">
                            Account overview
                        </p>

                        <h1>Dashboard</h1>
                    </div>
                </div>

                <button
                    className="secondary-button"
                    onClick={onLogout}
                    type="button"
                >
                    Logout
                </button>
            </header>

            <section
                className="dashboard-summary"
                aria-label="Account summary"
            >
                <article className="summary-card balance-card">
                    <span>Available balance</span>
                    <strong>{balance}</strong>
                </article>

                <article className="summary-card">
                    <span>Email</span>

                    <strong>
                        {displayUser.email || 'Not loaded'}
                    </strong>
                </article>

                <article className="summary-card">
                    <span>Status</span>

                    <strong>
                        {displayUser.isVerified
                            ? 'Verified'
                            : 'Pending'}
                    </strong>
                </article>
            </section>

            <section className="dashboard-grid">
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <h2>Quick actions</h2>
                    </div>

                    <div className="quick-actions">
                        <button
                            type="button"
                            onClick={onShowTransactions}
                        >
                            Send money
                        </button>

                        <button type="button">
                            Deposit
                        </button>

                        <button type="button">
                            View profile
                        </button>
                    </div>

                    {/* rest of component unchanged */}
                </div>
            </section>
        </main>
    );
}

export default DashboardPage;
