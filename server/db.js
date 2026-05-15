const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'estimator.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

// Enable WAL for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema bootstrap ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS price_list_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    supplier TEXT NOT NULL DEFAULT 'Central States',
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS material_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_id INTEGER NOT NULL,
    item_key TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    unit TEXT NOT NULL DEFAULT '',
    unit_price REAL NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (version_id) REFERENCES price_list_versions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS materials_catalog_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS materials_catalog_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_version_id INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    item_key TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY (catalog_version_id) REFERENCES materials_catalog_versions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'USA',
    notes TEXT,
    default_labor_rate REAL,
    default_overhead_pct REAL,
    default_profit_pct REAL,
    default_commission_pct REAL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);

  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'USA',
    notes TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_vendors_user ON vendors(user_id);

  CREATE TABLE IF NOT EXISTS vendor_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER NOT NULL,
    item_key TEXT NOT NULL,
    unit_price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    lead_time_days INTEGER,
    notes TEXT,
    updated_at INTEGER NOT NULL,
    UNIQUE(vendor_id, item_key),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_vendor_prices_item ON vendor_prices(item_key);
  CREATE INDEX IF NOT EXISTS idx_customers_user_name ON customers(user_id, name);
  CREATE INDEX IF NOT EXISTS idx_vendors_user_name ON vendors(user_id, name);
  CREATE INDEX IF NOT EXISTS idx_material_prices_version_key ON material_prices(version_id, item_key);
  CREATE INDEX IF NOT EXISTS idx_catalog_items_version_cat_key ON materials_catalog_items(catalog_version_id, category, item_key);

  CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_name TEXT NOT NULL DEFAULT '',
    customer_name TEXT NOT NULL DEFAULT '',
    job_location TEXT NOT NULL DEFAULT '',
    config_json TEXT NOT NULL,
    grand_total REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    price_list_version_id INTEGER,
    customer_id INTEGER,
    quote_number TEXT,
    revision INTEGER NOT NULL DEFAULT 0,
    parent_quote_id TEXT,
    valid_until TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (price_list_version_id) REFERENCES price_list_versions(id),
    FOREIGN KEY (parent_quote_id) REFERENCES quotes(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_quotes_user ON quotes(user_id);
  CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
  CREATE INDEX IF NOT EXISTS idx_quotes_parent ON quotes(parent_quote_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_user_quote_number
    ON quotes(user_id, quote_number, revision)
    WHERE quote_number IS NOT NULL;
`);

// ── Idempotent migrations for existing DBs ────────────────────────────────────
// Adds columns introduced after initial deploy, safe to re-run on any DB.
// SQLite has no `ALTER TABLE ADD COLUMN IF NOT EXISTS`, so we PRAGMA-check first.
(function applyMigrations() {
  const existingQuoteCols = new Set(
    db.prepare('PRAGMA table_info(quotes)').all().map((c) => c.name)
  );
  if (!existingQuoteCols.has('price_list_version_id')) {
    db.exec('ALTER TABLE quotes ADD COLUMN price_list_version_id INTEGER');
  }
  if (!existingQuoteCols.has('customer_id')) {
    db.exec('ALTER TABLE quotes ADD COLUMN customer_id INTEGER');
  }
  // Issue #6: quote number, revision, parent FK, valid-until.
  if (!existingQuoteCols.has('quote_number')) {
    db.exec('ALTER TABLE quotes ADD COLUMN quote_number TEXT');
  }
  if (!existingQuoteCols.has('revision')) {
    db.exec('ALTER TABLE quotes ADD COLUMN revision INTEGER NOT NULL DEFAULT 0');
  }
  if (!existingQuoteCols.has('parent_quote_id')) {
    db.exec('ALTER TABLE quotes ADD COLUMN parent_quote_id TEXT REFERENCES quotes(id) ON DELETE SET NULL');
  }
  if (!existingQuoteCols.has('valid_until')) {
    db.exec('ALTER TABLE quotes ADD COLUMN valid_until TEXT');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_quotes_parent ON quotes(parent_quote_id)');
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_user_quote_number
           ON quotes(user_id, quote_number, revision)
           WHERE quote_number IS NOT NULL`);
})();

module.exports = db;
