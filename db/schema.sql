CREATE TABLE spells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('magic', 'tool', 'other')),
  name TEXT NOT NULL,
  cost TEXT,
  condition TEXT,
  damage TEXT,
  effect TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_spells_category ON spells(category);

CREATE TABLE setting_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE faq_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]', -- JSON配列文字列
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY, -- ランダムトークン
  user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);


CREATE TABLE magics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('魔法', '魔道具', 'AF', '魔術・その他')),
  visible_permissions TEXT NOT NULL DEFAULT '[]', -- JSON配列(閲覧可能権限)
  created_by INTEGER NOT NULL,
  name TEXT NOT NULL,
  owner TEXT,
  tags TEXT NOT NULL DEFAULT '[]', -- JSON配列
  cost TEXT,
  condition TEXT,
  effect TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_magics_type ON magics(type);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

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
  office TEXT NOT NULL DEFAULT '', -- 事務所(自由記述)
  grade INTEGER NOT NULL DEFAULT 10 CHECK (grade BETWEEN 1 AND 10),
  memo TEXT,
  is_representative INTEGER NOT NULL DEFAULT 0, -- 0/1 協会の代表
  is_office_representative INTEGER NOT NULL DEFAULT 0, -- 0/1 事務所の代表
  show_title INTEGER NOT NULL DEFAULT 1, -- 0/1 名前と一緒に肩書きを表示するか
  show_office INTEGER NOT NULL DEFAULT 1, -- 0/1 肩書きに事務所を表示するか
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
