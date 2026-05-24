const crypto = require('crypto');
global.crypto = crypto;

require('dotenv').config();

const mongoose = require('mongoose');
const db = require('../db');

async function cleanupPhoneField() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/bank';

    await mongoose.connect(mongoUri);

    try {
        await db.user.dropPhoneIndex();
        console.log('Dropped legacy phone_1 index');
    } catch (error) {
        if (error.codeName === 'IndexNotFound') {
            console.log('Legacy phone_1 index was already removed');
        } else {
            throw error;
        }
    }

    const result = await db.user.removePhoneNumbers();
    console.log(`Removed phone field from ${result.modifiedCount} users`);

    await mongoose.disconnect();
}

cleanupPhoneField().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
});
