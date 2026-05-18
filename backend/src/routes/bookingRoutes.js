const express = require('express');
const { getDb } = require('../db/database');
const { processDispute } = require('../agents/disputeAgent');
const { simulateFollowUp } = require('../agents/followUpAgent');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET all bookings
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const bookings = db.exec('SELECT * FROM bookings ORDER BY createdAt DESC');

        if (bookings.length === 0) return res.json([]);

        const cols = bookings[0].columns;
        const result = bookings[0].values.map(row => {
            const obj = {};
            cols.forEach((col, i) => obj[col] = row[i]);
            try { obj.breakdown = JSON.parse(obj.breakdown); } catch (e) {}
            return obj;
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// POST update booking status (EN_ROUTE, IN_PROGRESS, COMPLETED)
router.post('/:id/status', (req, res) => {
    const { status, requestId = uuidv4(), providerId } = req.body;

    // Look up providerId from DB if not provided
    let resolvedProviderId = providerId;
    if (!resolvedProviderId) {
        try {
            const db = getDb();
            const rows = db.exec(`SELECT providerId FROM bookings WHERE id = '${req.params.id}'`);
            if (rows.length > 0 && rows[0].values.length > 0) {
                resolvedProviderId = rows[0].values[0][0];
            }
        } catch (e) { /* silent */ }
    }

    const result = simulateFollowUp(req.params.id, status, requestId, { providerId: resolvedProviderId });
    res.json(result);
});

// POST raise a dispute
router.post('/:id/dispute', (req, res) => {
    const { type, requestId = uuidv4() } = req.body; // NO_SHOW, PRICE_MISMATCH, QUALITY_ISSUE
    const result = processDispute(req.params.id, type, requestId);
    res.json(result);
});

module.exports = router;
