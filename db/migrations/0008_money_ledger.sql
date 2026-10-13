-- 所持金を秘匿するPC向けの出納帳モード
ALTER TABLE pcs ADD COLUMN money_mode TEXT NOT NULL DEFAULT 'money' CHECK (money_mode IN ('money', 'ledger'));
ALTER TABLE money_logs ADD COLUMN type TEXT NOT NULL DEFAULT 'manual';
