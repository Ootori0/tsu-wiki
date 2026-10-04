// [所属][級]級協会員 [名前] / 代表の場合は [所属]代表 [名前] (肩書き非表示の場合は名前のみ)
export function pcTitle(pc) {
  if (!pc) return ''
  if (pc.show_title === false) return pc.name
  const rank = pc.is_representative ? '代表' : `${pc.grade}級協会員`
  return `${pc.affiliation ?? ''}${rank} ${pc.name}`
}
