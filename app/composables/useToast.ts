// 画面右上にスライドして出る通知。エラーは読み切れるよう長めに出す
// action({ label, handler })を付けると、押せるボタン(「取り消す」など)を出し、押す時間があるよう長めに出す
const DURATION = { success: 3000, error: 6000, action: 10000 }

export const useToast = () => {
  const toasts = useState('toasts', () => [])

  const dismiss = (id) => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  const show = (message, type = 'success', action = null) => {
    const id = `${Date.now()}-${Math.random()}`
    toasts.value = [...toasts.value, { id, message, type, action }]
    setTimeout(() => dismiss(id), action ? DURATION.action : (DURATION[type] ?? DURATION.success))
  }

  return { toasts, show, dismiss }
}
