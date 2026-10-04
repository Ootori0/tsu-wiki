import { getSessionUser } from '../../../utils/session'
import { isAdmin } from '../../../utils/permission'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { permissions } = body

  const target = await db.prepare('SELECT permissions FROM users WHERE id = ?').bind(id).first()
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'ユーザーが見つかりません' })
  }

  // admin権限は管理者画面から付け外し不可(現在の状態を維持)
  const targetIsAdmin = JSON.parse(target.permissions).includes('admin')
  const newPermissions = (permissions ?? []).filter((p) => p !== 'admin')
  if (targetIsAdmin) newPermissions.push('admin')

  await db
    .prepare('UPDATE users SET permissions = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(JSON.stringify(newPermissions), id)
    .run()

  return { success: true }
})