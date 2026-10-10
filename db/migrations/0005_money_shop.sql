ALTER TABLE pcs ADD COLUMN money INTEGER NOT NULL DEFAULT 0 CHECK (money >= 0);
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
