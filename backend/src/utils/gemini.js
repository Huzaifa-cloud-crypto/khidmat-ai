const { GoogleGenAI } = require('@google/genai');
const path = require('path');

// Load .env from backend root (works both locally and in Docker where WORKDIR=/usr/src/app)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function getModelName() {
    let modelName = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();
    // Ensure the models/ prefix is present for the new SDK
    if (!modelName.startsWith('models/') && !modelName.startsWith('publishers/')) {
        modelName = `models/${modelName}`;
    }
    return modelName;
}

// Lazy client so the API key is read at call time (not at module load)
function getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('INVALID_API_KEY: GEMINI_API_KEY environment variable is not set.');
    }
    return new GoogleGenAI({ apiKey });
}

async function generateStructuredContent(prompt, schema) {
    try {
        const genAI = getClient();
        const response = await genAI.models.generateContent({
            model: getModelName(),
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        return JSON.parse(response.text);
    } catch (error) {
        console.error("Gemini SDK Error (Structured):", error.message);
        // Re-throw our own typed errors directly
        if (error.message && error.message.startsWith('INVALID_API_KEY')) throw error;
        // Map common API error codes to typed errors
        if (error.message && error.message.includes('429')) {
            throw new Error('QUOTA_EXCEEDED: The AI service has reached its daily request limit. Please try again later.');
        }
        if (error.message && error.message.includes('404')) {
            throw new Error(`MODEL_NOT_FOUND: The model "${getModelName()}" is not available.`);
        }
        if (error.message && (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid'))) {
            throw new Error('INVALID_API_KEY: The Gemini API key is invalid. Please check your GEMINI_API_KEY configuration.');
        }
        throw error;
    }
}

async function generateContent(prompt) {
    try {
        const genAI = getClient();
        const response = await genAI.models.generateContent({
            model: getModelName(),
            contents: prompt
        });
        return response.text;
    } catch (error) {
        console.error("Gemini SDK Error (Text):", error.message);
        throw error;
    }
}

module.exports = { generateStructuredContent, generateContent };
