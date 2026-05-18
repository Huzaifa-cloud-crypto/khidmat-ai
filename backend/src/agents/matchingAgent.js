const fs = require('fs');
const path = require('path');
const { calculateDistance } = require('../utils/distance');
const { logTrace } = require('../utils/logger');
const sectorsData = require('../data/sectors.json');

const providersPath = path.join(__dirname, '..', 'data', 'providers.json');

function getProviders() {
    return JSON.parse(fs.readFileSync(providersPath, 'utf8'));
}

/**
 * Returns days since a given ISO date string.
 */
function daysSince(dateStr) {
    if (!dateStr) return 90;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function matchProviders(intentData, requestId) {
    logTrace(requestId, 'MatchingAgent', 'StartMatching', {
        category: intentData.service_category,
        location: intentData.location_sector,
        complexity: intentData.complexity,
        urgency: intentData.urgency,
    });

    const allProviders = getProviders();
    const targetSector = sectorsData.sectors.find(s => s.code === intentData.location_sector);

    if (!targetSector) {
        logTrace(requestId, 'MatchingAgent', 'Error', { message: 'Invalid location sector' });
        return { error: 'Location sector not recognized.' };
    }

    // Filter by category
    const categoryProviders = allProviders.filter(p => p.category === intentData.service_category);

    if (categoryProviders.length === 0) {
        // Try finding alternate available slots from other time periods
        const alternateSlots = generateAlternateSlots(intentData.time_preference);
        logTrace(requestId, 'MatchingAgent', 'NoProviders', { alternateSlots });
        return { error: 'No providers found for this category.', alternateSlots };
    }

    // ─── Score each provider using 10 factors ───────────────────────────────
    const rankedProviders = categoryProviders.map(p => {
        const providerSector = sectorsData.sectors.find(s => s.code === p.sector);
        const distance = providerSector
            ? calculateDistance(targetSector.lat, targetSector.lng, providerSector.lat, providerSector.lng)
            : 99;

        let score = 0;
        const reasoning = [];

        // 1. DISTANCE (max 30 pts) — closer is better
        const distanceScore = Math.max(0, 30 - distance * 2);
        score += distanceScore;
        reasoning.push(`+${distanceScore.toFixed(1)} pts distance (${distance.toFixed(1)} km)`);

        // 2. RATING (max 25 pts)
        const ratingScore = (parseFloat(p.rating) / 5) * 25;
        score += ratingScore;
        reasoning.push(`+${ratingScore.toFixed(1)} pts rating (${p.rating}/5)`);

        // 3. RELIABILITY / ON-TIME SCORE (max 20 pts)
        const relScore = (p.reliabilityScore / 100) * 20;
        score += relScore;
        reasoning.push(`+${relScore.toFixed(1)} pts reliability (${p.reliabilityScore}%)`);

        // 4. CANCELLATION RATE PENALTY (up to -15 pts)
        const cancelPenalty = (p.cancellationRate / 15) * 15;
        score -= cancelPenalty;
        if (cancelPenalty > 0) reasoning.push(`-${cancelPenalty.toFixed(1)} pts cancellation rate (${p.cancellationRate}%)`);

        // 5. CAPACITY / AVAILABILITY (max 10 pts)
        const availableCapacity = p.capacity - p.jobsToday;
        const capScore = availableCapacity > 0 ? (availableCapacity / p.capacity) * 10 : 0;
        score += capScore;
        if (capScore > 0) reasoning.push(`+${capScore.toFixed(1)} pts availability`);

        // 6. BUDGET SENSITIVITY (max 10 pts)
        if (intentData.budget_sensitivity === 'high' && p.baseRate < 1000) {
            score += 10;
            reasoning.push(`+10.0 pts budget-friendly rate (Rs.${p.baseRate})`);
        }

        // 7. SPECIALIZATION MATCH (max 15 pts) ← NEW
        const specializations = p.specializations || [p.category];
        const isSpecialized = specializations.includes(intentData.service_category);
        if (isSpecialized) {
            score += 15;
            reasoning.push(`+15.0 pts specialization match (${specializations.join(', ')})`);
        }

        // 8. REVIEW RECENCY (max 10 pts) ← NEW
        const days = daysSince(p.lastReviewDate);
        const recencyScore = days <= 7 ? 10 : days <= 30 ? 7 : days <= 60 ? 4 : 1;
        score += recencyScore;
        reasoning.push(`+${recencyScore.toFixed(1)} pts review recency (${days}d ago)`);

        // 9. RISK SCORE PENALTY (up to -15 pts) ← NEW
        const riskPenalty = p.riskScore ? (p.riskScore / 100) * 15 : 0;
        score -= riskPenalty;
        if (riskPenalty > 0) reasoning.push(`-${riskPenalty.toFixed(1)} pts risk score (${p.riskScore})`);

        // 10. COMPLEXITY FIT (max 10 pts) ← NEW
        //     Complex jobs prefer experienced providers (3+ years, 100+ bookings)
        const complexity = intentData.complexity || 'basic';
        let complexityFit = 0;
        if (complexity === 'complex') {
            if ((p.experienceYears || 0) >= 3 && (p.totalBookings || 0) >= 100) {
                complexityFit = 10;
                reasoning.push(`+10.0 pts complexity fit (${p.experienceYears}yr, ${p.totalBookings} bookings)`);
            } else if ((p.experienceYears || 0) >= 2) {
                complexityFit = 5;
                reasoning.push(`+5.0 pts complexity fit (${p.experienceYears}yr exp)`);
            }
        } else if (complexity === 'intermediate') {
            if ((p.totalBookings || 0) >= 50) {
                complexityFit = 5;
                reasoning.push(`+5.0 pts complexity fit (${p.totalBookings} bookings)`);
            }
        }
        score += complexityFit;

        return {
            ...p,
            distance: distance.toFixed(1),
            matchScore: score.toFixed(1),
            matchReasoning: reasoning,
        };
    });

    // Sort by score descending
    rankedProviders.sort((a, b) => parseFloat(b.matchScore) - parseFloat(a.matchScore));
    const topProviders = rankedProviders.slice(0, 3);

    logTrace(requestId, 'MatchingAgent', 'MatchingComplete', {
        candidatesFound: categoryProviders.length,
        factorsUsed: 10,
        topProvider: topProviders.length > 0 ? topProviders[0].name : null,
        topScore: topProviders.length > 0 ? topProviders[0].matchScore : null,
    });

    return { topProviders };
}

/**
 * Generate alternate time slot suggestions when no provider is available.
 */
function generateAlternateSlots(currentPreference) {
    const slots = [
        'Tomorrow morning (8:00 AM – 11:00 AM)',
        'Tomorrow afternoon (2:00 PM – 5:00 PM)',
        'Day after tomorrow morning (8:00 AM – 11:00 AM)',
        'This weekend (Saturday 10:00 AM)',
    ];
    // Filter out the slot that matches the user's current preference
    return slots.filter(s =>
        !currentPreference || !s.toLowerCase().includes(currentPreference.toLowerCase())
    ).slice(0, 3);
}

module.exports = { matchProviders, generateAlternateSlots };
