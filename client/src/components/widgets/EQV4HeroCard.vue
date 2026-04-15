<template>
  <div class="eqv4-hero-card">
    <!-- Symbol + branding image -->
    <div class="eqv4-hero-symbol-block">
      <img
        v-if="activeBrandingUrl"
        :src="activeBrandingUrl"
        class="eqv4-hero-logo"
        :alt="brandingMode === 'icon' ? 'Company icon' : 'Company logo'"
      />
      <div class="eqv4-hero-symbol-row">
        <span class="eqv4-symbol">{{ quoteData?.symbol }}</span>
        <img v-if="flameIcon" :src="flameIcon.src" :title="flameIcon.tooltip" class="eqv4-flame-icon" />
      </div>
      <!-- Branding toggle — edit mode only -->
      <button
        v-if="!isLocked"
        class="eqv4-branding-toggle filter-btn"
        :title="brandingMode === 'logo' ? 'Switch to icon' : 'Switch to logo'"
        @click="emit('toggle-branding')"
      >{{ brandingMode === 'logo' ? 'icon' : 'logo' }}</button>
    </div>

    <!-- Price block -->
    <div class="eqv4-hero-price-block">
      <span class="eqv4-price">${{ fmt(quoteData?.close, 2) }}</span>
      <span :class="['eqv4-change-badge', changeClass]">
        {{ (quoteData?.change ?? 0) >= 0 ? '+' : '' }}{{ fmt(quoteData?.change, 2) }}
        ({{ (quoteData?.pct_change ?? 0) >= 0 ? '+' : '' }}{{ fmt(quoteData?.pct_change, 2) }}%)
      </span>
      <div class="eqv4-since-open">
        since open
        <span :class="(quoteData?.pct_change_since_open ?? 0) >= 0 ? 'eqv4-pos' : 'eqv4-neg'">
          <span v-if="quoteData?.change_since_open != null">
            {{ (quoteData?.change_since_open ?? 0) >= 0 ? '+' : '-' }}${{ fmt(Math.abs(quoteData?.change_since_open ?? 0), 2) }}
          </span>
          ({{ (quoteData?.pct_change_since_open ?? 0) >= 0 ? '+' : '' }}{{ fmt(quoteData?.pct_change_since_open, 2) }}%)
        </span>
      </div>
      <div class="eqv4-as-of">as of {{ dataAge }}</div>
    </div>

    <!-- Identity block: name + SIC -->
    <div class="eqv4-hero-identity-block">
      <span v-if="companyName" class="eqv4-hero-company-name">{{ companyName }}</span>
      <span v-if="companyData?.sic_description" class="eqv4-hero-sic">{{ companyData.sic_description }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmt } from './eqv3Utils.js'

const props = defineProps({
  quoteData:      { type: Object,  required: true },
  companyData:    { type: Object,  default: () => ({}) },
  isLocked:       { type: Boolean, default: true },
  brandingMode:   { type: String,  default: 'logo' },
  activeBrandingUrl: { type: String, default: null },
  flameIcon:      { type: Object,  default: null },
})

const emit = defineEmits(['toggle-branding'])

const changeClass = computed(() =>
  (props.quoteData?.pct_change ?? 0) >= 0 ? 'positive' : 'negative'
)

const dataAge = computed(() => {
  const ts = props.quoteData?.end_timestamp
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
})

const companyName = computed(() => props.companyData?.name ?? null)
</script>

<style scoped>
.eqv4-hero-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
  overflow: auto;
  padding: 6px;
  box-sizing: border-box;
}
.eqv4-hero-symbol-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.eqv4-hero-logo {
  height: 32px;
  max-width: 120px;
  object-fit: contain;
}
.eqv4-hero-symbol-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.eqv4-symbol {
  font-family: 'Roboto Mono', monospace;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #e2e8f0);
}
.eqv4-flame-icon {
  width: 16px;
  height: 16px;
}
.eqv4-branding-toggle {
  align-self: flex-start;
  margin-top: 2px;
}
.eqv4-hero-price-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.eqv4-price {
  font-family: 'Roboto Mono', monospace;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary, #e2e8f0);
}
.eqv4-change-badge {
  font-family: 'Roboto Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
}
.eqv4-change-badge.positive { background: rgba(34,197,94,0.15); color: #22c55e; }
.eqv4-change-badge.negative { background: rgba(239,68,68,0.15);  color: #ef4444; }
.eqv4-since-open {
  font-size: 11px;
  color: var(--text-muted, #64748b);
}
.eqv4-pos { color: #22c55e; }
.eqv4-neg { color: #ef4444; }
.eqv4-as-of {
  font-size: 10px;
  color: var(--text-muted, #64748b);
  font-style: italic;
}
.eqv4-hero-identity-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.eqv4-hero-company-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e2e8f0);
}
.eqv4-hero-sic {
  font-size: 11px;
  color: var(--text-muted, #64748b);
}
/* Shared filter-btn style (matches EQv3 pill style) */
.filter-btn {
  background: none;
  border: 1px solid var(--border, #2d2d3d);
  border-radius: 4px;
  color: var(--text-muted, #64748b);
  font-size: 11px;
  padding: 2px 6px;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  transition: border-color 0.15s, color 0.15s;
}
.filter-btn:hover {
  border-color: var(--pd-accent, #7c3aed);
  color: var(--pd-accent, #7c3aed);
}
</style>
