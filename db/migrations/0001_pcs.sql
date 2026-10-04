CREATE TABLE affiliations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE pcs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_by INTEGER NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT, -- R2設定後に使用
  affiliation TEXT, -- affiliations.name
  grade INTEGER NOT NULL DEFAULT 10 CHECK (grade BETWEEN 1 AND 10),
  memo TEXT,
  is_representative INTEGER NOT NULL DEFAULT 0, -- 0/1
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
