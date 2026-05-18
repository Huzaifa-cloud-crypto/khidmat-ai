const express = require('express');
const { getLogs } = require('../utils/logger');
const { getProviderWorkload } = require('../agents/workloadAgent');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// GET all providers
router.get('/providers', (req, res) => {
    const providersPath = path.join(__dirname, '..', 'data', 'providers.json');
    const providers = JSON.parse(fs.readFileSync(providersPath, 'utf8'));
    res.json(providers);
});

// GET provider workload optimization report
router.get('/workload', (req, res) => {
    try {
        const report = getProviderWorkload(req.query.requestId);
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate workload report', detail: error.message });
    }
});

// GET agent trace logs for a request
router.get('/logs/:requestId', (req, res) => {
    const logs = getLogs(req.params.requestId);
    res.json(logs);
});

module.exports = router;
