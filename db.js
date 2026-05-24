const { User, Transaction } = require('./models');

/* ================== DB LAYER =================== */

const db = {
    // User operations
    user: {
        findByEmail: (email) => User.findOne({ email }),
        findById: (id) => User.findById(id),
        findByEmailVerificationToken: (token) => User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() }
        }),
        create: (data) => User.create(data),
        deleteById: (id) => User.findByIdAndDelete(id),
        removePhoneNumbers: () => User.updateMany(
            { phone: { $exists: true } },
            { $unset: { phone: '' } }
        ),
        dropPhoneIndex: () => User.collection.dropIndex('phone_1'),
        updateBalance: (id, amount) => User.findByIdAndUpdate(
            id,
            { $inc: { balance: amount } },
            { new: true }
        ),
        atomicDeduct: (id, amount) => User.findOneAndUpdate(
            { _id: id, balance: { $gte: amount } },
            { $inc: { balance: -amount } },
            { new: true }
        ),
        verify: (id) => User.findByIdAndUpdate(id, {
            $set: {
                isVerified: true
            },
            $unset: {
                emailVerificationToken: '',
                emailVerificationExpires: '',
                otp: ''
            }
        })
    },

    // Transaction operations
    transaction: {
        create: (data) => Transaction.create(data),
        findByUser: (userId, limit, skip = 0) => Transaction.find({ userId })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit),
        countByUser: (userId) => Transaction.countDocuments({ userId })
    }
};

module.exports = db;
