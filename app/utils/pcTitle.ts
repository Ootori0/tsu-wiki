// 肩書き: [所属][級]級協会員 / 代表の場合は [所属]代表 (肩書き非表示の場合は空)
export function pcRank(pc) {
  if (!pc || pc.show_title === false) return ''
  const rank = pc.is_representative ? '代表' : `${pc.grade}級協会員`
  return `${pc.affiliation ?? ''}${rank}`
}

// [肩書き] [名前]
export function pcTitle(pc) {
  if (!pc) return ''
  const rank = pcRank(pc)
  return rank ? `${rank} ${pc.name}` : pc.name
}
