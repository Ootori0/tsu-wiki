import { parseStats } from './pcItems'

export function parsePcBody(body) {
  const {
    name, affiliation, office, grade, memo, items, money, stats,
    isRepresentative, isOfficeRepresentative, showTitle, showOffice, showStats, imageBg,
  } = body ?? {}

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  // 級は空欄も可(no_grade = 1。grade 列は 1〜10 の制約があるので 10 のまま置いておく)
  const noGrade = grade === null || grade === undefined || grade === ''
  const gradeNum = noGrade ? 10 : Number(grade)
  if (!Number.isInteger(gradeNum) || gradeNum < 1 || gradeNum > 10) {
    throw createError({ statusCode: 400, statusMessage: '級は1~10で指定するか、空欄にしてください' })
  }

  // カジノの負けでマイナスになり得るので負の値も許可
  const moneyNum = Number(money ?? 0)
  if (!Number.isInteger(moneyNum)) {
    throw createError({ statusCode: 400, statusMessage: '所持金は整数で指定してください' })
  }

  // 画像の背景色は #rrggbb か空(標準)だけ
  const bg = typeof imageBg === 'string' && /^#[0-9a-fA-F]{6}$/.test(imageBg) ? imageBg.toLowerCase() : ''

  return {
    name,
    affiliation: affiliation ?? '',
    office: office ?? '',
    grade: gradeNum,
    noGrade: noGrade ? 1 : 0,
    memo: memo ?? '',
    items: items ?? '',
    stats: JSON.stringify(parseStats(stats)),
    isRepresentative: isRepresentative ? 1 : 0,
    isOfficeRepresentative: isOfficeRepresentative ? 1 : 0,
    showTitle: showTitle === false ? 0 : 1,
    showOffice: showOffice === false ? 0 : 1,
    showStats: showStats ? 1 : 0,
    money: moneyNum,
    imageBg: bg,
  }
}

export function formatPc(r) {
  return {
    ...r,
    grade: r.no_grade ? null : r.grade, // 空欄の級は null で返す
    is_representative: !!r.is_representative,
    is_office_representative: !!r.is_office_representative,
    show_title: !!r.show_title,
    show_office: !!r.show_office,
    show_stats: !!r.show_stats,
    stats: JSON.parse(r.stats || '{}'),
  }
}
