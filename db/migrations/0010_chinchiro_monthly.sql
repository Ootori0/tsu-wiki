-- チンチロの古い勝負記録を、PC・ディーラー・月(日本時間)ごとにまとめた月計
-- 管理者画面の「履歴の圧縮」で、7日より前の勝負を chinchiro_games からここへ移す
CREATE TABLE chinchiro_monthly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pc_id INTEGER NOT NULL, -- プレイヤー
  dealer_pc_id INTEGER NOT NULL DEFAULT 0, -- ディーラー(0=なし)
  month TEXT NOT NULL, -- 'YYYY-MM'(日本時間)
  plays INTEGER NOT NULL, -- 勝負の回数
  bet_total INTEGER NOT NULL, -- 掛金の合計
  net_total INTEGER NOT NULL, -- プレイヤーの所持金の増減の合計
  dealer_delta_total INTEGER NOT NULL, -- ディーラーの所持金の増減の合計
  created_at TEXT NOT NULL, -- まとめた勝負のうち最後の日時(履歴の並び順に使う)
  UNIQUE (pc_id, dealer_pc_id, month)
);

CREATE INDEX idx_chinchiro_monthly_pc ON chinchiro_monthly(pc_id);
CREATE INDEX idx_chinchiro_monthly_dealer ON chinchiro_monthly(dealer_pc_id);
