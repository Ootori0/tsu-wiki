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
