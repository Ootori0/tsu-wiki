-- 所持金の手動での増減履歴(店・カジノの増減はそれぞれの履歴テーブルに残る)
CREATE TABLE money_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pc_id INTEGER NOT NULL,
  amount INTEGER NOT NULL, -- 増減額
  balance_after INTEGER NOT NULL, -- 反映後の所持金
  reason TEXT NOT NULL DEFAULT '',
  created_by INTEGER NOT NULL, -- 操作したユーザー
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_money_logs_pc ON money_logs(pc_id);
