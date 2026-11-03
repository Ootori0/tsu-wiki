-- 1. 級を空欄にできるようにする(grade 列は 1〜10 の制約があり作り直すと所持品などが消えるおそれがあるため、空欄かどうかを別の列で持つ)
ALTER TABLE pcs ADD COLUMN no_grade INTEGER NOT NULL DEFAULT 0;

-- 2. すでにある所持品を店の商品・魔道具/AFに結びつける(1回だけ)

-- 2-1. 削除済みの商品を指している所持品は、結びつきを外して普通の品物にする
UPDATE pc_items SET shop_item_id = NULL
WHERE shop_item_id IS NOT NULL AND shop_item_id NOT IN (SELECT id FROM shop_items);

-- 2-2. 手で入力した品物のうち、店の商品と名前がまったく同じものをその商品に結びつける(同名の商品が複数あれば先に作った方)
UPDATE pc_items SET shop_item_id = (SELECT MIN(s.id) FROM shop_items s WHERE s.name = pc_items.name)
WHERE shop_item_id IS NULL AND magic_id IS NULL
  AND EXISTS (SELECT 1 FROM shop_items s WHERE s.name = pc_items.name);

-- 2-3. 店の商品に結びついた所持品の名前・効果・大きさ・補正を、今の商品に合わせる(置き場所と個数はそのまま)
UPDATE pc_items SET
  name = (SELECT s.name FROM shop_items s WHERE s.id = pc_items.shop_item_id),
  effect = (SELECT COALESCE(s.description, '') FROM shop_items s WHERE s.id = pc_items.shop_item_id),
  size = (SELECT COALESCE(s.item_size, 'none') FROM shop_items s WHERE s.id = pc_items.shop_item_id),
  per_slot = (SELECT COALESCE(s.item_per_slot, 1) FROM shop_items s WHERE s.id = pc_items.shop_item_id),
  modifiers = (SELECT COALESCE(s.item_modifiers, '{}') FROM shop_items s WHERE s.id = pc_items.shop_item_id)
WHERE shop_item_id IS NOT NULL;

-- 2-4. 魔道具・AFの所持品で、魔法が消えている・所持者がPCでなくなったものは外す
DELETE FROM pc_items WHERE magic_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM magics m WHERE m.id = pc_items.magic_id AND m.type IN ('魔道具', 'AF') AND m.owner_pc_id IS NOT NULL
);

-- 2-5. 所持者のPCが手で入力していた同名の品物を、その魔道具・AFに結びつける(1つだけ)
UPDATE pc_items SET magic_id = (
  SELECT MIN(m.id) FROM magics m
  WHERE m.type IN ('魔道具', 'AF') AND m.owner_pc_id = pc_items.pc_id AND m.name = pc_items.name
    AND NOT EXISTS (SELECT 1 FROM pc_items x WHERE x.magic_id = m.id)
)
WHERE shop_item_id IS NULL AND magic_id IS NULL
  AND id = (
    SELECT MIN(y.id) FROM pc_items y
    WHERE y.pc_id = pc_items.pc_id AND y.name = pc_items.name AND y.shop_item_id IS NULL AND y.magic_id IS NULL
  )
  AND EXISTS (
    SELECT 1 FROM magics m
    WHERE m.type IN ('魔道具', 'AF') AND m.owner_pc_id = pc_items.pc_id AND m.name = pc_items.name
      AND NOT EXISTS (SELECT 1 FROM pc_items x WHERE x.magic_id = m.id)
  );

-- 2-6. 所持品にまだない魔道具・AFを、所持者のPCの倉庫に入れる
INSERT INTO pc_items (pc_id, name, quantity, size, category, effect, magic_id)
SELECT m.owner_pc_id, m.name, 1, 'none', 'storage', COALESCE(m.effect, ''), m.id
FROM magics m
WHERE m.type IN ('魔道具', 'AF') AND m.owner_pc_id IN (SELECT id FROM pcs)
  AND NOT EXISTS (SELECT 1 FROM pc_items x WHERE x.magic_id = m.id);

-- 2-7. 魔道具・AFの所持品の持ち主・名前・効果を魔法に合わせる(大きさと置き場所はそのまま)
UPDATE pc_items SET
  pc_id = (SELECT m.owner_pc_id FROM magics m WHERE m.id = pc_items.magic_id),
  name = (SELECT m.name FROM magics m WHERE m.id = pc_items.magic_id),
  effect = (SELECT COALESCE(m.effect, '') FROM magics m WHERE m.id = pc_items.magic_id)
WHERE magic_id IS NOT NULL;
