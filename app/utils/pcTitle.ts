// [所属][級]級協会員[代表][名前]
export function pcTitle(pc) {
  if (!pc) return ''
  return `${pc.affiliation ?? ''}${pc.grade}級協会員${pc.is_representative ? '代表' : ''} ${pc.name}`
}
