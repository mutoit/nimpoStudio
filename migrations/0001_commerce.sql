-- Optional D1 schema (binding ORDERS_DB). Runtime uses R2 JSON by default.
-- Create: wrangler d1 create nimpo-orders
-- Apply: wrangler d1 execute nimpo-orders --file=migrations/0001_commerce.sql --remote

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  product_name TEXT,
  plan_id TEXT,
  plan_name TEXT,
  amount_eur REAL,
  currency TEXT DEFAULT 'eur',
  status TEXT NOT NULL,
  stripe_session_id TEXT,
  license_key TEXT,
  full_key TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS licenses (
  key TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  email TEXT NOT NULL,
  plan_id TEXT,
  seats INTEGER DEFAULT 1,
  activations_json TEXT DEFAULT '[]',
  revoked INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);

-- Future D1 (runtime still uses R2 monofile catalog/commerce/*.json)
CREATE TABLE IF NOT EXISTS customers (
  email TEXT PRIMARY KEY,
  nick TEXT,
  product_slugs_json TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  last_purchase_at TEXT,
  last_seen_at TEXT,
  email_history_json TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  buyer INTEGER DEFAULT 0,
  product_slug TEXT,
  channel TEXT NOT NULL,
  subtype TEXT NOT NULL,
  message TEXT NOT NULL,
  nick TEXT,
  name TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  order_ids_json TEXT,
  recovery_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(email);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_customers_nick ON customers(nick);
