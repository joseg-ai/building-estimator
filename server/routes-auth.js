const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { generateToken } = require('./auth');

const router = express.Router();

/** POST /api/auth/register */
router.post('/register', (req, res) => {
  const { username, password, displayName } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  const name = displayName || username;

  db.prepare('INSERT INTO users (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)')
    .run(id, username, passwordHash, name);

  const user = { id, username, display_name: name };
  const token = generateToken(user);

  res.status(201).json({ token, user: { id, username, displayName: name } });
});

/** POST /api/auth/login */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = generateToken(user);
  res.json({ token, user: { id: user.id, username: user.username, displayName: user.display_name } });
});

/** GET /api/auth/me -- get current user info from token */
router.get('/me', (req, res) => {
  // This route requires auth middleware applied in index.js
  res.json({ id: req.user.id, username: req.user.username, displayName: req.user.displayName });
});

module.exports = router;
