const OpenAI = require('openai');

/*
 * Groq exposes an OpenAI-compatible API, so the regular OpenAI client can be
 * pointed at Groq's base URL while still using chat.completions.create().
 */
const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
});

module.exports = client;
