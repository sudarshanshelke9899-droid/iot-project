const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'torrent.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log(`✅ Connected to SQLite database at: ${dbPath}`);
  }
});

// Promisified DB helpers
const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

// Initialize schema
const initDB = async () => {
  try {
    // 1. Users table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. DHT11 Sensor records
    await dbRun(`
      CREATE TABLE IF NOT EXISTS dht_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        temperature REAL NOT NULL,
        humidity REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Device state (LED, LCD lines, device heartbeat)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS device_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        led_state INTEGER DEFAULT 0,
        lcd_line1 TEXT DEFAULT 'Torrent IoT',
        lcd_line2 TEXT DEFAULT 'Dept. of EE GCOEY',
        last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed initial device state row if not present
    const existingState = await dbGet('SELECT * FROM device_state WHERE id = 1');
    if (!existingState) {
      await dbRun(`
        INSERT INTO device_state (id, led_state, lcd_line1, lcd_line2, last_heartbeat, updated_at)
        VALUES (1, 0, 'Torrent IoT', 'Dept. of EE GCOEY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      console.log('ℹ️ Initialized default device state.');
    }

    console.log('✅ SQLite Database schema initialized successfully.');
  } catch (error) {
    console.error('❌ Error initializing database schema:', error);
  }
};

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initDB
};
