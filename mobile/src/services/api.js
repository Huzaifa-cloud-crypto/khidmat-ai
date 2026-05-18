// IMPORTANT: If running on a physical Android device, change this to your computer's local IP address.
// Example: 'http://192.168.1.15:3000/api'
// If deployed to Cloud Run, use that URL instead.
const API_BASE = 'https://khidmat-ai-514385561723.us-central1.run.app/api';

class ApiService {
    static lastRequestId = null;

    static async sendRequest(userInput, requestId) {
        this.lastRequestId = requestId;
        try {
            const response = await fetch(`${API_BASE}/service/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userInput, requestId })
            });
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            return { status: 'ERROR', message: "Network error. Make sure backend is running and API_BASE is set to your PC's IP." };
        }
    }

    static async getBookings() {
        try {
            const response = await fetch(`${API_BASE}/bookings`);
            return await response.json();
        } catch (error) {
            console.error("Error fetching bookings:", error);
            return [];
        }
    }

    static async getProviders() {
        try {
            const response = await fetch(`${API_BASE}/data/providers`);
            return await response.json();
        } catch (error) {
            console.error("Error fetching providers:", error);
            return [];
        }
    }

    static async getLogs(requestId) {
        if (!requestId) return [];
        try {
            const response = await fetch(`${API_BASE}/data/logs/${requestId}`);
            return await response.json();
        } catch (error) {
            console.error("Error fetching logs:", error);
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
            console.error("Error simulating dispute:", error);
            return { success: false };
        }
    }
}

export default ApiService;
