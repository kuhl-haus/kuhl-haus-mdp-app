<template>
  <div class="eqv4-picker">
    <button class="eqv4-picker-btn filter-btn" @click="open = !open">+ Add card</button>
    <div v-if="open" class="eqv4-picker-dropdown">
      <button
        v-for="card in absentCards"
        :key="card.id"
        class="eqv4-picker-item"
        @click="select(card.id)"
      >{{ card.label }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  absentCards: { type: Array, required: true },
})

const emit = defineEmits(['add-card'])
const open = ref(false)

const select = (cardId) => {
  open.value = false
  emit('add-card', cardId)
}
</script>

<style scoped>
.eqv4-picker { position: relative; }
.filter-btn {
  background: none;
  border: 1px solid var(--border, #2d2d3d);
  border-radius: 4px;
  color: var(--text-muted, #64748b);
  font-size: 11px;
  padding: 3px 8px;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  transition: border-color 0.15s, color 0.15s;
}
.filter-btn:hover {
  border-color: var(--pd-accent, #7c3aed);
  color: var(--pd-accent, #7c3aed);
}
.eqv4-picker-dropdown {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 0;
  background: var(--surface, #141420);
  border: 1px solid var(--border, #2d2d3d);
  border-radius: 4px;
  min-width: 140px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px;
}
.eqv4-picker-item {
  background: none;
  border: none;
  color: var(--text-primary, #e2e8f0);
  font-size: 12px;
  padding: 5px 8px;
  cursor: pointer;
  text-align: left;
  border-radius: 3px;
  font-family: system-ui, sans-serif;
}
.eqv4-picker-item:hover {
  background: var(--bg, #0d0d12);
  color: var(--pd-accent, #7c3aed);
}
</style>
