const jwt = require('jsonwebtoken');

/* ================== HELPERS =================== */

function createToken(user) {
    return jwt.sign(
        {
            sub: user._id,
            email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

const createPublicUser = (user) => ({
    id: user._id,
    email: user.email,
    balance: user.balance,
    isVerified: user.isVerified,
    createdAt: user.createdAt
});

module.exports = {
    createToken,
    createPublicUser
};
