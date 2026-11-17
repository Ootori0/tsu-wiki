-- 魔法店の商品の分類(魔法・装飾品・医薬品・その他)。武器屋の商品は空
ALTER TABLE shop_items ADD COLUMN shop_category TEXT NOT NULL DEFAULT '';
UPDATE shop_items SET shop_category = 'その他' WHERE shop = '魔法店';
