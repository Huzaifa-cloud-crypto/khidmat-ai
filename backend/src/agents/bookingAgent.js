const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { logTrace } = require('../utils/logger');

/**
 * Converts a time preference string + travel distance into a scheduled time with buffer.
 */
function resolveScheduledTime(timePreference, distanceKm) {
    const travelBufferMins = Math.ceil(parseFloat(distanceKm || 0) * 4); // ~4 min/km
    const bufferStr = travelBufferMins > 0 ? ` (+${travelBufferMins} min travel buffer)` : '';

    const pref = (timePreference || 'As soon as possible').toLowerCase();
    if (pref.includes('morning') || pref.includes('subah')) return `Tomorrow 9:00 AM${bufferStr}`;
    if (pref.includes('afternoon') || pref.includes('dopahar')) return `Tomorrow 2:00 PM${bufferStr}`;
    if (pref.includes('evening') || pref.includes('sham')) return `Tomorrow 5:00 PM${bufferStr}`;
    if (pref.includes('asap') || pref.includes('abhi') || pref.includes('jaldi'))
        return `Today ${new Date().getHours() + 2}:00 (soonest available)`;
    return `${timePreference}${bufferStr}`;
}

/**
 * Get how many bookings a user has (simulated — real app would use userId).
 */
function getUserBookingCount(db) {
    try {
        const result = db.exec("SELECT COUNT(*) as cnt FROM bookings WHERE userId = 'USER-123'");
        if (result.length > 0 && result[0].values.length > 0) {
            return result[0].values[0][0];
        }
    } catch (e) { /* silent */ }
    return 0;
}

function simulateBooking(intentData, provider, priceBreakdown, requestId) {
    logTrace(requestId, 'BookingAgent', 'StartBooking', { providerId: provider.id });

    // ── Capacity / double-booking check ─────────────────────────────────────
    if (provider.capacity <= provider.jobsToday) {
        const waitlistMsg = `Provider ${provider.name} is fully booked. You've been added to the waitlist.`;
        logTrace(requestId, 'BookingAgent', 'AddedToWaitlist', { reason: 'Provider at full capacity' });
        return {
            success: false,
            waitlisted: true,
            error: waitlistMsg,
            alternateSlots: [
                'Tomorrow morning (8:00 AM – 11:00 AM)',
                'Tomorrow afternoon (2:00 PM – 5:00 PM)',
                'Day after tomorrow morning',
            ],
        };
    }

    const bookingId = `BKG-${Math.floor(10000 + Math.random() * 90000)}`;

    // Resolve scheduled time with travel-time buffer
    const scheduledTime = resolveScheduledTime(intentData.time_preference, provider.distance);

    // Simulate SMS/WhatsApp notification content
    const smsNotification = `Khidmat.ai: Booking ${bookingId} confirmed! ${provider.name} will arrive at ${scheduledTime}. Contact: ${provider.phone}. Total: Rs.${priceBreakdown.finalEstimatedPrice}`;

    const db = getDb();

    try {
        const userBookingCount = getUserBookingCount(db);

        db.run(
            `INSERT INTO bookings 
             (id, userId, providerId, providerName, serviceType, location, scheduledTime, status, totalPrice, breakdown)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                bookingId,
                'USER-123',
                provider.id,
                provider.name,
                intentData.service_category,
                intentData.location_sector,
                scheduledTime,
                'CONFIRMED',
                priceBreakdown.finalEstimatedPrice,
                JSON.stringify(priceBreakdown),
            ]
        );

        logTrace(requestId, 'BookingAgent', 'BookingConfirmed', {
            bookingId,
            scheduledTime,
            smsNotificationSimulated: smsNotification,
            userBookingCount: userBookingCount + 1,
        });

        return {
            success: true,
            bookingId,
            providerDetails: {
                name: provider.name,
                phone: provider.phone,
                photoUrl: provider.photoUrl,
                rating: provider.rating,
                reliabilityScore: provider.reliabilityScore,
            },
            scheduledTime,
            status: 'CONFIRMED',
            message: `Booking confirmed with ${provider.name} for ${scheduledTime}.`,
            notifications: {
                sms: smsNotification,
                receipt: {
                    bookingId,
                    service: intentData.service_category,
                    provider: provider.name,
                    location: intentData.location_sector,
                    scheduledTime,
                    totalAmount: priceBreakdown.finalEstimatedPrice,
                    breakdown: priceBreakdown,
                },
            },
            calendarEntry: {
                title: `Khidmat.ai — ${intentData.service_category} service`,
                time: scheduledTime,
                location: intentData.location_sector,
                provider: provider.name,
                notes: `Booking ID: ${bookingId} | Rs. ${priceBreakdown.finalEstimatedPrice}`,
            },
            userBookingCount: userBookingCount + 1,
        };

    } catch (error) {
        logTrace(requestId, 'BookingAgent', 'Error', { error: error.message });
        return { success: false, error: 'Database error during booking.' };
    }
}

module.exports = { simulateBooking };
