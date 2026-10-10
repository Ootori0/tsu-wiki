export function parsePcBody(body) {
  const {
    name, affiliation, office, grade, memo, money,
    isRepresentative, isOfficeRepresentative, showTitle, showOffice,
  } = body ?? {}

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  const gradeNum = Number(grade)
  if (!Number.isInteger(gradeNum) || gradeNum < 1 || gradeNum > 10) {
    throw createError({ statusCode: 400, statusMessage: '級は1~10で指定してください' })
  }

  const moneyNum = Number(money ?? 0)
  if (!Number.isInteger(moneyNum) || moneyNum < 0) {
    throw createError({ statusCode: 400, statusMessage: '所持金は0以上の整数で指定してください' })
  }

  return {
    name,
    affiliation: affiliation ?? '',
    office: office ?? '',
    grade: gradeNum,
    memo: memo ?? '',
    isRepresentative: isRepresentative ? 1 : 0,
    isOfficeRepresentative: isOfficeRepresentative ? 1 : 0,
    showTitle: showTitle === false ? 0 : 1,
    showOffice: showOffice === false ? 0 : 1,
    money: moneyNum,
  }
}

export function formatPc(r) {
  return {
    ...r,
    is_representative: !!r.is_representative,
    is_office_representative: !!r.is_office_representative,
    show_title: !!r.show_title,
    show_office: !!r.show_office,
  }
}
