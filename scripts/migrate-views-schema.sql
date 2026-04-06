-- EDU-PUBLISH view count schema
-- Compatible with both Cloudflare D1 and local SQLite

CREATE TABLE IF NOT EXISTS view_counts (
  guid TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS view_logs (
  ip_hash TEXT NOT NULL,
  guid TEXT NOT NULL,
  ts INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, guid)
);

CREATE INDEX IF NOT EXISTS idx_view_logs_guid ON view_logs(guid);
CREATE INDEX IF NOT EXISTS idx_view_logs_ts ON view_logs(ts);
