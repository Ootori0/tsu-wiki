// 所持金編集ダイアログの開閉(メニュー・マイページなどどこからでも開ける)
export const useMoneyDialog = () => {
  const open = useState('money-dialog-open', () => false)
  const pcId = useState('money-dialog-pc', () => null)

  const openMoneyDialog = (id = null) => {
    if (id) pcId.value = id
    open.value = true
  }

  return { open, pcId, openMoneyDialog }
}
