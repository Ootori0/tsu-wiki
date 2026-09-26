CREATE TABLE spells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('magic', 'tool', 'other')),
  name TEXT NOT NULL,
  cost TEXT,
  condition TEXT,
  damage TEXT,
  effect TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_spells_category ON spells(category);