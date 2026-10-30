// チンチロの勝負記録の圧縮: この日数より前の勝負を、PC・ディーラー・月(日本時間)ごとの月計にまとめる
export const COMPRESS_KEEP_DAYS = 7

// 'YYYY-MM-DD HH:MM:SS'(UTC。created_at と同じ形式)
export function compressCutoff() {
  return new Date(Date.now() - COMPRESS_KEEP_DAYS * 86400_000).toISOString().slice(0, 19).replace('T', ' ')
}
