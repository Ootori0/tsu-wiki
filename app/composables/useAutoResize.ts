// 入力欄(textarea)の高さを中身に合わせて広げる
// scrollHeight は枠線を含まないので、枠線の分を足して最後の行が欠けないようにする
const fit = (el) => {
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + (el.offsetHeight - el.clientHeight) + 'px'
}

export function useAutoResize() {
  const resize = (event) => fit(event.target)

  // ポップアップを開いた直後など、入力済みの文章に合わせて .auto-wrap をまとめて広げる
  const fitAll = async () => {
    await nextTick()
    document.querySelectorAll('.auto-wrap').forEach(fit)
  }

  return { resize, fitAll }
}
