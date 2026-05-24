const db = require('./db');

function createTransferError(message, statusCode = 400)
{
    const error = new Error(message);

    error.statusCode = statusCode;
    error.publicMessage = message;

    return error;
}

function normalizeAmount(amount)
{
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount < 0.01)
    {
        throw createTransferError('Invalid amount');
    }

    return Math.round(numericAmount * 100) / 100;
}

async function validateTransferRequest(sender, recipientEmail, amount)
{
    if (!recipientEmail || amount === undefined)
    {
        throw createTransferError('Missing fields');
    }

    const normalizedRecipientEmail = String(recipientEmail)
        .trim()
        .toLowerCase();

    const numericAmount = normalizeAmount(amount);
    const recipient = await db.user.findByEmail(normalizedRecipientEmail);

    if (!recipient)
    {
        throw createTransferError('Recipient not found');
    }

    if (recipient._id.toString() === sender._id.toString())
    {
        throw createTransferError('Cannot send to yourself');
    }

    const freshSender = await db.user.findById(sender._id);

    if (!freshSender || freshSender.balance < numericAmount)
    {
        throw createTransferError('Insufficient balance');
    }

    return {
        amount: numericAmount,
        recipient,
        recipientEmail: recipient.email,
        sender: freshSender
    };
}

async function executeTransfer(sender, recipientEmail, amount, io)
{
    const transfer = await validateTransferRequest(
        sender,
        recipientEmail,
        amount
    );

    const senderUpdate = await db.user.atomicDeduct(
        sender._id,
        transfer.amount
    );

    if (!senderUpdate)
    {
        throw createTransferError('Insufficient balance');
    }

    const recipientUpdate = await db.user.updateBalance(
        transfer.recipient._id,
        transfer.amount
    );

    const timestamp = new Date().toISOString();

    const sentTransaction = await db.transaction.create({
        userId: sender._id,
        type: 'sent',
        amount: transfer.amount,
        otherParty: transfer.recipient.email,
        timestamp
    });

    const receivedTransaction = await db.transaction.create({
        userId: transfer.recipient._id,
        type: 'received',
        amount: transfer.amount,
        otherParty: sender.email,
        timestamp
    });

    if (io)
    {
        io.to(sender._id.toString()).emit('transaction:notification', {
            message: `You sent $${transfer.amount.toFixed(2)} to ${transfer.recipient.email}.`,
            balance: senderUpdate.balance,
            balanceDelta: -transfer.amount,
            transaction: sentTransaction
        });

        io.to(transfer.recipient._id.toString()).emit('transaction:notification', {
            message: `You received $${transfer.amount.toFixed(2)} from ${sender.email}.`,
            balance: recipientUpdate.balance,
            balanceDelta: transfer.amount,
            transaction: receivedTransaction
        });
    }

    return {
        amount: transfer.amount,
        balance: senderUpdate.balance,
        currency: 'USD',
        recipientEmail: transfer.recipient.email,
        transaction: sentTransaction
    };
}

module.exports = {
    executeTransfer,
    validateTransferRequest
};
