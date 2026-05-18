const { logTrace } = require('../utils/logger');
const servicesData = require('../data/services.json');

/**
 * Returns the current hour-based surge multiplier.
 * Peak hours (8-10 AM, 6-9 PM) get 1.2x; off-peak gets 0.9x.
 */
function getSurgeMultiplier() {
    const hour = new Date().getHours(); // PKT = UTC+5 (Cloud Run returns UTC)
    const pktHour = (hour + 5) % 24;

    if ((pktHour >= 8 && pktHour <= 10) || (pktHour >= 18 && pktHour <= 21)) {
        return { multiplier: 1.2, label: 'Peak hours surge (+20%)' };
    }
    if (pktHour >= 12 && pktHour <= 15) {
        return { multiplier: 0.9, label: 'Off-peak discount (-10%)' };
    }
    return { multiplier: 1.0, label: 'Standard rate' };
}

/**
 * Simulate loyalty discount based on total bookings count in DB.
 * After 3+ bookings, apply 5% discount. After 10+, apply 10%.
 */
function getLoyaltyDiscount(bookingCount = 0) {
    if (bookingCount >= 10) return { percent: 10, label: 'Loyal customer discount (10 bookings)' };
    if (bookingCount >= 3)  return { percent: 5,  label: 'Returning customer discount (3+ bookings)' };
    return { percent: 0, label: null };
}

function calculatePrice(intentData, provider, requestId, existingBookingsCount = 0) {
    logTrace(requestId, 'PricingAgent', 'StartPricing', { providerId: provider.id });

    const serviceCategory = servicesData.categories.find(c => c.id === intentData.service_category);
    if (!serviceCategory) {
        throw new Error('Invalid service category for pricing');
    }

    const complexity = intentData.complexity || 'basic';
    const serviceDetails = serviceCategory.complexity[complexity];

    // ── Base components ──────────────────────────────────────────────────────
    const baseRate = provider.baseRate || serviceDetails.basePrice;

    // Complexity multiplier
    let complexityMultiplier = 1.0;
    if (complexity === 'intermediate') complexityMultiplier = 1.5;
    if (complexity === 'complex')      complexityMultiplier = 2.5;

    // Urgency premium
    let urgencyPremium = 0;
    if (intentData.urgency === 'high')   urgencyPremium = 500;
    if (intentData.urgency === 'medium') urgencyPremium = 200;

    // Distance surcharge
    const distanceKm = parseFloat(provider.distance) || 0;
    const distanceCost = distanceKm > 5 ? Math.round((distanceKm - 5) * 50) : 0;

    // Sub-total before surge/discount
    let subTotal = (baseRate * complexityMultiplier) + urgencyPremium + distanceCost;

    // ── Surge pricing ────────────────────────────────────────────────────────
    const surge = getSurgeMultiplier();
    const surgeAmount = Math.round(subTotal * (surge.multiplier - 1));
    subTotal = Math.round(subTotal * surge.multiplier);

    // ── Loyalty discount ─────────────────────────────────────────────────────
    const loyalty = getLoyaltyDiscount(existingBookingsCount);
    const loyaltyDiscount = Math.round(subTotal * (loyalty.percent / 100));
    const finalEstimatedPrice = Math.round(subTotal - loyaltyDiscount);

    // ── Budget-sensitive alternative ─────────────────────────────────────────
    let budgetAlternative = null;
    if (intentData.budget_sensitivity === 'high') {
        const altPrice = Math.round(baseRate * 1.0 + distanceCost); // no complexity or urgency premium
        budgetAlternative = {
            description: 'Basic plan (standard visit, no urgency premium)',
            estimatedPrice: altPrice,
            note: 'Technician assesses on-site; complex repairs billed separately',
        };
    }

    const partsEstimate = complexity === 'complex'
        ? 'Parts cost additional (est. Rs. 1,000–5,000)'
        : 'Usually no major parts needed';

    const breakdown = {
        baseRate,
        complexityMultiplier,
        urgencyPremium,
        distanceCost,
        surgeMultiplier: surge.multiplier,
        surgeAmount,
        surgeLabel: surge.label,
        loyaltyDiscountPercent: loyalty.percent,
        loyaltyDiscountAmount: loyaltyDiscount,
        loyaltyLabel: loyalty.label,
        subTotalBeforeDiscount: subTotal,
        finalEstimatedPrice,
        partsEstimate,
        budgetAlternative,
    };

    logTrace(requestId, 'PricingAgent', 'PricingComplete', breakdown);
    return breakdown;
}

module.exports = { calculatePrice };
