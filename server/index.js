require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- MIDDLEWARE: Verify Token ---
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Access denied. No token provided.' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. Invalid token format.' });

  try {
    const verified = jwt.verify(token, 'my_super_secret_key_123');
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// --- HEALTH CHECK ---
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REGISTER ---
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role',
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: 'User registered successfully', user: newUser.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- LOGIN ---
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      'my_super_secret_key_123',
      { expiresIn: '1h' }
    );

    res.json({ message: 'Logged in successfully', token, user: { id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email, role: user.rows[0].role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CREATE ISSUE (Protected Route) ---
app.post('/api/issues', verifyToken, async (req, res) => {
  try {
    const { title, description, category, location, image_url } = req.body;
    const student_id = req.user.id;

    const newIssue = await pool.query(
      'INSERT INTO issues (student_id, title, description, category, location, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [student_id, title, description, category, location, image_url]
    );

    res.status(201).json({ message: 'Issue reported successfully', issue: newIssue.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GET ISSUES (Protected Route) ---
app.get('/api/issues', verifyToken, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query(`
        SELECT issues.*, users.name as student_name 
        FROM issues 
        JOIN users ON issues.student_id = users.id 
        ORDER BY issues.created_at DESC
      `);
    } else {
      result = await pool.query(
        'SELECT * FROM issues WHERE student_id = $1 ORDER BY created_at DESC',
        [req.user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- UPDATE ISSUE STATUS (Admin Only) ---
app.patch('/api/issues/:id/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update status' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const updatedIssue = await pool.query(
      'UPDATE issues SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (updatedIssue.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({ message: 'Status updated', issue: updatedIssue.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;