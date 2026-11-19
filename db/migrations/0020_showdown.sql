-- カジノの「Showdown」(魔術《Showdown》を元にした、ディーラーとのカード勝負)
-- 設定(配当・嘘の確率・Raise の料金と回数・1日の回数・プレイヤーのダイス・ディーラー)は casino_settings に showdown_ で始まるキーで置く
CREATE TABLE showdown_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pc_id INTEGER NOT NULL,
  bet INTEGER NOT NULL,
  raises INTEGER NOT NULL DEFAULT 0, -- 公開札を破った回数
  raise_fee_total INTEGER NOT NULL DEFAULT 0, -- Raise で払った合計
  cards TEXT NOT NULL, -- JSON 7枠(左4枠が公開札、右3枠が手札。破れた枠は null)
  declared TEXT NOT NULL, -- ディーラーが宣言している役
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'win', 'lose', 'push', 'fold')),
  hand TEXT, -- 勝負したときの実際の役
  result TEXT, -- JSON 勝負の詳細(最終の札・役に使った札・ダメージ・ダイス・嘘だったか)
  payout INTEGER NOT NULL DEFAULT 0, -- 戻った金額(掛金込み)
  net INTEGER NOT NULL DEFAULT 0, -- 所持金の増減(勝負中は 掛金とRaiseの料金の分のマイナス)
  dealer_pc_id INTEGER, -- 終わったときのディーラー
  dealer_delta INTEGER NOT NULL DEFAULT 0, -- ディーラーの所持金の増減
  played_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  finished_at TEXT
);
CREATE INDEX idx_showdown_games_pc_time ON showdown_games(pc_id, created_at);
CREATE INDEX idx_showdown_games_dealer_time ON showdown_games(dealer_pc_id, created_at);
CREATE INDEX idx_showdown_games_time ON showdown_games(created_at);
-- 1つのPCが同時に進められる勝負は1つだけ
CREATE UNIQUE INDEX idx_showdown_games_playing ON showdown_games(pc_id) WHERE status = 'playing';
