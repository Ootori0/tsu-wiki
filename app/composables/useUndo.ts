// 直前の操作(購入・所持金の手動の増減)の取り消し
export const useUndo = () => {
  const { show } = useToast()

  // 成功の通知に「取り消す」ボタンを付ける。押されたら取り消して onUndone を呼ぶ
  const showWithUndo = (message, kind, id, onUndone) => {
    if (!id) return show(message)
    show(message, 'success', {
      label: '取り消す',
      handler: async () => {
        try {
          await $fetch('/api/history/undo', { method: 'POST', body: { kind, id } })
          show('取り消しました')
          await onUndone?.()
        } catch (e) {
          show(e?.data?.statusMessage ?? '取り消せませんでした', 'error')
        }
      },
    })
  }

  return { showWithUndo }
}
