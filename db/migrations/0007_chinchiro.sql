-- 所持金をマイナス可にするため pcs を作り直す(CHECK制約は ALTER で外せないため)
-- pcs を DROP すると ON DELETE CASCADE で販売者設定が消えるので退避して戻す
CREATE TABLE _sellers_backup AS SELECT * FROM shop_item_sellers;

CREATE TABLE pcs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_by INTEGER NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  affiliation TEXT,
  office TEXT NOT NULL DEFAULT '',
  grade INTEGER NOT NULL DEFAULT 10 CHECK (grade BETWEEN 1 AND 10),
  memo TEXT,
  is_representative INTEGER NOT NULL DEFAULT 0,
  is_office_representative INTEGER NOT NULL DEFAULT 0,
  show_title INTEGER NOT NULL DEFAULT 1,
  show_office INTEGER NOT NULL DEFAULT 1,
  money INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

INSERT INTO pcs_new (
  id, created_by, name, image_url, affiliation, office, grade, memo,
  is_representative, is_office_representative, show_title, show_office, money, created_at, updated_at
)
SELECT
  id, created_by, name, image_url, affiliation, office, grade, memo,
  is_representative, is_office_representative, show_title, show_office, money, created_at, updated_at
FROM pcs;

DROP TABLE pcs;
ALTER TABLE pcs_new RENAME TO pcs;

DELETE FROM shop_item_sellers;
INSERT INTO shop_item_sellers (id, item_id, pc_id, amount)
SELECT id, item_id, pc_id, amount FROM _sellers_backup;
DROP TABLE _sellers_backup;

-- 店の購入時に所持金がマイナスにならないことを確かめるための一時テーブル(常に空)
CREATE TABLE balance_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  money INTEGER NOT NULL CHECK (money >= 0)
);

-- チンチロの払い戻し倍率(掛金に対する増減の倍率。マイナスは負け)
CREATE TABLE chinchiro_payouts (
  hand TEXT PRIMARY KEY,
  multiplier REAL NOT NULL
);

CREATE TABLE chinchiro_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pc_id INTEGER NOT NULL,
  bet INTEGER NOT NULL,
  rolls TEXT NOT NULL, -- JSON配列 [[1,2,3], ...]
  hand TEXT NOT NULL,
  multiplier REAL NOT NULL,
  net INTEGER NOT NULL, -- 所持金の増減
  played_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_chinchiro_games_pc ON chinchiro_games(pc_id);

INSERT INTO chinchiro_payouts (hand, multiplier) VALUES
  ('pinzoro', 5),
  ('zorome', 3),
  ('shigoro', 2),
  ('point6', 1),
  ('point5', 0.5),
  ('point4', 0),
  ('point3', -0.5),
  ('point2', -0.75),
  ('point1', -1),
  ('menashi', -1),
  ('hifumi', -2);
