<script setup>
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps({
  text: {
    type: String,
    default: '',
  },
})

marked.setOptions({
  breaks: true,
  gfm: true,
})

const renderedHtml = computed(() => {
  let src = props.text || ''

  // スポイラー: ||text|| → <span class="spoiler">text</span>(onclickは埋め込まない)
  src = src.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>')

  const rawHtml = marked.parse(src)

  // 標準設定のままサニタイズ(onclick等の危険な属性はすべて除去される)
  return DOMPurify.sanitize(rawHtml)
})

// スポイラーのクリック処理はVue側のイベント委譲で行う
const handleClick = (event) => {
  if (event.target.classList.contains('spoiler')) {
    event.target.classList.toggle('revealed')
  }
}
</script>

<template>
  <div class="markdown-body" v-html="renderedHtml" @click="handleClick"></div>
</template>

<style scoped>
.markdown-body {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--color-text, #000);
  word-break: break-word;
}

.markdown-body :deep(strong) {
  font-weight: bold;
}

.markdown-body :deep(em) {
  font-style: italic;
}

.markdown-body :deep(del) {
  text-decoration: line-through;
}

.markdown-body :deep(u) {
  text-decoration: underline;
}

.markdown-body :deep(code) {
  background: rgba(0, 0, 0, 0.08);
  padding: 2px 5px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.85em;
}

.markdown-body :deep(pre) {
  background: rgba(0, 0, 0, 0.08);
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid var(--color-accent, #ffd400);
  margin: 8px 0;
  padding: 4px 12px;
  color: var(--color-text, #000);
  opacity: 0.85;
}

.markdown-body :deep(a) {
  color: #1e88e5;
  text-decoration: underline;
}

.markdown-body :deep(.spoiler) {
  background: #333;
  color: transparent;
  border-radius: 3px;
  padding: 0 2px;
  cursor: pointer;
  transition: color 0.1s;
}

.markdown-body :deep(.spoiler.revealed) {
  color: #fff;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.4em;
  margin: 6px 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  font-weight: bold;
  margin: 10px 0 6px;
}

.markdown-body :deep(h1) { font-size: 1.3em; }
.markdown-body :deep(h2) { font-size: 1.15em; }
.markdown-body :deep(h3) { font-size: 1.05em; }
</style>