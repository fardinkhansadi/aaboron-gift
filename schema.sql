CREATE TABLE IF NOT EXISTS claims (
  token TEXT PRIMARY KEY,
  discount INTEGER NOT NULL CHECK (discount IN (5, 10)),
  coupon_code TEXT UNIQUE,
  claimed_at TEXT,
  redeemed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_claims_coupon_code ON claims(coupon_code);
