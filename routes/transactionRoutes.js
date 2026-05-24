const express = require('express');
const { requireAuth } = require('../middleware');
const db = require('../db');
const { executeTransfer } = require('../transactionService');

/* ===== TRANSACTION ROUTES ===== */

function createTransactionRoutes(io) {
    const router = express.Router();

    // Send money
    router.post('/send', requireAuth, async (req, res) => {
        try {
            const { recipientEmail, amount } = req.body;
            const result = await executeTransfer(req.user, recipientEmail, amount, io);

            res.send(result.transaction);
        } catch (error) {
            res.status(error.statusCode || 500).send({
                error: error.publicMessage || 'Transaction failed'
            });
        }
    });

    // History
    router.get('/history', requireAuth, async (req, res) => {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 10);

        if (!Number.isInteger(page) || page < 1) {
            return res.status(400).send({ error: 'Invalid page' });
        }

        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
            return res.status(400).send({ error: 'Invalid limit' });
        }

        const skip = (page - 1) * limit;

        const [userTransactions, total] = await Promise.all([
            db.transaction.findByUser(req.user._id, limit, skip),
            db.transaction.countByUser(req.user._id)
        ]);

        res.send({
            transactions: userTransactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    });

    return router;
}

module.exports = createTransactionRoutes;
