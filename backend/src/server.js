require('dotenv').config();
const app = require('./app');
const { initDB } = require('./db/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await initDB();
        console.log("Database initialized successfully.");
        
        app.listen(PORT, () => {
            console.log(`Khidmat.ai Backend Orchestrator running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();
