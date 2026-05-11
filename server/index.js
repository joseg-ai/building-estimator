const express = require('express');
const path = require('path');
const cors = require('cors');
const { authMiddleware } = require('./auth');
const authRoutes = require('./routes-auth');
const quotesRoutes = require('./routes-quotes');
const priceListRoutes = require('./routes-pricelist');
const catalogRoutes = require('./routes-catalog');
const customersRoutes = require('./routes-customers');
const vendorsRoutes = require('./routes-vendors');

// Idempotent admin seeder — runs only when SEED_ADMIN=true and no users exist yet
function seedAdminIfEmpty() {
  const db = require('./db');
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const count = db.prepare('SELECT COUNT(*) as n FROM users').get();
  if (count.n === 0) {
    const id = uuidv4();
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)').run(id, 'admin', hash, 'Admin');
    console.log('[seed] Created default admin user (username: admin, password: admin123) — change this password immediately.');
  }
}
if (process.env.SEED_ADMIN === 'true') {
  // Ensure the DB data directory exists before seeding
  const fs = require('fs');
  const dbDir = path.dirname(process.env.DB_PATH || path.join(__dirname, 'estimator.db'));
  fs.mkdirSync(dbDir, { recursive: true });
  seedAdminIfEmpty();
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'], credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require auth)
app.use('/api/quotes', authMiddleware, quotesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/vendors', vendorsRoutes);

// Catalog & price list -- reads open during dev; writes guarded inside the routers
app.use('/api/price-list', priceListRoutes);
app.use('/api/catalog', catalogRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Production static serving -- only active when SERVE_WEBAPP=true (Azure App Service).
// Dev uses Vite on port 5173; this block is a no-op in that mode.
if (process.env.SERVE_WEBAPP === 'true') {
  const webappDist = path.join(__dirname, '..', 'webapp', 'dist');
  app.use(express.static(webappDist));
  // SPA fallback -- unknown non-API routes return index.html so React Router handles them
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(webappDist, 'index.html'));
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
