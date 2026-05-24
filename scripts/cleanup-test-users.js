const crypto = require('crypto');
global.crypto = crypto;

require('dotenv').config();

const mongoose = require('mongoose');
const { User, Transaction } = require('../models');

const TEST_EMAILS = [
    'omer-basic-1@gmail.com',
    'friend-basic-1@gmail.com'
];

async function cleanupTestUsers() {
    await mongoose.connect('mongodb://localhost:27017/bank');

    const users = await User.find({ email: { $in: TEST_EMAILS } }).select('_id email');
    const userIds = users.map((user) => user._id);

    const transactionResult = await Transaction.deleteMany({
        $or: [
            { userId: { $in: userIds } },
            { otherParty: { $in: TEST_EMAILS } }
        ]
    });

    const userResult = await User.deleteMany({ email: { $in: TEST_EMAILS } });

    console.log(`Deleted ${userResult.deletedCount} test users`);
    console.log(`Deleted ${transactionResult.deletedCount} test transactions`);

    await mongoose.disconnect();
}

cleanupTestUsers().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
});
