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
  money INTEGER NOT NULL DEFAULT 0 CHECK (money >= 0), -- 所持金
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);


CREATE TABLE shop_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL CHECK (shop IN ('魔法店', '武器屋')),
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  stock INTEGER CHECK (stock IS NULL OR stock >= 0), -- NULL=無制限
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pc_id INTEGER NOT NULL,
  item_id INTEGER, -- 商品削除後も履歴は残す
  shop TEXT NOT NULL,
  item_name TEXT NOT NULL, -- 購入時点の商品名
  price INTEGER NOT NULL, -- 購入時点の単価
  quantity INTEGER NOT NULL,
  total INTEGER NOT NULL,
  purchased_by INTEGER NOT NULL, -- 操作したユーザー
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_purchases_pc ON purchases(pc_id);

CREATE TABLE shop_item_sellers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  pc_id INTEGER NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0), -- 1個売れるごとに販売者へ入る金額
  UNIQUE (item_id, pc_id),
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE,
  FOREIGN KEY (pc_id) REFERENCES pcs(id) ON DELETE CASCADE
);

CREATE TABLE purchase_payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL,
  pc_id INTEGER NOT NULL, -- 販売者
  amount INTEGER NOT NULL, -- 実際に入った金額(1個あたり×個数)
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_purchase_payouts_pc ON purchase_payouts(pc_id);
