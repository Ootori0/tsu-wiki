// 期限付きのアカウント作成リンク
export const INVITE_HOURS = [1, 24, 72, 168] // 発行時に選べる期限(時間)

export function generateInviteToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function hashInviteToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// 使えるリンク(未使用で期限内)を探す
export async function findUsableInvite(db: any, token: string) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null
  return db
    .prepare("SELECT id, expires_at FROM invites WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')")
    .bind(await hashInviteToken(token))
    .first()
}
