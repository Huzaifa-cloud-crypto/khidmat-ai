const { generateStructuredContent } = require('../utils/gemini');
const { logTrace } = require('../utils/logger');
const servicesData = require('../data/services.json');
const sectorsData = require('../data/sectors.json');

const schema = {
    type: "object",
    properties: {
        intent: { type: "string", description: "The main intent, e.g., 'book_service', 'inquiry', 'complaint'" },
        service_category: { type: "string", description: "Matching service category id (e.g., ac-repair, plumbing)" },
        complexity: { type: "string", description: "basic, intermediate, or complex" },
        location_sector: { type: "string", description: "The sector mentioned (e.g., G-13, F-8)" },
        urgency: { type: "string", description: "high, medium, or low" },
        time_preference: { type: "string", description: "When they want the service (e.g., 'tomorrow morning', 'ASAP')" },
        budget_sensitivity: { type: "string", description: "high, medium, low" },
        confidence_score: { type: "number", description: "0.0 to 1.0 confidence in parsing" },
        clarification_needed: { type: "boolean", description: "True if critical information is missing" },
        clarification_question: { type: "string", description: "Question to ask the user if clarification_needed is true" }
    },
    required: ["intent", "confidence_score", "clarification_needed"]
};

async function processIntent(userInput, requestId) {
    logTrace(requestId, 'IntentAgent', 'AnalyzeInput', { userInput });

    const categoriesList = servicesData.categories.map(c => `${c.id} (${c.name})`).join(', ');
    const sectorsList = sectorsData.sectors.map(s => s.code).join(', ');

    const prompt = `
You are the Intent Extraction Agent for Khidmat.ai, a service orchestrator in Islamabad and Karachi.
Analyze the user's input which might be in Urdu, Roman Urdu, English, or mixed.

User Input: "${userInput}"

Extract the following:
1. Identify the service category. Available categories: ${categoriesList}.
2. Determine complexity (basic, intermediate, complex) based on the issue description.
3. Extract location sector. Available sectors: ${sectorsList}.
4. Assess urgency (ASAP/today = high, tomorrow = medium, next week = low).
5. Extract preferred time.
6. Assess budget sensitivity ("zyada nahi", "sasta" = high).

If service category or location is missing/ambiguous, set clarification_needed = true and provide a clarification_question in the same language as the user input.
`;

    try {
        const result = await generateStructuredContent(prompt, schema);
        logTrace(requestId, 'IntentAgent', 'ExtractionComplete', result);
        return result;
    } catch (error) {
        logTrace(requestId, 'IntentAgent', 'Error', { error: error.message });
        throw error; // Propagate original error so orchestrator can detect quota/key issues
    }
}

module.exports = { processIntent };
