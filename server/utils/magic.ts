// 魔法の所持者: ownerPcId を指定したら魔法の作成者のPCであることを確かめ、自由記述(owner)は空にする
export async function resolveMagicOwner(db, body, creatorId) {
  const pcId = body?.ownerPcId === null || body?.ownerPcId === undefined || body?.ownerPcId === '' ? null : Number(body.ownerPcId)
  if (pcId === null) return { owner: body?.owner ?? '', ownerPcId: null }

  const pc = await db.prepare('SELECT created_by FROM pcs WHERE id = ?').bind(pcId).first()
  if (!pc || pc.created_by !== creatorId) {
    throw createError({ statusCode: 400, statusMessage: '所持者には自分のPCを選んでください' })
  }
  return { owner: '', ownerPcId: pcId }
}

// 一覧用: 所持者のPC名(owner_pc_name)を付けて取り出すSELECT
export const MAGIC_SELECT = `SELECT magics.*, pcs.name AS owner_pc_name
  FROM magics LEFT JOIN pcs ON pcs.id = magics.owner_pc_id`

// 魔道具・AFは、所持者のPCの所持品(倉庫)にも入れておく
export const ITEM_MAGIC_TYPES = ['魔道具', 'AF']

// 魔法を作成・更新したあとに呼ぶ。所持品の側を魔法に合わせる
// ・魔道具/AFで所持者が自分のPC → そのPCの所持品に1つ置く(なければ倉庫に追加。名前・効果は魔法に合わせ、区分や大きさはそのまま)
// ・それ以外になった → 置いていた所持品を外す
export async function syncMagicItem(db, magicId) {
  const magic = await db.prepare('SELECT id, type, name, effect, owner_pc_id FROM magics WHERE id = ?').bind(magicId).first()
  const existing = await db.prepare('SELECT id FROM pc_items WHERE magic_id = ?').bind(magicId).first()
  const wanted = magic && ITEM_MAGIC_TYPES.includes(magic.type) && magic.owner_pc_id

  if (wanted && existing) {
    await db
      .prepare('UPDATE pc_items SET pc_id = ?, name = ?, effect = ? WHERE id = ?')
      .bind(magic.owner_pc_id, magic.name, magic.effect ?? '', existing.id)
      .run()
  } else if (wanted) {
    await db
      .prepare(
        `INSERT INTO pc_items (pc_id, name, quantity, size, category, effect, magic_id)
         VALUES (?, ?, 1, 'none', 'storage', ?, ?)`
      )
      .bind(magic.owner_pc_id, magic.name, magic.effect ?? '', magic.id)
      .run()
  } else if (existing) {
    await db.prepare('DELETE FROM pc_items WHERE id = ?').bind(existing.id).run()
  }
}
