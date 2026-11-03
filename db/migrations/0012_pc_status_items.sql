-- PCのステータス(CoC6版。JSON: {"STR":10,...,"HP":12,"MP":10})
ALTER TABLE pcs ADD COLUMN stats TEXT NOT NULL DEFAULT '{}';

-- PCの所持品
CREATE TABLE pc_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pc_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  size TEXT NOT NULL DEFAULT 'none' CHECK (size IN ('large', 'medium', 'small', 'none')), -- 荷物の大きさ(大5・中3・小1・なし0)
  per_slot INTEGER NOT NULL DEFAULT 1 CHECK (per_slot >= 1), -- 何個で1つ分の大きさになるか(御札は10枚で小)
  category TEXT NOT NULL DEFAULT 'cargo' CHECK (category IN ('cargo', 'equipment', 'storage')), -- cargo: 荷物(コストに数える) / equipment: 装備品(コスト免除・補正あり) / storage: 倉庫
  effect TEXT NOT NULL DEFAULT '',
  modifiers TEXT NOT NULL DEFAULT '{}', -- ステータスへの補正 JSON {"STR":1}
  shop_item_id INTEGER, -- 魔法店/武器屋で買ったものは元の商品
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (pc_id) REFERENCES pcs(id) ON DELETE CASCADE
);

CREATE INDEX idx_pc_items_pc ON pc_items(pc_id);

-- 商品を買ったときに所持品へ入れる設定
ALTER TABLE shop_items ADD COLUMN item_size TEXT NOT NULL DEFAULT 'none' CHECK (item_size IN ('large', 'medium', 'small', 'none'));
ALTER TABLE shop_items ADD COLUMN item_per_slot INTEGER NOT NULL DEFAULT 1 CHECK (item_per_slot >= 1);
ALTER TABLE shop_items ADD COLUMN item_category TEXT NOT NULL DEFAULT 'storage' CHECK (item_category IN ('cargo', 'equipment', 'storage'));
ALTER TABLE shop_items ADD COLUMN item_modifiers TEXT NOT NULL DEFAULT '{}';
