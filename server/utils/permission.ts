const OVERRIDE_PERMISSIONS = ['admin', 'KP', 'SKP']

export function canBypass(userPermissions) {
  if (!userPermissions) return false
  return userPermissions.some((p) => OVERRIDE_PERMISSIONS.includes(p))
}

export function canView(userPermissions, visiblePermissions) {
  // 誰でも見てよい設定(空配列)
  if (!visiblePermissions || visiblePermissions.length === 0) return true

  if (!userPermissions) return false // 未ログインは空配列でない限り不可

  // admin/KP/SKPは常にスルー
  if (canBypass(userPermissions)) return true

  // 共通の権限が1つでもあれば閲覧可
  return userPermissions.some((p) => visiblePermissions.includes(p))
}

export function isAdmin(userPermissions) {
  if (!userPermissions) return false
  return userPermissions.includes('admin')
}