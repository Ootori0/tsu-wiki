// 画面右上にスライドして出る通知。エラーは読み切れるよう長めに出す
const DURATION = { success: 3000, error: 6000 }

export const useToast = () => {
  const toasts = useState('toasts', () => [])

  const dismiss = (id) => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  const show = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    toasts.value = [...toasts.value, { id, message, type }]
    setTimeout(() => dismiss(id), DURATION[type] ?? DURATION.success)
  }

  return { toasts, show, dismiss }
}
