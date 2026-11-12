-- PC画像の背景色(#rrggbb。空なら標準の黄色)
ALTER TABLE pcs ADD COLUMN image_bg TEXT NOT NULL DEFAULT '';
