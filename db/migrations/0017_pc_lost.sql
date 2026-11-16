-- PCのロスト(死亡・引退など)。1 ならロスト表示にする
ALTER TABLE pcs ADD COLUMN is_lost INTEGER NOT NULL DEFAULT 0;
