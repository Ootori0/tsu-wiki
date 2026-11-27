-- 期限付きのアカウント作成リンク(1リンクで1アカウントだけ作れる)
-- token_hash: リンクに入れたトークンの SHA-256(トークンそのものは保存しない)
CREATE TABLE invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  created_by INTEGER,
  expires_at TEXT NOT NULL, -- UTC 'YYYY-MM-DD HH:MM:SS'
  used_at TEXT,
  used_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_invites_created_at ON invites (created_at);
