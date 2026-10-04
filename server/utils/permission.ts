const OVERRIDE_PERMISSIONS = ['admin', 'KP', 'SKP']
const FULL_ACCESS_PERMISSIONS = ['admin', 'KP']

export function canBypass(userPermissions) {
  if (!userPermissions) return false
  return userPermissions.some((p) => OVERRIDE_PERMISSIONS.includes(p))
}

export function canView(userPermissions, visiblePermissions) {
  // 誰でも見てよい設定(空配列)
  if (!visiblePermissions || visiblePermissions.length === 0) return true

  if (!userPermissions) return false // 未ログインは空配列でない限り不可

  // admin/KPは常にスルー
  if (userPermissions.some((p) => FULL_ACCESS_PERMISSIONS.includes(p))) return true

  // SKPはKP/adminのみに公開された魔法以外はスルー
  if (userPermissions.includes('SKP')) {
    return !visiblePermissions.every((p) => FULL_ACCESS_PERMISSIONS.includes(p))
  }

  // 共通の権限が1つでもあれば閲覧可
  return userPermissions.some((p) => visiblePermissions.includes(p))
}

export function isAdmin(userPermissions) {
  if (!userPermissions) return false
  return userPermissions.includes('admin')
}