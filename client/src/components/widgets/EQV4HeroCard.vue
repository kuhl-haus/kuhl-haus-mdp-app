<template>
  <div :class="['eqv4-hero-card', { 'eqv4-hero--narrow': heroMode === 'narrow' }]">
    <!-- Symbol block: logo + symbol + flame — left side -->
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

    <!-- Price block: price + change + since-open + as-of — right side -->
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

    <!-- Identity block: company name + SIC — spans full width below; hidden in narrow mode -->
    <div v-if="heroMode === 'wide'" class="eqv4-hero-identity-block">
      <span v-if="companyData?.name" class="eqv4-hero-company-name">{{ companyData.name }}</span>
      <span v-if="companyData?.sic_description" class="eqv4-hero-sic">{{ companyData.sic_description }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmt } from './eqv3Utils.js'

const props = defineProps({
  quoteData:         { type: Object,  default: null },
  companyData:       { type: Object,  default: () => ({}) },
  isLocked:          { type: Boolean, default: true },
  brandingMode:      { type: String,  default: 'logo' },
  activeBrandingUrl: { type: String,  default: null },
  flameIcon:         { type: Object,  default: null },
  heroMode:          { type: String,  default: 'wide' },  // 'wide' | 'narrow'
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
</script>

<style scoped>
/* Hero card — ported directly from EQv3 hero CSS */
.eqv4-hero-card {
  padding: 8px 10px;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;
}

/* Narrow mode: column stack instead of side-by-side row */
.eqv4-hero--narrow {
  flex-direction: column;
  align-items: flex-start;
  flex-wrap: nowrap;
}

/* Symbol block: logo + symbol row — flex row, left side */
.eqv4-hero-symbol-block {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Price block: stacked column, right side in wide / left-aligned in narrow */
.eqv4-hero-price-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}
.eqv4-hero--narrow .eqv4-hero-price-block {
  align-items: flex-start;
}
.eqv4-hero--narrow .eqv4-since-open {
  text-align: left;
}

/* Identity block: spans full width below symbol + price */
.eqv4-hero-identity-block {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  width: 100%;
}

.eqv4-hero-symbol-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.eqv4-hero-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 4px;
  flex-shrink: 0;
}

.eqv4-hero-company-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e2e8f0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.eqv4-hero-sic {
  font-size: 10px;
  color: var(--text-muted, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.eqv4-symbol {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  font-family: system-ui, sans-serif;
}

.eqv4-price {
  font-size: 22px;
  font-weight: 600;
  font-family: 'Roboto Mono', monospace;
  color: #fff;
}

.eqv4-change-badge {
  font-size: 15px;
  font-weight: 600;
  font-family: 'Roboto Mono', monospace;
  padding: 2px 8px;
  border-radius: 12px;
  white-space: nowrap;
}
.eqv4-change-badge.positive {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.35);
}
.eqv4-change-badge.negative {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.eqv4-since-open {
  font-size: 13px;
  color: var(--text-muted, #64748b);
  text-align: right;
}
.eqv4-pos { color: #22c55e; font-weight: 600; }
.eqv4-neg { color: #ef4444; font-weight: 600; }

.eqv4-as-of {
  font-size: 10px;
  color: var(--text-muted, #64748b);
  font-style: italic;
}

.eqv4-flame-icon {
  width: 14px;
  height: 14px;
  vertical-align: middle;
  margin-left: 2px;
  position: relative;
  top: -2px;
}

.eqv4-branding-toggle {
  align-self: flex-start;
  margin-top: 2px;
}
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
