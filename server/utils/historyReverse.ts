// 履歴の削除・取り消しで使う、所持金の増減を戻してから記録を消すSQL
// kind: manual/settle/mode … 所持金の手動増減など(money_logs)
//       purchase …… 購入(販売者への支払いも取り消し、在庫を戻す。割引で買ったものは割引の在庫へ)
//       sale ……… 販売者への支払い1件
//       casino/dealer … チンチロの勝負(プレイヤーとディーラーの両方の増減を取り消す)
//       casino_month/dealer_month … 圧縮したチンチロの月計(同上)
const moneyLog = {
  table: 'money_logs',
  statements: (db, id) => [
    db.prepare(
      `UPDATE pcs SET money = money - (SELECT amount FROM money_logs WHERE id = ?1)
       WHERE id = (SELECT pc_id FROM money_logs WHERE id = ?1)`
    ).bind(id),
    db.prepare('DELETE FROM money_logs WHERE id = ?').bind(id),
  ],
}

const game = {
  table: 'chinchiro_games',
  statements: (db, id) => [
    db.prepare(
      `UPDATE pcs SET money = money - (SELECT net FROM chinchiro_games WHERE id = ?1)
       WHERE id = (SELECT pc_id FROM chinchiro_games WHERE id = ?1)`
    ).bind(id),
    db.prepare(
      `UPDATE pcs SET money = money - (SELECT dealer_delta FROM chinchiro_games WHERE id = ?1)
       WHERE id = (SELECT dealer_pc_id FROM chinchiro_games WHERE id = ?1)`
    ).bind(id),
    db.prepare('DELETE FROM chinchiro_games WHERE id = ?').bind(id),
  ],
}

// 圧縮した月計(プレイヤーとディーラーの両方の増減を取り消す)
const monthly = {
  table: 'chinchiro_monthly',
  statements: (db, id) => [
    db.prepare(
      `UPDATE pcs SET money = money - (SELECT net_total FROM chinchiro_monthly WHERE id = ?1)
       WHERE id = (SELECT pc_id FROM chinchiro_monthly WHERE id = ?1)`
    ).bind(id),
    db.prepare(
      `UPDATE pcs SET money = money - (SELECT dealer_delta_total FROM chinchiro_monthly WHERE id = ?1)
       WHERE id = (SELECT dealer_pc_id FROM chinchiro_monthly WHERE id = ?1)`
    ).bind(id),
    db.prepare('DELETE FROM chinchiro_monthly WHERE id = ?').bind(id),
  ],
}

export const HISTORY_TARGETS = {
  manual: moneyLog,
  settle: moneyLog,
  mode: moneyLog,
  purchase: {
    table: 'purchases',
    statements: (db, id) => [
      // 販売者に入った金額を戻す
      db.prepare(
        `UPDATE pcs SET money = money - (
           SELECT COALESCE(SUM(amount), 0) FROM purchase_payouts WHERE purchase_id = ?1 AND pc_id = pcs.id
         )
         WHERE id IN (SELECT pc_id FROM purchase_payouts WHERE purchase_id = ?1)`
      ).bind(id),
      // 購入者に代金を戻す
      db.prepare(
        `UPDATE pcs SET money = money + (SELECT total FROM purchases WHERE id = ?1)
         WHERE id = (SELECT pc_id FROM purchases WHERE id = ?1)`
      ).bind(id),
      // 在庫を戻す(割引で買ったものは割引の在庫へ。無制限の商品・削除済みの商品はそのまま)
      db.prepare(
        `UPDATE shop_items SET stock = stock + (SELECT quantity FROM purchases WHERE id = ?1)
         WHERE stock IS NOT NULL AND id = (SELECT item_id FROM purchases WHERE id = ?1 AND discount = 0)`
      ).bind(id),
      db.prepare(
        `UPDATE shop_items SET discount_stock = discount_stock + (SELECT quantity FROM purchases WHERE id = ?1)
         WHERE id = (SELECT item_id FROM purchases WHERE id = ?1 AND discount = 1)`
      ).bind(id),
      db.prepare('DELETE FROM purchase_payouts WHERE purchase_id = ?').bind(id),
      db.prepare('DELETE FROM purchases WHERE id = ?').bind(id),
    ],
  },
  sale: {
    table: 'purchase_payouts',
    statements: (db, id) => [
      db.prepare(
        `UPDATE pcs SET money = money - (SELECT amount FROM purchase_payouts WHERE id = ?1)
         WHERE id = (SELECT pc_id FROM purchase_payouts WHERE id = ?1)`
      ).bind(id),
      db.prepare('DELETE FROM purchase_payouts WHERE id = ?').bind(id),
    ],
  },
  casino: game,
  dealer: game,
  casino_month: monthly,
  dealer_month: monthly,
}

// そのPCの所持金履歴に出ているものをすべて、1件ずつ消したときと同じ扱いで消す
export function deleteAllHistoryOfPc(db, pcId) {
  return [
    // 手動の増減・清算・切替
    db.prepare(
      'UPDATE pcs SET money = money - (SELECT COALESCE(SUM(amount), 0) FROM money_logs WHERE pc_id = ?1) WHERE id = ?1'
    ).bind(pcId),
    db.prepare('DELETE FROM money_logs WHERE pc_id = ?').bind(pcId),

    // このPCが販売者として受け取った売上
    db.prepare(
      'UPDATE pcs SET money = money - (SELECT COALESCE(SUM(amount), 0) FROM purchase_payouts WHERE pc_id = ?1) WHERE id = ?1'
    ).bind(pcId),
    db.prepare('DELETE FROM purchase_payouts WHERE pc_id = ?').bind(pcId),

    // このPCの購入(販売者への支払い・在庫も戻す)
    db.prepare(
      `UPDATE pcs SET money = money - (
         SELECT COALESCE(SUM(po.amount), 0) FROM purchase_payouts po
         JOIN purchases pu ON pu.id = po.purchase_id
         WHERE pu.pc_id = ?1 AND po.pc_id = pcs.id
       )
       WHERE id IN (
         SELECT po.pc_id FROM purchase_payouts po JOIN purchases pu ON pu.id = po.purchase_id WHERE pu.pc_id = ?1
       )`
    ).bind(pcId),
    db.prepare(
      'UPDATE pcs SET money = money + (SELECT COALESCE(SUM(total), 0) FROM purchases WHERE pc_id = ?1) WHERE id = ?1'
    ).bind(pcId),
    db.prepare(
      `UPDATE shop_items SET stock = stock + (
         SELECT COALESCE(SUM(quantity), 0) FROM purchases WHERE pc_id = ?1 AND discount = 0 AND item_id = shop_items.id
       )
       WHERE stock IS NOT NULL AND id IN (SELECT item_id FROM purchases WHERE pc_id = ?1 AND discount = 0)`
    ).bind(pcId),
    db.prepare(
      `UPDATE shop_items SET discount_stock = discount_stock + (
         SELECT COALESCE(SUM(quantity), 0) FROM purchases WHERE pc_id = ?1 AND discount = 1 AND item_id = shop_items.id
       )
       WHERE id IN (SELECT item_id FROM purchases WHERE pc_id = ?1 AND discount = 1)`
    ).bind(pcId),
    db.prepare('DELETE FROM purchase_payouts WHERE purchase_id IN (SELECT id FROM purchases WHERE pc_id = ?)').bind(pcId),
    db.prepare('DELETE FROM purchases WHERE pc_id = ?').bind(pcId),

    // このPCがプレイヤーかディーラーだったチンチロ(相手側の増減も取り消す)
    db.prepare(
      `UPDATE pcs SET money = money - (
         SELECT COALESCE(SUM(net), 0) FROM chinchiro_games
         WHERE (pc_id = ?1 OR dealer_pc_id = ?1) AND pc_id = pcs.id
       )
       WHERE id IN (SELECT pc_id FROM chinchiro_games WHERE pc_id = ?1 OR dealer_pc_id = ?1)`
    ).bind(pcId),
    db.prepare(
      `UPDATE pcs SET money = money - (
         SELECT COALESCE(SUM(dealer_delta), 0) FROM chinchiro_games
         WHERE (pc_id = ?1 OR dealer_pc_id = ?1) AND dealer_pc_id = pcs.id
       )
       WHERE id IN (SELECT dealer_pc_id FROM chinchiro_games WHERE pc_id = ?1 OR dealer_pc_id = ?1)`
    ).bind(pcId),
    db.prepare('DELETE FROM chinchiro_games WHERE pc_id = ?1 OR dealer_pc_id = ?1').bind(pcId),

    // 圧縮した月計も同じ扱い
    db.prepare(
      `UPDATE pcs SET money = money - (
         SELECT COALESCE(SUM(net_total), 0) FROM chinchiro_monthly
         WHERE (pc_id = ?1 OR dealer_pc_id = ?1) AND pc_id = pcs.id
       )
       WHERE id IN (SELECT pc_id FROM chinchiro_monthly WHERE pc_id = ?1 OR dealer_pc_id = ?1)`
    ).bind(pcId),
    db.prepare(
      `UPDATE pcs SET money = money - (
         SELECT COALESCE(SUM(dealer_delta_total), 0) FROM chinchiro_monthly
         WHERE (pc_id = ?1 OR dealer_pc_id = ?1) AND dealer_pc_id = pcs.id
       )
       WHERE id IN (SELECT dealer_pc_id FROM chinchiro_monthly WHERE pc_id = ?1 OR dealer_pc_id = ?1)`
    ).bind(pcId),
    db.prepare('DELETE FROM chinchiro_monthly WHERE pc_id = ?1 OR dealer_pc_id = ?1').bind(pcId),
  ]
}
