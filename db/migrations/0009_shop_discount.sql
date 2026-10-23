-- 魔法店/武器屋の割引販売
-- discount_price が NULL なら割引なし。割引の在庫(discount_stock)が残っている間は通常販売より優先する
ALTER TABLE shop_items ADD COLUMN discount_price INTEGER CHECK (discount_price IS NULL OR discount_price >= 0);
ALTER TABLE shop_items ADD COLUMN discount_stock INTEGER NOT NULL DEFAULT 0 CHECK (discount_stock >= 0);

-- 割引販売の販売者(通常販売の販売者とは別に設定する)
CREATE TABLE shop_item_discount_sellers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  pc_id INTEGER NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0), -- 割引で1個売れるごとに販売者へ入る金額
  UNIQUE (item_id, pc_id),
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE,
  FOREIGN KEY (pc_id) REFERENCES pcs(id) ON DELETE CASCADE
);

-- 割引販売で買ったかどうか(0/1)
ALTER TABLE purchases ADD COLUMN discount INTEGER NOT NULL DEFAULT 0;
