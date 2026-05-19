const { v4: uuidv4 } = require('uuid');
const { processIntent } = require('./intentAgent');
const { matchProviders } = require('./matchingAgent');
const { calculatePrice } = require('./pricingAgent');
const { simulateBooking } = require('./bookingAgent');
const { logTrace, getLogs } = require('../utils/logger');
const { getDb } = require('../db/database');

async function handleServiceRequest(userInput, requestId) {
    logTrace(requestId, 'Orchestrator', 'RequestReceived', { input: userInput });

    try {
        // ── Step 1: Intent Extraction ────────────────────────────────────────
        const intentData = await processIntent(userInput, requestId);

        if (intentData.clarification_needed) {
            logTrace(requestId, 'Orchestrator', 'AwaitingClarification', {
                question: intentData.clarification_question,
                confidenceScore: intentData.confidence_score,
            });
            return {
                status: 'CLARIFICATION_NEEDED',
                message: intentData.clarification_question,
                confidenceScore: intentData.confidence_score,
                requestId,
                logs: getLogs(requestId),
            };
        }

        // ── Step 2: Provider Matching (10-factor) ────────────────────────────
        const matchResult = matchProviders(intentData, requestId);

        if (matchResult.error || !matchResult.topProviders || matchResult.topProviders.length === 0) {
            logTrace(requestId, 'Orchestrator', 'NoProvidersFound', {});
            const alternateSlots = matchResult.alternateSlots || [
                'Tomorrow morning (8:00 AM – 11:00 AM)',
                'Tomorrow afternoon (2:00 PM – 5:00 PM)',
                'Day after tomorrow morning',
            ];
            return {
                status: 'NO_PROVIDERS',
                message: `Sorry, I couldn't find any available providers for ${intentData.service_category} in ${intentData.location_sector} right now.`,
                alternateSlots,
                suggestion: `Would you like to be waitlisted for one of these slots?\n${alternateSlots.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
                requestId,
                logs: getLogs(requestId),
            };
        }

        const selectedProvider = matchResult.topProviders[0];

        // ── Step 3: Dynamic Pricing (with surge + loyalty) ───────────────────
        // Get existing booking count for loyalty discount
        let existingBookingsCount = 0;
        try {
            const db = getDb();
            const res = db.exec("SELECT COUNT(*) as cnt FROM bookings WHERE userId = 'USER-123'");
            if (res.length > 0) existingBookingsCount = res[0].values[0][0];
        } catch (e) { /* silent */ }

        const priceBreakdown = calculatePrice(intentData, selectedProvider, requestId, existingBookingsCount);

        // ── Step 4: Auto-Booking with travel-time buffer ─────────────────────
        const bookingResult = simulateBooking(intentData, selectedProvider, priceBreakdown, requestId);

        if (!bookingResult.success) {
            // Provider was full — offer waitlist
            logTrace(requestId, 'Orchestrator', 'BookingFailed', { reason: bookingResult.error });
            return {
                status: 'WAITLISTED',
                message: bookingResult.error,
                alternateSlots: bookingResult.alternateSlots,
                suggestion: `${selectedProvider.name} is fully booked. Would you like a different slot or provider?`,
                requestId,
                logs: getLogs(requestId),
            };
        }

        logTrace(requestId, 'Orchestrator', 'WorkflowComplete', {
            bookingId: bookingResult.bookingId,
            scheduledTime: bookingResult.scheduledTime,
            finalPrice: priceBreakdown.finalEstimatedPrice,
            surgeActive: priceBreakdown.surgeMultiplier > 1,
            loyaltyApplied: priceBreakdown.loyaltyDiscountPercent > 0,
        });

        return {
            status: 'SUCCESS',
            message: bookingResult.message,
            booking: bookingResult,
            provider: {
                ...selectedProvider,
                factorsUsed: 10,
                allCandidatesEvaluated: matchResult.topProviders.length,
            },
            allMatches: matchResult.topProviders,  // return all top 3 for transparency
            pricing: priceBreakdown,
            intent: intentData,
            requestId,
            logs: getLogs(requestId),
        };

    } catch (error) {
        logTrace(requestId, 'Orchestrator', 'WorkflowFailed', { error: error.message });

        let userMessage = 'Something went wrong while processing your request. Please try again.';
        if (error.message && error.message.startsWith('QUOTA_EXCEEDED')) {
            userMessage = '⚠️ The AI service is temporarily unavailable due to high usage (API quota limit reached). Please wait a few minutes and try again.';
        } else if (error.message && error.message.startsWith('MODEL_NOT_FOUND')) {
            userMessage = '⚠️ Configuration error: The AI model is not available. Please contact support.';
        } else if (error.message && error.message.startsWith('INVALID_API_KEY')) {
            userMessage = '⚠️ Server configuration error: Invalid API key. Please contact support.';
        }

        return {
            status: 'ERROR',
            message: userMessage,
            error: error.message,
            requestId,
            logs: getLogs(requestId),
        };
    }
}

module.exports = { handleServiceRequest };
