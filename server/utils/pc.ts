export function parsePcBody(body) {
  const { name, affiliation, grade, memo, isRepresentative } = body ?? {}

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  const gradeNum = Number(grade)
  if (!Number.isInteger(gradeNum) || gradeNum < 1 || gradeNum > 10) {
    throw createError({ statusCode: 400, statusMessage: '級は1~10で指定してください' })
  }

  return {
    name,
    affiliation: affiliation ?? '',
    grade: gradeNum,
    memo: memo ?? '',
    isRepresentative: isRepresentative ? 1 : 0,
  }
}

export function formatPc(r) {
  return { ...r, is_representative: !!r.is_representative }
}
