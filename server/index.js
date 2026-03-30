const express = require('express');
const cors = require('cors');
const { authMiddleware } = require('./auth');
const authRoutes = require('./routes-auth');
const quotesRoutes = require('./routes-quotes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'], credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require auth)
app.use('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, displayName: req.user.displayName });
});
app.use('/api/quotes', authMiddleware, quotesRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
