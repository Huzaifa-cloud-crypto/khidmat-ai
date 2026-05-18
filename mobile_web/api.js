const API_BASE = '/api';

class ApiService {
    static async sendRequest(userInput, requestId) {
        try {
            const response = await fetch(`${API_BASE}/service/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userInput, requestId })
            });
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            return { status: 'ERROR', message: "Network error. Make sure backend is running." };
        }
    }

    static async getBookings() {
        try {
            const response = await fetch(`${API_BASE}/bookings`);
            return await response.json();
        } catch (error) {
            return [];
        }
    }

    static async getProviders() {
        try {
            const response = await fetch(`${API_BASE}/data/providers`);
            return await response.json();
        } catch (error) {
            return [];
        }
    }

    static async getLogs(requestId) {
        try {
            const response = await fetch(`${API_BASE}/data/logs/${requestId}`);
            return await response.json();
        } catch (error) {
            return [];
        }
    }

    static async simulateDispute(bookingId, type) {
        try {
            const response = await fetch(`${API_BASE}/bookings/${bookingId}/dispute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            return await response.json();
        } catch (error) {
            return { success: false };
        }
    }
}
