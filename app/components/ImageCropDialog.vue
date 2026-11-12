<script setup>
// 画像を正方形に切り抜くポップアップ
// 枠の中で画像をドラッグして位置を、スライダーで拡大率を決める。「決定」で正方形の画像(Blob)を返す
const open = defineModel({ type: Boolean, default: false })

const props = defineProps({
  file: { type: Object, default: null }, // File
  outputSize: { type: Number, default: 512 }, // 出力する正方形の一辺(px)
})

const emit = defineEmits(['crop'])

const VIEW = 260 // 枠の一辺(画面上のpx)
const src = ref('')
const natural = ref({ w: 0, h: 0 })
const zoom = ref(1) // 1 = 短い辺が枠にぴったり
const pos = ref({ x: 0, y: 0 }) // 枠の左上から見た画像の左上の位置
const saving = ref(false)

const baseScale = computed(() => (natural.value.w ? VIEW / Math.min(natural.value.w, natural.value.h) : 1))
const scale = computed(() => baseScale.value * zoom.value)
const shown = computed(() => ({ w: natural.value.w * scale.value, h: natural.value.h * scale.value }))

// 枠に隙間ができないように位置を収める
const clamp = (p) => ({
  x: Math.min(0, Math.max(VIEW - shown.value.w, p.x)),
  y: Math.min(0, Math.max(VIEW - shown.value.h, p.y)),
})

watch(() => props.file, (file) => {
  if (src.value) URL.revokeObjectURL(src.value)
  src.value = file ? URL.createObjectURL(file) : ''
  natural.value = { w: 0, h: 0 }
})
onBeforeUnmount(() => {
  if (src.value) URL.revokeObjectURL(src.value)
})

const onLoad = (e) => {
  natural.value = { w: e.target.naturalWidth, h: e.target.naturalHeight }
  zoom.value = 1
  // 最初は中央に合わせる
  pos.value = clamp({ x: (VIEW - shown.value.w) / 2, y: (VIEW - shown.value.h) / 2 })
}

// 拡大率を変えるときは枠の中心がずれないようにする
const setZoom = (z) => {
  const cx = (VIEW / 2 - pos.value.x) / scale.value
  const cy = (VIEW / 2 - pos.value.y) / scale.value
  zoom.value = Math.min(4, Math.max(1, Number(z) || 1))
  pos.value = clamp({ x: VIEW / 2 - cx * scale.value, y: VIEW / 2 - cy * scale.value })
}

// ドラッグで位置を動かす(マウス・タッチ共通)
let drag = null
const onPointerDown = (e) => {
  drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: pos.value.x, py: pos.value.y }
  e.currentTarget.setPointerCapture(e.pointerId)
}
const onPointerMove = (e) => {
  if (!drag || drag.id !== e.pointerId) return
  pos.value = clamp({ x: drag.px + e.clientX - drag.sx, y: drag.py + e.clientY - drag.sy })
}
const onPointerUp = () => {
  drag = null
}
const onWheel = (e) => setZoom(zoom.value * (e.deltaY < 0 ? 1.1 : 1 / 1.1))

const imgEl = ref(null)
const crop = async () => {
  if (!imgEl.value || !natural.value.w) return
  saving.value = true
  try {
    const size = VIEW / scale.value // 元画像での切り抜く一辺
    const out = Math.round(Math.min(props.outputSize, size))
    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    canvas.getContext('2d').drawImage(imgEl.value, -pos.value.x / scale.value, -pos.value.y / scale.value, size, size, 0, 0, out, out)
    const toBlob = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.85))
    const webp = await toBlob('image/webp')
    emit('crop', webp?.type === 'image/webp' ? webp : await toBlob('image/jpeg'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <FormDialog v-model="open" title="画像の切り抜き" save-label="決定" :save-disabled="saving || !natural.w" @save="crop">
    <div class="crop-wrap">
      <div
        class="crop-view"
        :style="{ width: `${VIEW}px`, height: `${VIEW}px` }"
        @pointerdown.prevent="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @wheel.prevent="onWheel"
      >
        <img
          v-if="src"
          ref="imgEl"
          :src="src"
          alt=""
          draggable="false"
          :style="{ width: `${shown.w}px`, height: `${shown.h}px`, transform: `translate(${pos.x}px, ${pos.y}px)` }"
          @load="onLoad"
        />
      </div>
      <label class="crop-zoom">
        <v-icon icon="mdi-magnify-minus-outline" size="18" />
        <input type="range" min="1" max="4" step="0.01" :value="zoom" aria-label="拡大率" @input="setZoom($event.target.value)" />
        <v-icon icon="mdi-magnify-plus-outline" size="18" />
      </label>
      <p class="crop-hint">ドラッグで位置、スライダーで大きさを決めます。枠の中が画像になります。</p>
    </div>
  </FormDialog>
</template>

<style scoped>
.crop-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3, 12px);
}

.crop-view {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--color-text, #000);
  background: repeating-conic-gradient(rgba(0, 0, 0, 0.08) 0 25%, transparent 0 50%) 0 0 / 16px 16px;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.crop-view:active {
  cursor: grabbing;
}

.crop-view img {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  transform-origin: 0 0;
  pointer-events: none;
}

.crop-zoom {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 260px;
}

.crop-zoom input {
  flex: 1;
  accent-color: var(--color-text, #000);
}

.crop-hint {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.7;
  text-align: center;
}
</style>
