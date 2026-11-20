-- Showdown を MP とターンで戦う形にする
-- 掛金はなく、どちらかの MP が0を下回ったら (プレイヤーのMP - ディーラーのMP) × レート を精算する
ALTER TABLE showdown_games ADD COLUMN player_mp INTEGER;
ALTER TABLE showdown_games ADD COLUMN dealer_mp INTEGER;
ALTER TABLE showdown_games ADD COLUMN log TEXT; -- JSON 起きたことの記録(画面のログとアニメーションに使う)
