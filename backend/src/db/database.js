const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');
const os = require('os');

let db;

async function initDB() {
    if (db) return db;
    
    const SQL = await initSqlJs();
    const dbPath = path.join(os.tmpdir(), 'khidmat.sqlite');
    
    let dbFile;
    if (fs.existsSync(dbPath)) {
        dbFile = fs.readFileSync(dbPath);
        db = new SQL.Database(dbFile);
    } else {
        db = new SQL.Database();
    }

    // Initialize tables
    db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            userId TEXT,
            providerId TEXT,
            serviceType TEXT,
            location TEXT,
            scheduledTime TEXT,
            status TEXT,
            totalPrice REAL,
            breakdown TEXT,
            providerName TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Ensure providerName column exists for older databases
    try {
        db.run("ALTER TABLE bookings ADD COLUMN providerName TEXT;");
    } catch (e) {
        // Column already exists or other error, ignore
    }

    db.run(`
        CREATE TABLE IF NOT EXISTS booking_logs (
            id TEXT PRIMARY KEY,
            bookingId TEXT,
            agent TEXT,
            action TEXT,
            details TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS disputes (
            id TEXT PRIMARY KEY,
            bookingId TEXT,
            reason TEXT,
            resolution TEXT,
            status TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    saveDb();
    return db;
}

function saveDb() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    const dbPath = path.join(os.tmpdir(), 'khidmat.sqlite');
    fs.writeFileSync(dbPath, buffer);
}

function getDb() {
    if (!db) {
        throw new Error("Database not initialized. Call initDB() first.");
    }
    return db;
}

module.exports = { initDB, getDb, saveDb };
