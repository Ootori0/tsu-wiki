-- N個セット販売(価格・在庫・販売者への支払いはセット単位。所持品にはセットの個数×買ったセット数を入れる)
ALTER TABLE shop_items ADD COLUMN set_size INTEGER NOT NULL DEFAULT 1 CHECK (set_size >= 1);
ALTER TABLE purchases ADD COLUMN set_size INTEGER NOT NULL DEFAULT 1;
