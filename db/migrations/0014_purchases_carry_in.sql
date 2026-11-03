-- 持ち込み: 過去や別のルートで手に入れた店の商品を所持品に追加した記録(代金0。在庫は減らさない)
ALTER TABLE purchases ADD COLUMN carry_in INTEGER NOT NULL DEFAULT 0;
