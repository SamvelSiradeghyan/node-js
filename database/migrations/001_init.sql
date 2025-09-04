CREATE TABLE IF NOT EXISTS filemeta (
  file_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  content_type TEXT NOT NULL,
  upload_time TIMESTAMPTZ NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  checksum_sha256 TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_checksum_filename ON filemeta (user_id, checksum_sha256, filename);

CREATE INDEX IF NOT EXISTS idx_user_upload_time ON filemeta (user_id, upload_time DESC);
CREATE INDEX IF NOT EXISTS idx_upload_time ON filemeta (upload_time DESC);
CREATE INDEX IF NOT EXISTS idx_tags_gin ON filemeta USING GIN (tags);