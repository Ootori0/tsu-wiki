// スマホで入力欄を選んだときやキーボードが出たときに、カーソルのある行を見えている範囲の中央に合わせる
// (文字の入力・改行・削除のたびには動かさない。入力中の位置はブラウザに任せる)
const ANCHOR = 0.5 // 見えている範囲の上端から何割の位置に置くか

// textarea 内のカーソル位置(入力欄の上端からの距離)を、同じ見た目の写しを作って測る
function caretOffset(el: HTMLTextAreaElement) {
  const style = window.getComputedStyle(el)
  const mirror = document.createElement('div')
  for (const prop of [
    'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight',
    'textTransform', 'wordSpacing', 'textIndent', 'tabSize',
  ] as const) {
    mirror.style[prop] = style[prop]
  }
  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.top = '0'
  mirror.style.left = '-9999px'
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.overflowWrap = 'break-word'
  mirror.style.wordBreak = style.wordBreak

  mirror.textContent = el.value.substring(0, el.selectionEnd ?? el.value.length)
  const marker = document.createElement('span')
  marker.textContent = '​'
  mirror.appendChild(marker)
  document.body.appendChild(mirror)

  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5
  const top = marker.offsetTop - el.scrollTop
  document.body.removeChild(mirror)
  return { top, bottom: top + lineHeight }
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node)
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node
    node = node.parentElement
  }
  return null
}

function keepCaretVisible(el: Element | null) {
  if (!(el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) return
  if (el instanceof HTMLInputElement && ['checkbox', 'radio', 'button', 'submit'].includes(el.type)) return

  const rect = el.getBoundingClientRect()
  let caretTop = rect.top
  let caretBottom = rect.bottom
  if (el instanceof HTMLTextAreaElement) {
    const offset = caretOffset(el)
    caretTop = rect.top + offset.top
    caretBottom = rect.top + offset.bottom
  }

  // 見えている範囲 = 画面のうちキーボードに隠れていない部分 ∩ スクロールする枠
  const vv = window.visualViewport
  let visibleTop = vv ? vv.offsetTop : 0
  let visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
  const container = scrollParent(el)
  if (container) {
    const box = container.getBoundingClientRect()
    visibleTop = Math.max(visibleTop, box.top)
    visibleBottom = Math.min(visibleBottom, box.bottom)
  }

  const target = visibleTop + (visibleBottom - visibleTop) * ANCHOR
  const delta = (caretTop + caretBottom) / 2 - target
  if (Math.abs(delta) < 1) return

  if (container) container.scrollTop += delta
  else window.scrollBy(0, delta)
}

export default defineNuxtPlugin(() => {
  // 入力欄を選んだ直後は、キーボードが出きってから合わせる
  document.addEventListener('focusin', (e) => {
    setTimeout(() => keepCaretVisible(e.target as Element), 350)
  })

  // キーボードの出し入れなどで見えている範囲が変わったとき
  window.visualViewport?.addEventListener('resize', () => {
    requestAnimationFrame(() => keepCaretVisible(document.activeElement))
  })
})
