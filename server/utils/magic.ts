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
