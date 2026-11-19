// 所持金の増減履歴(手動・店の購入/売上・カジノ・ディーラー・月計)を新しい順に返す
//
// 以前は全種類を UNION ALL でまとめてから並べ替えて件数を絞っていたため、履歴の全行を毎回読んでいた。
// いまは種類ごとに「新しい順に limit 件」をインデックスで読み(1回の batch)、まとめて並べ替えてから limit 件に絞る。
// 種類ごとの上位 limit 件を合わせれば、全体の上位 limit 件は必ず含まれるので結果は変わらない。

// 履歴に出す商品名(セット・割引・持ち込みの印を付ける)
const itemLabel = (t) =>
  `${t}.item_name || CASE WHEN ${t}.set_size > 1 THEN '(' || ${t}.set_size || '個セット)' ELSE '' END` +
  ` || CASE WHEN ${t}.discount = 1 THEN '(割引)' ELSE '' END || CASE WHEN ${t}.carry_in = 1 THEN '(持ち込み)' ELSE '' END`

// 種類ごとの読み出し。列は kind, id, pc_id, amount, detail, sub, user_id, created_at にそろえる
// pc: PCで絞るときの列 / all: PCで絞らないときの条件 / categories: 種別の絞り込みごとの追加条件(載っていない種別では読まない)
const BRANCHES = [
  {
    select: `SELECT ml.type AS kind, ml.id, ml.pc_id, ml.amount, ml.reason AS detail, NULL AS sub, ml.created_by AS user_id, ml.created_at
             FROM money_logs ml`,
    pc: 'ml.pc_id', time: 'ml.created_at', id: 'ml.id',
    categories: { '': null, manual: "ml.type = 'manual'", ledger: "ml.type IN ('settle', 'mode')" },
  },
  {
    select: `SELECT 'purchase' AS kind, pu.id, pu.pc_id, -pu.total AS amount, ${itemLabel('pu')} AS detail,
               pu.shop || ' ×' || pu.quantity AS sub, pu.purchased_by AS user_id, pu.created_at
             FROM purchases pu`,
    pc: 'pu.pc_id', time: 'pu.created_at', id: 'pu.id',
    categories: { '': null, magic_shop: "pu.shop = '魔法店'", weapon_shop: "pu.shop = '武器屋'" },
  },
  {
    select: `SELECT 'sale' AS kind, po.id, po.pc_id, po.amount, ${itemLabel('pu')} AS detail,
               pu.shop || ' ×' || pu.quantity AS sub, pu.purchased_by AS user_id, po.created_at
             FROM purchase_payouts po JOIN purchases pu ON pu.id = po.purchase_id`,
    pc: 'po.pc_id', time: 'po.created_at', id: 'po.id',
    categories: { '': null, magic_shop: "pu.shop = '魔法店'", weapon_shop: "pu.shop = '武器屋'" },
  },
  {
    select: `SELECT 'casino' AS kind, g.id, g.pc_id, g.net AS amount, g.hand AS detail, g.bet AS sub, g.played_by AS user_id, g.created_at
             FROM chinchiro_games g`,
    pc: 'g.pc_id', time: 'g.created_at', id: 'g.id',
    categories: { '': null, casino: null },
  },
  {
    select: `SELECT 'dealer' AS kind, g.id, g.dealer_pc_id AS pc_id, g.dealer_delta AS amount, g.hand AS detail, p.name AS sub, g.played_by AS user_id, g.created_at
             FROM chinchiro_games g LEFT JOIN pcs p ON p.id = g.pc_id`,
    pc: 'g.dealer_pc_id', all: 'g.dealer_pc_id IS NOT NULL', time: 'g.created_at', id: 'g.id',
    categories: { '': null, casino: null },
  },
  {
    // Showdown(勝負中のものは、払った掛金と Raise の料金の分だけ出る)
    select: `SELECT 'showdown' AS kind, s.id, s.pc_id, s.net AS amount, COALESCE(s.hand, s.status) AS detail, s.bet AS sub, s.played_by AS user_id, s.created_at
             FROM showdown_games s`,
    pc: 's.pc_id', time: 's.created_at', id: 's.id',
    categories: { '': null, casino: null, showdown: null },
  },
  {
    select: `SELECT 'showdown_dealer' AS kind, s.id, s.dealer_pc_id AS pc_id, s.dealer_delta AS amount, COALESCE(s.hand, s.status) AS detail, p.name AS sub, s.played_by AS user_id, s.created_at
             FROM showdown_games s LEFT JOIN pcs p ON p.id = s.pc_id`,
    pc: 's.dealer_pc_id', all: 's.dealer_pc_id IS NOT NULL', time: 's.created_at', id: 's.id',
    categories: { '': null, casino: null, showdown: null },
  },
  {
    select: `SELECT 'casino_month' AS kind, m.id, m.pc_id, m.net_total AS amount, m.month AS detail, m.plays || '/' || m.bet_total AS sub, NULL AS user_id, m.created_at
             FROM chinchiro_monthly m`,
    pc: 'm.pc_id', time: 'm.created_at', id: 'm.id',
    categories: { '': null, casino: null, casino_month: null },
  },
  {
    select: `SELECT 'dealer_month' AS kind, m.id, m.dealer_pc_id AS pc_id, m.dealer_delta_total AS amount, m.month || '/' || m.plays AS detail, p.name AS sub, NULL AS user_id, m.created_at
             FROM chinchiro_monthly m LEFT JOIN pcs p ON p.id = m.pc_id`,
    pc: 'm.dealer_pc_id', all: 'm.dealer_pc_id != 0', time: 'm.created_at', id: 'm.id',
    categories: { '': null, casino: null, dealer_month: null },
  },
]

// pcId: そのPCだけ(null なら全PC) / category: 種別(空ならすべて。知らない値もすべて扱い)
export async function loadMoneyLogs(db, { pcId = null, category = '', limit = 100 } = {}) {
  const cat = BRANCHES.some((b) => category in b.categories) ? category : ''
  const statements = BRANCHES.filter((b) => cat in b.categories).map((b) => {
    const where = [pcId !== null ? `${b.pc} = ?1` : b.all, b.categories[cat]].filter(Boolean)
    const sql = `SELECT x.*, pcs.name AS pc_name, u.name AS user_name FROM (
                   ${b.select}
                   ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
                   ORDER BY ${b.time} DESC, ${b.id} DESC LIMIT ?2
                 ) x
                 LEFT JOIN pcs ON pcs.id = x.pc_id
                 LEFT JOIN users u ON u.id = x.user_id`
    return db.prepare(sql).bind(pcId, limit)
  })

  const results = (await db.batch(statements)).flatMap((r) => r.results)
  results.sort((a, b) => (a.created_at === b.created_at ? b.id - a.id : a.created_at < b.created_at ? 1 : -1))
  return results.slice(0, limit)
}
