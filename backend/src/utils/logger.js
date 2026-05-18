const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const logs = new Map(); // Store logs in memory for the active session

function getLogs(requestId) {
    return logs.get(requestId) || [];
}

function logTrace(requestId, agent, action, details) {
    if (!logs.has(requestId)) {
        logs.set(requestId, []);
    }
    
    const logEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        agent,
        action,
        details
    };
    
    logs.get(requestId).push(logEntry);
    console.log(`[${agent}] ${action}:`, details);

    // Persist to DB if initialized
    try {
        const db = getDb();
        db.run(
            'INSERT INTO booking_logs (id, bookingId, agent, action, details) VALUES (?, ?, ?, ?, ?)',
            [logEntry.id, requestId, agent, action, JSON.stringify(details)]
        );
    } catch (e) {
        // DB might not be initialized yet or this is a transient request
    }
    
    return logEntry;
}

module.exports = { logTrace, getLogs };
