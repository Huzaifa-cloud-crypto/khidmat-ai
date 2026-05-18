const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/database');
const { logTrace } = require('../utils/logger');

const providersPath = path.join(__dirname, '..', 'data', 'providers.json');

/**
 * Apply a reputation penalty to the provider involved in the dispute.
 * Persists changes to providers.json so future matching reflects the penalty.
 */
function penalizeProvider(bookingId, disputeType) {
    try {
        const db = getDb();
        const rows = db.exec(`SELECT providerId FROM bookings WHERE id = '${bookingId}'`);
        if (!rows.length || !rows[0].values.length) return;
        const providerId = rows[0].values[0][0];

        const providers = JSON.parse(fs.readFileSync(providersPath, 'utf8'));
        const idx = providers.findIndex(p => p.id === providerId);
        if (idx === -1) return;

        const p = providers[idx];
        let reliabilityDelta = 0;
        let cancelRateDelta = 0;

        if (disputeType === 'NO_SHOW') {
            reliabilityDelta = -8;
            cancelRateDelta = +2;
        } else if (disputeType === 'QUALITY_ISSUE') {
            reliabilityDelta = -4;
        } else if (disputeType === 'PRICE_MISMATCH') {
            reliabilityDelta = -2;
        }

        providers[idx].reliabilityScore = Math.min(100, Math.max(0, (p.reliabilityScore || 80) + reliabilityDelta));
        providers[idx].cancellationRate = Math.min(50, Math.max(0, (p.cancellationRate || 0) + cancelRateDelta));
        // Recalculate risk score
        providers[idx].riskScore = Math.min(100, Math.round(
            (providers[idx].cancellationRate * 4) + ((100 - providers[idx].reliabilityScore) * 0.6)
        ));

        fs.writeFileSync(providersPath, JSON.stringify(providers, null, 2));
        return {
            providerId,
            reliabilityScore: providers[idx].reliabilityScore,
            riskScore: providers[idx].riskScore,
            penaltyApplied: reliabilityDelta,
        };
    } catch (e) {
        return { error: e.message };
    }
}

function processDispute(bookingId, disputeType, requestId) {
    logTrace(requestId, 'DisputeAgent', 'DisputeReceived', { bookingId, disputeType });

    const db = getDb();
    let resolution = '';
    let compensationAmount = 0;
    let providerPenalty = null;

    if (disputeType === 'NO_SHOW') {
        resolution = 'Booking cancelled without charge. Provider flagged for reliability review. Rs. 500 credited to your wallet for the inconvenience.';
        compensationAmount = 500;
        providerPenalty = penalizeProvider(bookingId, disputeType);
    } else if (disputeType === 'PRICE_MISMATCH') {
        resolution = 'Disputed amount placed on hold. Escalating to human agent for review of provider final invoice vs. our estimate. Decision within 24 hours.';
        providerPenalty = penalizeProvider(bookingId, disputeType);
    } else if (disputeType === 'QUALITY_ISSUE') {
        resolution = 'Sorry for the poor experience. Issuing a 30% partial refund and assigning a senior supervisor for rework at no additional cost.';
        compensationAmount = -30; // % refund flag
        providerPenalty = penalizeProvider(bookingId, disputeType);
    } else if (disputeType === 'OVERRUN') {
        resolution = 'Job overrun logged. If provider exceeded the quoted time without prior approval, you are not obligated to pay extra. Case escalated for review.';
        providerPenalty = penalizeProvider(bookingId, disputeType);
    } else {
        resolution = 'Dispute logged. Our support team will contact you within 2 hours via WhatsApp.';
    }

    try {
        db.run(
            'INSERT INTO disputes (id, bookingId, reason, resolution, status) VALUES (?, ?, ?, ?, ?)',
            [`DISP-${Date.now()}`, bookingId, disputeType, resolution, 'RESOLVED_AUTO']
        );
        db.run('UPDATE bookings SET status = ? WHERE id = ?', ['DISPUTED', bookingId]);

        logTrace(requestId, 'DisputeAgent', 'DisputeResolved', {
            resolution, compensationAmount, providerPenalty
        });

        return {
            success: true,
            resolution,
            compensationAmount,
            status: 'DISPUTED',
            providerImpact: providerPenalty
                ? `Provider reliability score updated to ${providerPenalty.reliabilityScore}, risk score to ${providerPenalty.riskScore}`
                : 'No penalty applied',
        };
    } catch (e) {
        logTrace(requestId, 'DisputeAgent', 'Error', { error: e.message });
        return { success: false, error: 'Failed to process dispute' };
    }
}

module.exports = { processDispute };
