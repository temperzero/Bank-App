const express = require('express');
const { requireAuth } = require('../middleware');
const { processChatMessage } = require('../ai/chatService');

function createChatRoutes(io)
{
    const router = express.Router();

    router.post('/', requireAuth, async (req, res) => {
        try
        {
            const { message } = req.body;

            if (!message)
            {
                return res.status(400).json({
                    error: 'Message is required'
                });
            }

            const reply = await processChatMessage(req.user, message, {
                io
            });

            res.json({
                reply
            });
        }
        catch (err)
        {
            console.error(err);

            res.status(err.statusCode || 500).json({
                error: err.publicMessage || 'Chat request failed'
            });
        }
    });

    return router;
}

module.exports = createChatRoutes;
