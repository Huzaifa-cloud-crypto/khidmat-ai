const { GoogleGenAI } = require('@google/genai');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Model priority list — tries each in order if previous fails with 503
const MODEL_FALLBACKS = [
    process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
];

function normalizeModel(name) {
    name = (name || '').trim();
    if (!name.startsWith('models/') && !name.startsWith('publishers/')) {
        name = `models/${name}`;
    }
    return name;
}

function getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('INVALID_API_KEY: GEMINI_API_KEY environment variable is not set.');
    }
    return new GoogleGenAI({ apiKey });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Try a Gemini call with automatic retry + model fallback.
 * - Retries up to 2 times on 503 with 2s delay
 * - Falls back to next model if still failing
 */
async function withRetry(callFn, modelList = MODEL_FALLBACKS) {
    let lastError;
    for (const model of modelList) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                return await callFn(normalizeModel(model));
            } catch (error) {
                lastError = error;
                const msg = error.message || '';
                const is503 = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand');
                const is429 = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');

                if (is503) {
                    console.warn(`[Gemini] 503 on ${model} attempt ${attempt}. Retrying in 2s...`);
                    await sleep(2000);
                    continue; // retry same model
                }
                if (is429) {
                    console.warn(`[Gemini] 429 quota on ${model}. Trying next model...`);
                    break; // skip to next model
                }
                // For other errors, don't retry
                throw error;
            }
        }
        console.warn(`[Gemini] Falling back from ${model} to next option...`);
    }
    throw lastError;
}

async function generateStructuredContent(prompt, schema) {
    try {
        const genAI = getClient();

        return await withRetry(async (model) => {
            const response = await genAI.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                },
            });
            return JSON.parse(response.text);
        });

    } catch (error) {
        const msg = error.message || '';
        if (msg.startsWith('INVALID_API_KEY')) throw error;
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
            throw new Error('QUOTA_EXCEEDED: The AI service has reached its request limit. Please wait a moment and try again.');
        }
        if (msg.includes('404')) {
            throw new Error('MODEL_NOT_FOUND: The AI model is not available.');
        }
        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
            throw new Error('INVALID_API_KEY: The Gemini API key is invalid.');
        }
        if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
            throw new Error('QUOTA_EXCEEDED: Gemini is experiencing high demand. Please try again in a moment.');
        }
        throw error;
    }
}

async function generateContent(prompt) {
    try {
        const genAI = getClient();

        return await withRetry(async (model) => {
            const response = await genAI.models.generateContent({
                model,
                contents: prompt,
            });
            return response.text;
        });

    } catch (error) {
        console.error('Gemini SDK Error (Text):', error.message);
        throw error;
    }
}

module.exports = { generateStructuredContent, generateContent };
