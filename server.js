require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbRun, dbGet, dbAll, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'torrent_iot_super_secret_jwt_key_2026';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Format Date & Time in Asia/Kolkata (UTC+05:30)
const formatKolkataTime = (isoString) => {
  const date = isoString ? new Date(isoString + (isoString.endsWith('Z') ? '' : 'Z')) : new Date();
  
  // Format options for Asia/Kolkata
  const timeFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return {
    time: timeFormatter.format(date),
    date: dateFormatter.format(date),
    raw: date.toISOString()
  };
};

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

// ========================
// Authentication Routes
// ========================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await dbRun(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), passwordHash]
    );

    const token = jwt.sign(
      { id: result.id, name: name.trim(), email: email.toLowerCase().trim() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: { id: result.id, name: name.trim(), email: email.toLowerCase().trim() }
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user profile.' });
  }
});

// ======================================
// IoT Device Endpoints (ESP8266 & Web)
// ======================================

// POST /api/device/telemetry
// Used by ESP8266 every 10 seconds to submit DHT11 readings.
// In return, the server provides the current LED state and LCD lines so the ESP8266 stays synchronized!
app.post('/api/device/telemetry', async (req, res) => {
  try {
    const { temperature, humidity } = req.body;

    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({ error: 'Temperature and humidity values are required.' });
    }

    const tempNum = parseFloat(temperature);
    const humNum = parseFloat(humidity);

    if (isNaN(tempNum) || isNaN(humNum)) {
      return res.status(400).json({ error: 'Invalid numeric format for sensor readings.' });
    }

    // Insert reading into dht_records
    await dbRun(
      'INSERT INTO dht_records (temperature, humidity, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [tempNum, humNum]
    );

    // Update device heartbeat and fetch current commands
    await dbRun('UPDATE device_state SET last_heartbeat = CURRENT_TIMESTAMP WHERE id = 1');
    const state = await dbGet('SELECT led_state, lcd_line1, lcd_line2 FROM device_state WHERE id = 1');

    res.status(201).json({
      success: true,
      message: 'Telemetry recorded successfully',
      led_state: state ? state.led_state : 0,
      lcd_line1: state ? state.lcd_line1 : 'Torrent IoT',
      lcd_line2: state ? state.lcd_line2 : 'Dept EE GCOEY'
    });
  } catch (error) {
    console.error('Error recording telemetry:', error);
    res.status(500).json({ error: 'Internal server error while recording telemetry.' });
  }
});

// GET /api/device/state
// Get current hardware state, heartbeat, and latest sensor metrics
app.get('/api/device/state', async (req, res) => {
  try {
    const state = await dbGet('SELECT * FROM device_state WHERE id = 1');
    const latestDHT = await dbGet('SELECT * FROM dht_records ORDER BY id DESC LIMIT 1');

    // Calculate online status (heartbeat within 35 seconds considering 10-second polling)
    let isOnline = false;
    if (state && state.last_heartbeat) {
      const lastHbTime = new Date(state.last_heartbeat + 'Z').getTime();
      const now = Date.now();
      isOnline = (now - lastHbTime) < 35000;
    }

    let formattedDHT = null;
    if (latestDHT) {
      const formattedTime = formatKolkataTime(latestDHT.created_at);
      formattedDHT = {
        id: latestDHT.id,
        temperature: latestDHT.temperature,
        humidity: latestDHT.humidity,
        time: formattedTime.time,
        date: formattedTime.date,
        rawTime: latestDHT.created_at
      };
    }

    res.json({
      online: isOnline,
      last_heartbeat: state ? state.last_heartbeat : null,
      led_state: state ? state.led_state : 0,
      lcd_line1: state ? state.lcd_line1 : 'Torrent IoT',
      lcd_line2: state ? state.lcd_line2 : 'Dept EE GCOEY',
      latest_dht: formattedDHT
    });
  } catch (error) {
    console.error('Error fetching device state:', error);
    res.status(500).json({ error: 'Failed to fetch device status.' });
  }
});

// POST /api/device/led
// Toggle LED ON/OFF from the Web Dashboard
app.post('/api/device/led', authenticateToken, async (req, res) => {
  try {
    const { state } = req.body;
    const ledVal = (state === 1 || state === true || state === '1' || state === 'true') ? 1 : 0;

    await dbRun(
      'UPDATE device_state SET led_state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [ledVal]
    );

    res.json({
      success: true,
      led_state: ledVal,
      message: `LED switched ${ledVal === 1 ? 'ON' : 'OFF'}`
    });
  } catch (error) {
    console.error('Error updating LED state:', error);
    res.status(500).json({ error: 'Failed to update LED state.' });
  }
});

// POST /api/device/lcd
// Update Smart LCD 16x2 text lines from the Web Dashboard
app.post('/api/device/lcd', authenticateToken, async (req, res) => {
  try {
    let { line1, line2 } = req.body;

    line1 = (line1 !== undefined && line1 !== null) ? String(line1).slice(0, 16) : '';
    line2 = (line2 !== undefined && line2 !== null) ? String(line2).slice(0, 16) : '';

    await dbRun(
      'UPDATE device_state SET lcd_line1 = ?, lcd_line2 = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [line1, line2]
    );

    res.json({
      success: true,
      lcd_line1: line1,
      lcd_line2: line2,
      message: 'LCD text updated successfully'
    });
  } catch (error) {
    console.error('Error updating LCD text:', error);
    res.status(500).json({ error: 'Failed to update LCD display.' });
  }
});

// ======================================
// Sensor Data (DHT11) & History Routes
// ======================================

// GET /api/dht/latest
app.get('/api/dht/latest', async (req, res) => {
  try {
    const latest = await dbGet('SELECT * FROM dht_records ORDER BY id DESC LIMIT 1');
    if (!latest) {
      return res.json({ record: null });
    }

    const { time, date } = formatKolkataTime(latest.created_at);
    res.json({
      record: {
        id: latest.id,
        temperature: latest.temperature,
        humidity: latest.humidity,
        time,
        date,
        raw_created_at: latest.created_at
      }
    });
  } catch (error) {
    console.error('Error getting latest DHT reading:', error);
    res.status(500).json({ error: 'Failed to fetch latest DHT reading.' });
  }
});

// GET /api/dht/history (Pagination 20 records at a time, latest records first)
app.get('/api/dht/history', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const totalCountRow = await dbGet('SELECT COUNT(*) as count FROM dht_records');
    const totalRecords = totalCountRow ? totalCountRow.count : 0;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    const rows = await dbAll(
      'SELECT id, temperature, humidity, created_at FROM dht_records ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const records = rows.map((row) => {
      const { time, date } = formatKolkataTime(row.created_at);
      return {
        id: row.id,
        temperature: row.temperature,
        humidity: row.humidity,
        time,
        date,
        created_at: row.created_at
      };
    });

    res.json({
      records,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch sensor history records.' });
  }
});

// GET /api/dht/chart (Returns last 30 data points in chronological order for graphs)
app.get('/api/dht/chart', async (req, res) => {
  try {
    const limit = Math.max(5, Math.min(100, parseInt(req.query.limit, 10) || 30));
    const rows = await dbAll(
      'SELECT id, temperature, humidity, created_at FROM dht_records ORDER BY id DESC LIMIT ?',
      [limit]
    );

    // Reverse to chronological order (oldest to newest)
    const chronological = rows.reverse().map((row) => {
      const { time } = formatKolkataTime(row.created_at);
      return {
        id: row.id,
        temperature: row.temperature,
        humidity: row.humidity,
        time,
        created_at: row.created_at
      };
    });

    res.json({ points: chronological });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Failed to fetch graph data points.' });
  }
});

// DELETE /api/dht/:id (Delete individual record)
app.delete('/api/dht/:id', authenticateToken, async (req, res) => {
  try {
    const recordId = parseInt(req.params.id, 10);
    if (isNaN(recordId)) {
      return res.status(400).json({ error: 'Invalid record ID.' });
    }

    const result = await dbRun('DELETE FROM dht_records WHERE id = ?', [recordId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Record not found or already deleted.' });
    }

    res.json({ success: true, message: `Record #${recordId} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Failed to delete record.' });
  }
});

// ========================
// HTML Routes / Fallback
// ========================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Start Server
const startServer = async () => {
  await initDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 Torrent IoT Server is active on port ${PORT}`);
    console.log(`📍 Web Dashboard: http://localhost:${PORT}`);
    console.log(`🌐 Timezone configured: Asia/Kolkata (UTC+05:30)`);
    console.log(`=======================================================`);
  });
};

startServer();
