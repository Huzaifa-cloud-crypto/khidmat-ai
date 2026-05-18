const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { handleServiceRequest } = require('../agents/orchestrator');

const router = express.Router();

router.post('/request', async (req, res) => {
    try {
        const { userInput, requestId = uuidv4() } = req.body;
        
        if (!userInput) {
            return res.status(400).json({ error: "userInput is required" });
        }

        const result = await handleServiceRequest(userInput, requestId);
        res.json(result);
    } catch (error) {
        console.error("Service request error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
