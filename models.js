const mongoose = require('mongoose');
const Joi = require('joi');

/* ================== SCHEMAS =================== */

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 3
    },
    balance: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    isVerified: {
        type: Boolean,
        required: true,
        default: false
    },
    otp: {
        type: String,
        minlength: 6,
        maxlength: 6
    },
    emailVerificationToken: {
        type: String,
        index: true
    },
    emailVerificationExpires: {
        type: Date
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now,
        immutable: true
    }
});

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: ['sent', 'received']
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    otherParty: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
        immutable: true
    }
});

const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

/* ================== VALIDATION SCHEMAS =================== */

const signupValidation = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(3).required()
});

module.exports = {
    User,
    Transaction,
    signupValidation
};
