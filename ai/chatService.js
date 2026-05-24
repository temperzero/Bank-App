const client = require('./openaiClient');

const {
    Annotation,
    END,
    START,
    StateGraph
} = require('@langchain/langgraph');

const SYSTEM_PROMPT = require('./systemPrompt');

const { tools } = require('./tools');

const {
    executeTool,
    getPendingTransferContext
} = require('./toolsExecutor');

const CHAT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

/*
 * LangGraph stores the conversation as a messages array.
 * The reducer appends new messages from each graph node instead of replacing
 * the previous conversation state.
 */
const ChatState = Annotation.Root({
    messages: Annotation({
        default: () => [],
        reducer: (left, right) => left.concat(right)
    })
});

/**
 * Fails early when the chatbot cannot reach the Groq OpenAI-compatible API.
 */
function assertChatbotConfigured()
{
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey || apiKey === 'your_groq_key_here')
    {
        const error = new Error('GROQ_API_KEY is not configured');

        error.statusCode = 503;
        error.publicMessage = 'Chatbot is not configured. Please set GROQ_API_KEY on the server.';

        throw error;
    }
}

/**
 * Routes the graph after the agent node.
 * Tool calls continue to the tools node; normal assistant messages end the run.
 */
function hasToolCalls(state)
{
    const lastMessage = state.messages[state.messages.length - 1];

    if (lastMessage?.tool_calls?.length)
    {
        return 'tools';
    }

    return END;
}

/**
 * Converts the model's JSON tool-call arguments into a JavaScript object.
 */
function parseToolArguments(toolCall)
{
    const rawArguments = toolCall.function.arguments || '{}';

    return JSON.parse(rawArguments);
}

/**
 * Executes one model-requested tool and formats the result as a tool message
 * that the model can read on the next agent pass.
 */
async function runToolCall(
    toolCall,
    user,
    context
)
{
    const toolName = toolCall.function.name;

    const args = parseToolArguments(toolCall);

    let toolResult;

    try
    {
        toolResult = await executeTool(
            toolName,
            args,
            user,
            context
        );
    }
    catch (error)
    {
        if (!error.publicMessage)
        {
            throw error;
        }

        toolResult = {
            error: error.publicMessage,
            status: 'failed'
        };
    }

    return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult)
    };
}

/**
 * Builds the LangGraph agent loop for one chat request.
 *
 * Flow:
 * START -> agent -> tools -> agent -> END
 *
 * The agent node asks the model what to do next. The tools node executes any
 * requested banking actions, then loops back so the model can produce the final
 * user-facing response.
 */
function createChatGraph(user, context)
{
    /**
     * Calls the chat model with the current conversation state and available
     * OpenAI-style function tools.
     */
    async function callAgent(state)
    {
        const completion =
            await client.chat.completions.create({
                model: CHAT_MODEL,
                messages: state.messages,
                tools
            });

        return {
            messages: [
                completion.choices[0].message
            ]
        };
    }

    /**
     * Runs every tool call requested by the latest assistant message.
     */
    async function callTools(state)
    {
        const lastMessage = state.messages[state.messages.length - 1];

        const toolMessages =
            await Promise.all(
                lastMessage.tool_calls.map((toolCall) =>
                    runToolCall(
                        toolCall,
                        user,
                        context
                    )
                )
            );

        return {
            messages: toolMessages
        };
    }

    return new StateGraph(ChatState)
        .addNode('agent', callAgent)
        .addNode('tools', callTools)
        .addEdge(START, 'agent')
        .addConditionalEdges(
            'agent',
            hasToolCalls
        )
        .addEdge('tools', 'agent')
        .compile();
}

/**
 * Main entry point used by the chat route.
 * Prepares system context, runs the LangGraph agent, and returns the final
 * assistant message content for the frontend chat.
 */
async function processChatMessage(user, message, context = {})
{
    assertChatbotConfigured();

    const systemMessages = [
        {
            role: 'system',
            content: SYSTEM_PROMPT
        },
        {
            role: 'system',
            content: getPendingTransferContext(user)
        }
    ];

    const chatGraph = createChatGraph(user, context);

    const result =
        await chatGraph.invoke(
            {
                messages: [
                    ...systemMessages,
                    {
                        role: 'user',
                        content: message
                    }
                ]
            },
            {
                recursionLimit: 8
            }
        );

    const finalMessage = result.messages[result.messages.length - 1];

    return finalMessage.content;
}

module.exports = { processChatMessage };
