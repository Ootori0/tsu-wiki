-- ログイン失敗の記録(総当たり対策。古い記録はログイン時に削除する)
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ip TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_login_attempts_name ON login_attempts(name, created_at);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip, created_at);
