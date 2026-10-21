// 入力欄(textarea)の高さを中身に合わせて広げる
// scrollHeight は枠線を含まないので、枠線の分を足して最後の行が欠けないようにする
// 高さを測るために一度 auto に縮めると、外側のスクロール位置が押し戻されて画面が上下に揺れるので、測ったあとで元に戻す
const fit = (el) => {
  const scrollers = []
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node.scrollTop) scrollers.push([node, node.scrollTop])
  }
  const windowY = window.scrollY

  el.style.height = 'auto'
  el.style.height = el.scrollHeight + (el.offsetHeight - el.clientHeight) + 'px'

  for (const [node, top] of scrollers) node.scrollTop = top
  if (window.scrollY !== windowY) window.scrollTo(0, windowY)
}

export function useAutoResize() {
  const resize = (event) => fit(event.target)

  // ポップアップを開いた直後など、入力済みの文章に合わせて .auto-wrap をまとめて広げる
  const fitAll = async () => {
    await nextTick()
    const els = [...document.querySelectorAll('.auto-wrap')]
    els.forEach(fit)
    // 広げた結果レイアウトが変わって幅が変わることがあるので、描画後にもう一度合わせる
    requestAnimationFrame(() => els.forEach(fit))
  }

  return { resize, fitAll }
}
