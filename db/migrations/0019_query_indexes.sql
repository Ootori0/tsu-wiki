-- よく使う読み出しが全件を読まないようにするインデックス
-- (pc_id, created_at) の形にすると、PCで絞って新しい順に読むときに必要な行だけを読める。
-- 末尾に id(rowid)も含まれるので「created_at, id の新しい順」もそのまま読める

-- 自分のPC(マイページ・店・カジノ)
CREATE INDEX IF NOT EXISTS idx_pcs_created_by ON pcs(created_by);

-- 所持金の履歴
DROP INDEX IF EXISTS idx_money_logs_pc;
CREATE INDEX IF NOT EXISTS idx_money_logs_pc_time ON money_logs(pc_id, created_at);
CREATE INDEX IF NOT EXISTS idx_money_logs_time ON money_logs(created_at);

DROP INDEX IF EXISTS idx_purchases_pc;
CREATE INDEX IF NOT EXISTS idx_purchases_pc_time ON purchases(pc_id, created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_time ON purchases(created_at);

DROP INDEX IF EXISTS idx_purchase_payouts_pc;
CREATE INDEX IF NOT EXISTS idx_purchase_payouts_pc_time ON purchase_payouts(pc_id, created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_payouts_time ON purchase_payouts(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_payouts_purchase ON purchase_payouts(purchase_id);

-- チンチロ(今日のプレイ回数・戦績・ディーラーの履歴・圧縮)
DROP INDEX IF EXISTS idx_chinchiro_games_pc;
CREATE INDEX IF NOT EXISTS idx_chinchiro_games_pc_time ON chinchiro_games(pc_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chinchiro_games_dealer_time ON chinchiro_games(dealer_pc_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chinchiro_games_time ON chinchiro_games(created_at);
