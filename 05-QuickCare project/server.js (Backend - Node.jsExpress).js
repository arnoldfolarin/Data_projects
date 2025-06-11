require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create tables if not exists
const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS checkins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
        stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
        exercise BOOLEAN DEFAULT FALSE,
        meditation_minutes INTEGER DEFAULT 0,
        journal TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
};

// Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Save user
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/checkins', async (req, res) => {
  const { mood, stressLevel, exercise, meditationMinutes, journal } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    
    // Save check-in
    const result = await pool.query(
      `INSERT INTO checkins (user_id, mood, stress_level, exercise, meditation_minutes, journal)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, mood, stressLevel, exercise, meditationMinutes, journal]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Failed to save check-in' });
  }
});

app.get('/api/checkins', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    
    // Get check-ins
    const result = await pool.query(
      'SELECT * FROM checkins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [userId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.get('/api/summary', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    
    // Get weekly summary
    const result = await pool.query(
      `SELECT 
        DATE_TRUNC('week', created_at) AS week,
        AVG(mood) AS avg_mood,
        AVG(stress_level) AS avg_stress,
        SUM(meditation_minutes) AS total_meditation,
        COUNT(*) FILTER (WHERE exercise) AS exercise_days
      FROM checkins
      WHERE user_id = $1
      GROUP BY week
      ORDER BY week DESC
      LIMIT 4`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeDatabase();
});