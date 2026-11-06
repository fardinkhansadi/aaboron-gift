CREATE TABLE IF NOT EXISTS claims (
  token TEXT PRIMARY KEY,
  discount INTEGER NOT NULL CHECK (discount IN (5, 10)),
  coupon_code TEXT UNIQUE,
  claimed_at TEXT,
  redeemed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_claims_coupon_code ON claims(coupon_code);
CREATE TABLE IF NOT EXISTS universal_claims (
    session_hash TEXT PRIMARY KEY,
    discount INTEGER NOT NULL CHECK (discount IN (5, 10)),
    coupon_code TEXT NOT NULL UNIQUE,
    claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    redeemed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_universal_coupon
ON universal_claims(coupon_code);
