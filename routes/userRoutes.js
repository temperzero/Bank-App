const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware');
const { createPublicUser } = require('../helpers');

/* ===== USER ROUTES ===== */

router.get('/profile', requireAuth, (req, res) => {
    res.send(createPublicUser(req.user));
});

router.get('/balance', requireAuth, (req, res) => {
    res.send({ balance: req.user.balance });
});

module.exports = router;
