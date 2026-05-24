const cors = require('cors');

const crypto = require('crypto');
global.crypto = crypto;

require('dotenv').config();

const cookieParser = require('cookie-parser');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const chatRoutes = require('./routes/chatRoutes');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    throw new Error('Missing MONGO_URI environment variable');
}

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174'
];

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    }
});

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());

/* ================== SOCKET IO =================== */

function parseCookies(cookieHeader = '') {
    return cookieHeader.split(';').reduce((cookies, cookie) => {
        const [name, ...valueParts] = cookie.trim().split('=');

        if (!name) {
            return cookies;
        }

        cookies[name] = decodeURIComponent(valueParts.join('='));

        return cookies;
    }, {});
}

io.use(async (socket, next) => {
    try {
        const cookies = parseCookies(socket.handshake.headers.cookie);
        const token = cookies.token;

        if (!token) {
            return next(new Error('Unauthorized'));
        }

        const payload = jwt.verify(token, JWT_SECRET);
        const user = await db.user.findById(payload.sub);

        if (!user) {
            return next(new Error('Unauthorized'));
        }

        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Unauthorized'));
    }
});

io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    socket.join(userId);

    console.log('User connected:', userId, socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', userId, socket.id);
    });
});


/* ================== CONFIG =================== */

if (!JWT_SECRET) {
    throw new Error('Missing JWT_SECRET environment variable');
}

async function removeLegacyPhoneField() {
    try {
        await db.user.dropPhoneIndex();
    } catch (error) {
        if (error.codeName !== 'IndexNotFound') {
            throw error;
        }
    }

    await db.user.removePhoneNumbers();
}

/* ================== DB =================== */

async function startServer() {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    try {
        await removeLegacyPhoneField();
    } catch (error) {
        console.error('Failed to remove legacy phone data:', error);
    }

    /* ================== RUN =================== */

    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

/* ================== ROUTES =================== */

// Health
app.get('/', (req, res) => {
    res.send('Bank API is running');
});

// Mount routers
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/transaction', transactionRoutes(io));
app.use('/chat', chatRoutes(io));

app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).send({
        error: 'Internal server error'
    });
});

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
