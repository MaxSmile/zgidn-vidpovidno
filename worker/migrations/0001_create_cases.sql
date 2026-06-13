CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  request_hash TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('to_bureaucratic', 'to_plain')),
  source_text TEXT NOT NULL,
  result_json TEXT NOT NULL,
  ui_json TEXT NOT NULL DEFAULT '{}',
  prompt_version TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX cases_cache_hash_idx
ON cases(request_hash)
WHERE request_hash IS NOT NULL;

CREATE INDEX cases_expiry_idx ON cases(expires_at);
