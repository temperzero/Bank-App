import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionPage from './pages/TransactionPage';
import { io } from 'socket.io-client';

const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:3000';

const readStoredList = (key) => {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (error) {
        console.error(error);
        return [];
    }
};

const writeStoredList = (key, items) => {
    try {
        localStorage.setItem(key, JSON.stringify(items));
    } catch (error) {
        console.error(error);
    }
};

const getNotificationStorageKeys = (userId) => ({
    notifications: `boolean-bank:notifications:${userId}`,
    acknowledged: `boolean-bank:acknowledged-notifications:${userId}`
});

const loadStoredNotifications = (userId) => {
    if (!userId) {
        return [];
    }

    const storageKeys = getNotificationStorageKeys(userId);
    const acknowledgedIds = new Set(readStoredList(storageKeys.acknowledged));

    const storedNotifications = readStoredList(storageKeys.notifications)
        .filter((notification) => !acknowledgedIds.has(notification.id));

    writeStoredList(storageKeys.notifications, storedNotifications);

    return storedNotifications;
};

function App() {
    const [authView, setAuthView] = useState('login');
    const [user, setUser] = useState(null);
    const [latestNotification, setLatestNotification] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    const userId = user?.id;

    const notificationStorageKey = userId
        ? `boolean-bank:notifications:${userId}`
        : '';

    const acknowledgedNotificationStorageKey = userId
        ? `boolean-bank:acknowledged-notifications:${userId}`
        : '';

    useEffect(() => {
        const loadSession = async () => {
            try {
                const response = await fetch(`${API_URL}/user/profile`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    setUser(null);
                    return;
                }

                const data = await response.json();

                setUser(data);
                setNotifications(loadStoredNotifications(data.id));
            } catch (error) {
                console.error(error);
                setUser(null);
                setNotifications([]);
            } finally {
                setIsCheckingSession(false);
            }
        };

        loadSession();
    }, []);

    useEffect(() => {
        if (!userId) {
            return;
        }

        const socket = io(API_URL, {
            withCredentials: true
        });

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection failed:', error.message);
        });

        socket.on('transaction:notification', (notification) => {
            const nextNotification = {
                ...notification,
                id: notification.transaction?._id || String(Date.now()),
                receivedAt: new Date().toISOString()
            };

            setLatestNotification(nextNotification);

            const acknowledgedIds = readStoredList(
                acknowledgedNotificationStorageKey
            );

            if (!acknowledgedIds.includes(nextNotification.id)) {
                setNotifications((currentNotifications) => {
                    const nextNotifications = [
                        nextNotification,
                        ...currentNotifications.filter(
                            (item) => item.id !== nextNotification.id
                        )
                    ].slice(0, 10);

                    writeStoredList(
                        notificationStorageKey,
                        nextNotifications
                    );

                    return nextNotifications;
                });
            }

            if (typeof notification.balance === 'number') {
                setUser((currentUser) =>
                    currentUser
                        ? {
                            ...currentUser,
                            balance: notification.balance
                        }
                        : currentUser
                );
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [
        userId,
        notificationStorageKey,
        acknowledgedNotificationStorageKey
    ]);

    const handleLogin = (nextUser) => {
        setUser(nextUser);
        setNotifications(loadStoredNotifications(nextUser?.id));
    };

    const handleAcknowledgeNotification = (notificationId) => {
        const acknowledgedIds = readStoredList(
            acknowledgedNotificationStorageKey
        );

        const nextAcknowledgedIds = acknowledgedIds.includes(notificationId)
            ? acknowledgedIds
            : [...acknowledgedIds, notificationId];

        writeStoredList(
            acknowledgedNotificationStorageKey,
            nextAcknowledgedIds
        );

        setNotifications((currentNotifications) => {
            const nextNotifications = currentNotifications.filter(
                (notification) => notification.id !== notificationId
            );

            writeStoredList(notificationStorageKey, nextNotifications);

            return nextNotifications;
        });
    };

    const handleLogout = async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error(error);
        }

        setLatestNotification(null);
        setNotifications([]);
        setUser(null);
    };

    const [currentPage, setCurrentPage] = useState('dashboard');

    if (isCheckingSession) {
        return (
            <main className="auth-page">
                <section className="auth-panel" aria-label="Loading session">
                    <div className="auth-card">
                        <p className="form-message">Loading...</p>
                    </div>
                </section>
            </main>
        );
    }

    if (user) {
        if (currentPage === 'transaction') {
            return (
                <TransactionPage
                    user={user}
                    latestNotification={latestNotification}
                    onBack={() => setCurrentPage('dashboard')}
                />
            );
        }

        return (
            <DashboardPage
                user={user}
                latestNotification={latestNotification}
                notifications={notifications}
                onAcknowledgeNotification={handleAcknowledgeNotification}
                onLogout={handleLogout}
                onShowTransactions={() => setCurrentPage('transaction')}
            />
        );
    }

    if (authView === 'register') {
        return (
            <RegisterPage
                onShowLogin={() => setAuthView('login')}
            />
        );
    }

    return (
        <LoginPage
            onLogin={handleLogin}
            onShowRegister={() => setAuthView('register')}
        />
    );
}

export default App;
