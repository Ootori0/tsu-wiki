<script setup>
const props = defineProps({
  value: { type: Number, default: 1 },
  rolling: { type: Boolean, default: false },
})

// 3x3 のマスのうち点を打つ位置
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}
const pips = computed(() => PIPS[props.value] ?? [])
</script>

<template>
  <div class="die" :class="{ rolling, one: value === 1 }">
    <span v-for="i in 9" :key="i" class="cell">
      <span v-if="pips.includes(i - 1)" class="pip" />
    </span>
  </div>
</template>

<style scoped>
.die {
  width: 48px;
  height: 48px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 6px;
  box-sizing: border-box;
  background: #fff;
  border: 2px solid #000;
  border-radius: 8px;
  box-shadow: 2px 2px 0 #000;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pip {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #000;
}

/* 1の目は赤く大きく */
.die.one .pip {
  width: 14px;
  height: 14px;
  background: #c00;
}

.die.rolling {
  animation: shake 0.12s linear infinite;
}

@keyframes shake {
  0% { transform: rotate(-12deg) translateY(-2px); }
  50% { transform: rotate(12deg) translateY(2px); }
  100% { transform: rotate(-12deg) translateY(-2px); }
}
</style>
