import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://khidmat-ai-514385561723.us-central1.run.app/api';
const LOCAL_BOOKINGS_KEY = 'khidmat_local_bookings';

class ApiService {
    static lastRequestId = null;

    // ─── Save a booking to local device storage ─────────────────────────────
    static async saveBookingLocally(booking) {
        try {
            const existing = await AsyncStorage.getItem(LOCAL_BOOKINGS_KEY);
            const bookings = existing ? JSON.parse(existing) : [];
            // Avoid duplicates
            if (!bookings.find(b => b.id === booking.id)) {
                bookings.unshift(booking); // newest first
                await AsyncStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(bookings));
            }
        } catch (e) {
            console.error('Failed to save booking locally:', e.message);
        }
    }

    // ─── Update dispute status in local storage ──────────────────────────────
    static async updateLocalBookingStatus(bookingId, status) {
        try {
            const existing = await AsyncStorage.getItem(LOCAL_BOOKINGS_KEY);
            if (!existing) return;
            const bookings = JSON.parse(existing);
            const idx = bookings.findIndex(b => b.id === bookingId);
            if (idx !== -1) {
                bookings[idx].status = status;
                await AsyncStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(bookings));
            }
        } catch (e) { /* silent */ }
    }

    // ─── Get local bookings ──────────────────────────────────────────────────
    static async getLocalBookings() {
        try {
            const existing = await AsyncStorage.getItem(LOCAL_BOOKINGS_KEY);
            return existing ? JSON.parse(existing) : [];
        } catch (e) {
            return [];
        }
    }

    // ─── Send a service request ──────────────────────────────────────────────
    static async sendRequest(userInput, requestId) {
        this.lastRequestId = requestId;
        try {
            const response = await fetch(`${API_BASE}/service/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userInput, requestId })
            });
            const data = await response.json();

            // ── If booking succeeded, cache it locally so it always appears ──
            if (data.status === 'SUCCESS' && data.booking?.bookingId) {
                const b = data.booking;
                const localBooking = {
                    id: b.bookingId,
                    serviceType: data.intent?.service_category || 'service',
                    providerName: b.providerDetails?.name || data.provider?.name || 'Provider',
                    providerPhone: b.providerDetails?.phone || data.provider?.phone || '',
                    scheduledTime: b.scheduledTime,
                    totalPrice: data.pricing?.finalEstimatedPrice || 0,
                    status: 'CONFIRMED',
                    location: data.intent?.location_sector || '',
                    createdAt: new Date().toISOString(),
                    pricing: data.pricing,
                    matchReasoning: data.provider?.matchReasoning || [],
                };
                await ApiService.saveBookingLocally(localBooking);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            return { status: 'ERROR', message: 'Network error. Check your connection.' };
        }
    }

    // ─── Get bookings (local-first, merge with server) ───────────────────────
    static async getBookings() {
        // Always load local bookings first — guaranteed to work
        const localBookings = await ApiService.getLocalBookings();

        try {
            const response = await fetch(`${API_BASE}/bookings`);
            const serverBookings = await response.json();

            // Merge: server bookings take priority (they have updated status)
            // but local-only ones (not on server yet) are included too
            const serverIds = new Set(serverBookings.map(b => b.id));
            const localOnly = localBookings.filter(b => !serverIds.has(b.id));
            return [...serverBookings, ...localOnly];
        } catch (error) {
            // Server unavailable — return local cache
            console.log('Server unavailable, showing local bookings');
            return localBookings;
        }
    }

    // ─── Providers ───────────────────────────────────────────────────────────
    static async getProviders() {
        try {
            const response = await fetch(`${API_BASE}/data/providers`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching providers:', error);
            return [];
        }
    }

    // ─── Agent logs ──────────────────────────────────────────────────────────
    static async getLogs(requestId) {
        if (!requestId) return [];
        try {
            const response = await fetch(`${API_BASE}/data/logs/${requestId}`);
            return await response.json();
        } catch (error) {
            return [];
        }
    }

    // ─── Raise a dispute ────────────────────────────────────────────────────
    static async simulateDispute(bookingId, type) {
        try {
            const response = await fetch(`${API_BASE}/bookings/${bookingId}/dispute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            const data = await response.json();
            // Update local status too
            if (data.success) {
                await ApiService.updateLocalBookingStatus(bookingId, 'DISPUTED');
            }
            return data;
        } catch (error) {
            console.error('Error simulating dispute:', error);
            return { success: false, error: 'Network error' };
        }
    }
}

export default ApiService;
