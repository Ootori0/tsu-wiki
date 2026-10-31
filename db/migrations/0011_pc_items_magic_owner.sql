-- PCの持ち物(自由記述)
ALTER TABLE pcs ADD COLUMN items TEXT NOT NULL DEFAULT '';
-- 魔法の所持者を自分のPCにしたとき、そのPC(NULL なら owner の自由記述)
ALTER TABLE magics ADD COLUMN owner_pc_id INTEGER;
