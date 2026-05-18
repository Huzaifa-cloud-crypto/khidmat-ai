const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/database');
const { logTrace } = require('../utils/logger');

const providersPath = path.join(__dirname, '..', 'data', 'providers.json');

/**
 * Update provider's reliability score after a completed job.
 * Good completion → +1 pt (max 100). Poor (dispute) → -3 pts.
 */
function updateProviderReputation(providerId, outcomeType) {
    try {
        const providers = JSON.parse(fs.readFileSync(providersPath, 'utf8'));
        const idx = providers.findIndex(p => p.id === providerId);
        if (idx === -1) return;

        const p = providers[idx];
        let delta = 0;
        if (outcomeType === 'COMPLETED')  delta = +1;
        if (outcomeType === 'NO_SHOW')    delta = -5;
        if (outcomeType === 'QUALITY_ISSUE') delta = -3;

        providers[idx].reliabilityScore = Math.min(100, Math.max(0, (p.reliabilityScore || 80) + delta));
        providers[idx].jobsToday = Math.max(0, (p.jobsToday || 0) + (outcomeType === 'COMPLETED' ? 1 : 0));
        providers[idx].totalBookings = (p.totalBookings || 0) + (outcomeType === 'COMPLETED' ? 1 : 0);

        // Recalculate risk score
        providers[idx].riskScore = Math.min(100, Math.round(
            (providers[idx].cancellationRate * 4) + ((100 - providers[idx].reliabilityScore) * 0.6)
        ));

        fs.writeFileSync(providersPath, JSON.stringify(providers, null, 2));
        return { updated: true, newReliabilityScore: providers[idx].reliabilityScore };
    } catch (e) {
        return { updated: false, error: e.message };
    }
}

function simulateFollowUp(bookingId, newStatus, requestId, options = {}) {
    logTrace(requestId, 'FollowUpAgent', 'StatusUpdateInitiated', { bookingId, newStatus });

    const db = getDb();
    let message = '';
    let serviceChecklist = null;
    let photoEvidencePlaceholder = null;
    let reputationUpdate = null;

    try {
        db.run('UPDATE bookings SET status = ? WHERE id = ?', [newStatus, bookingId]);

        if (newStatus === 'EN_ROUTE') {
            message = '🚗 Provider is on the way! ETA: 15 minutes. Tracking link sent via SMS.';
            logTrace(requestId, 'FollowUpAgent', 'EnRouteUpdate', { eta: '15 minutes' });
        }

        else if (newStatus === 'IN_PROGRESS') {
            message = '🔧 Service has started. Provider is working on-site.';
            serviceChecklist = {
                items: [
                    { step: 1, task: 'Initial diagnosis completed',        done: true  },
                    { step: 2, task: 'Safety check performed',             done: true  },
                    { step: 3, task: 'Repair / service in progress',       done: false },
                    { step: 4, task: 'Parts replaced (if applicable)',     done: false },
                    { step: 5, task: 'Final quality test',                 done: false },
                    { step: 6, task: 'Customer sign-off obtained',         done: false },
                ],
                completedSteps: 2,
                totalSteps: 6,
            };
            logTrace(requestId, 'FollowUpAgent', 'ChecklistInitiated', serviceChecklist);
        }

        else if (newStatus === 'COMPLETED') {
            message = '✅ Service completed successfully! Please rate your experience (1–5 ⭐).';

            // Service completion checklist (all done)
            serviceChecklist = {
                items: [
                    { step: 1, task: 'Initial diagnosis completed',    done: true },
                    { step: 2, task: 'Safety check performed',         done: true },
                    { step: 3, task: 'Repair / service completed',     done: true },
                    { step: 4, task: 'Parts replaced (if applicable)', done: true },
                    { step: 5, task: 'Final quality test passed',      done: true },
                    { step: 6, task: 'Customer sign-off obtained',     done: true },
                ],
                completedSteps: 6,
                totalSteps: 6,
            };

            // Photo/video evidence placeholder
            photoEvidencePlaceholder = {
                beforePhotoUrl: 'https://placehold.co/400x300?text=Before+Service',
                afterPhotoUrl:  'https://placehold.co/400x300?text=After+Service',
                note: 'Photos submitted by provider. Review for quality verification.',
            };

            // Update provider reputation — future matching impact
            const providerId = options.providerId || null;
            if (providerId) {
                reputationUpdate = updateProviderReputation(providerId, 'COMPLETED');
                logTrace(requestId, 'FollowUpAgent', 'ReputationUpdated', reputationUpdate);
            }

            logTrace(requestId, 'FollowUpAgent', 'FeedbackRequested', {
                target: 'User',
                method: 'In-app rating + SMS',
            });
        }

        logTrace(requestId, 'FollowUpAgent', 'StatusUpdated', { newStatus, message });

        return {
            success: true,
            status: newStatus,
            message,
            serviceChecklist,
            photoEvidencePlaceholder,
            reputationUpdate,
            feedbackPrompt: newStatus === 'COMPLETED'
                ? 'How was your experience? Your rating helps us improve provider matching.'
                : null,
        };

    } catch (e) {
        logTrace(requestId, 'FollowUpAgent', 'Error', { error: e.message });
        return { success: false, error: 'Failed to update status' };
    }
}

module.exports = { simulateFollowUp };
