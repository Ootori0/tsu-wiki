// 肩書き: [所属][級]級協会員 or [所属]代表 + [事務所] or [事務所]代表
// (肩書き非表示の場合は空、事務所非表示・未記入の場合は事務所部分を省略)
export function pcRankParts(pc) {
  if (!pc || pc.show_title === false) return []
  const parts = [
    `${pc.affiliation ?? ''}${pc.is_representative ? '代表' : `${pc.grade}級協会員`}`,
  ]
  if (pc.office && pc.show_office !== false) {
    parts.push(`${pc.office}${pc.is_office_representative ? '代表' : ''}`)
  }
  return parts
}

export function pcRank(pc) {
  return pcRankParts(pc).join(' ')
}

// [肩書き] [名前]
export function pcTitle(pc) {
  if (!pc) return ''
  const rank = pcRank(pc)
  return rank ? `${rank} ${pc.name}` : pc.name
}

// 役職: 協会代表 / 事務所代表
export function pcRoleList(pc) {
  if (!pc) return []
  const roles = []
  if (pc.is_representative) roles.push('協会代表')
  if (pc.is_office_representative) roles.push('事務所代表')
  return roles
}

export function pcRoles(pc) {
  return pcRoleList(pc).join('・')
}
