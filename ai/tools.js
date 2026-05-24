/*
 * OpenAI-compatible function tool definitions exposed to the chat model.
 * These schemas describe what the model may ask to do; the real execution
 * happens in toolsExecutor.js.
 */
const tools = [

    {
        type: 'function',

        function: {

            name: 'get_balance',

            description:
                'Get the current available balance for the authenticated user',

            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },

    {
        type: 'function',

        function: {

            name: 'get_recent_transactions',

            description:
                'Get recent transactions for the authenticated user',

            parameters: {
                type: 'object',

                properties: {

                    limit: {
                        type: 'number'
                    }

                }
            }
        }
    },

    {
        type: 'function',

        function: {

            name: 'prepare_transfer',

            description:
                'Validate a requested money transfer and prepare it for explicit user confirmation. This does not send money.',

            parameters: {
                type: 'object',

                properties: {

                    recipientEmail: {
                        type: 'string',
                        description: 'The recipient email address'
                    },

                    amount: {
                        type: 'number',
                        description: 'The transfer amount in USD'
                    }
                },

                required: [
                    'recipientEmail',
                    'amount'
                ]
            }
        }
    },

    {
        type: 'function',

        function: {

            name: 'confirm_transfer',

            description:
                'Execute the currently pending prepared transfer after the user explicitly confirms it.',

            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },

    {
        type: 'function',

        function: {

            name: 'cancel_transfer',

            description:
                'Cancel the currently pending prepared transfer.',

            parameters: {
                type: 'object',
                properties: {}
            }
        }
    }
];

module.exports = { tools };
