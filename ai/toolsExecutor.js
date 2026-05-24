const db = require('../db');
const {
    executeTransfer,
    validateTransferRequest
} = require('../transactionService');

const PENDING_TRANSFER_TTL_MS = 5 * 60 * 1000;
const pendingTransfers = new Map();

/**
 * Formats numeric amounts for user-facing transaction and balance responses.
 */
function formatCurrency(amount)
{
    return Number(amount || 0).toLocaleString('en-US', {
        currency: 'USD',
        style: 'currency'
    });
}

/**
 * Converts stored transaction timestamps into short display dates.
 */
function formatTransactionDate(timestamp)
{
    if (!timestamp)
    {
        return 'Date unavailable';
    }

    return new Date(timestamp).toLocaleString('en-US', {
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Reduces a raw transaction record to the safe, formatted fields the model is
 * allowed to show to the user.
 */
function formatTransaction(transaction)
{
    const isReceived = transaction.type === 'received';

    return {
        amount: formatCurrency(transaction.amount),
        date: formatTransactionDate(transaction.timestamp),
        description: isReceived
            ? `Received ${formatCurrency(transaction.amount)} from ${transaction.otherParty}`
            : `Sent ${formatCurrency(transaction.amount)} to ${transaction.otherParty}`,
        direction: isReceived ? 'received' : 'sent',
        otherParty: transaction.otherParty
    };
}

/**
 * Creates the in-memory pending-transfer key for the authenticated user.
 */
function getUserKey(user)
{
    return user._id.toString();
}

/**
 * Reads the pending transfer for a user and clears it if the confirmation
 * window has expired.
 */
function getPendingTransfer(user)
{
    const userKey = getUserKey(user);
    const pendingTransfer = pendingTransfers.get(userKey);

    if (!pendingTransfer)
    {
        return null;
    }

    if (pendingTransfer.expiresAt <= Date.now())
    {
        pendingTransfers.delete(userKey);
        return null;
    }

    return pendingTransfer;
}

/**
 * Builds a system-message snippet that tells the model whether a transfer is
 * waiting for explicit confirmation.
 */
function getPendingTransferContext(user)
{
    const pendingTransfer = getPendingTransfer(user);

    if (!pendingTransfer)
    {
        return 'No transfer is waiting for confirmation.';
    }

    return [
        'A transfer is waiting for confirmation:',
        `- Amount: $${pendingTransfer.amount.toFixed(2)} USD`,
        `- Recipient: ${pendingTransfer.recipientEmail}`,
        'Only call confirm_transfer if the user explicitly confirms this transfer.',
        'Call cancel_transfer if the user rejects it.'
    ].join('\n');
}

/**
 * Validates a requested transfer and stores it as pending.
 * No money is moved here; confirmTransfer performs the actual transfer later.
 */
async function prepareTransfer(args, user)
{
    const transfer = await validateTransferRequest(
        user,
        args.recipientEmail,
        args.amount
    );

    const pendingTransfer = {
        amount: transfer.amount,
        createdAt: Date.now(),
        expiresAt: Date.now() + PENDING_TRANSFER_TTL_MS,
        recipientEmail: transfer.recipientEmail
    };

    pendingTransfers.set(getUserKey(user), pendingTransfer);

    return {
        amount: pendingTransfer.amount,
        currency: 'USD',
        expiresAt: new Date(pendingTransfer.expiresAt).toISOString(),
        recipientEmail: pendingTransfer.recipientEmail,
        requiresConfirmation: true,
        status: 'pending_confirmation'
    };
}

/**
 * Executes the currently pending transfer after the user confirms it.
 */
async function confirmTransfer(user, context)
{
    const pendingTransfer = getPendingTransfer(user);

    if (!pendingTransfer)
    {
        return {
            status: 'no_pending_transfer'
        };
    }

    const result = await executeTransfer(
        user,
        pendingTransfer.recipientEmail,
        pendingTransfer.amount,
        context?.io
    );

    pendingTransfers.delete(getUserKey(user));

    return {
        amount: result.amount,
        balance: result.balance,
        currency: result.currency,
        recipientEmail: result.recipientEmail,
        status: 'completed',
        transactionId: result.transaction._id
    };
}

/**
 * Cancels and clears the currently pending transfer for the user.
 */
function cancelTransfer(user)
{
    const pendingTransfer = getPendingTransfer(user);

    pendingTransfers.delete(getUserKey(user));

    if (!pendingTransfer)
    {
        return {
            status: 'no_pending_transfer'
        };
    }

    return {
        amount: pendingTransfer.amount,
        currency: 'USD',
        recipientEmail: pendingTransfer.recipientEmail,
        status: 'cancelled'
    };
}

/**
 * Dispatches a model-requested tool name to the matching banking operation.
 */
async function executeTool(
    toolName,
    args,
    user,
    context = {}
)
{
    switch (toolName)
    {
        case 'get_balance':

            return {
                balance: user.balance,
                currency: 'USD'
            };

        case 'get_recent_transactions':

            return (await db.transaction.findByUser(
                user._id,
                args.limit || 5
            )).map(formatTransaction);

        case 'prepare_transfer':

            return await prepareTransfer(args, user);

        case 'confirm_transfer':

            return await confirmTransfer(user, context);

        case 'cancel_transfer':

            return cancelTransfer(user);

        default:
            throw new Error('Unknown tool');
    }
}

module.exports = {
    executeTool,
    getPendingTransferContext
};
