<template>
  <div :class="['eqv4-hero-card', heroMode === 'wide' ? 'eqv4-hero--wide' : 'eqv4-hero--narrow']">

    <!-- Wide mode: two columns — left: logo/symbol/flame/name/sic; right: price/change/since-open/as-of -->
    <template v-if="heroMode === 'wide'">
      <div class="eqv4-hero-left">
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
        <span v-if="companyData?.name" class="eqv4-hero-company-name">{{ companyData.name }}</span>
        <span v-if="companyData?.sic_description" class="eqv4-hero-sic">{{ companyData.sic_description }}</span>
        <button
          v-if="!isLocked"
          class="eqv4-branding-toggle filter-btn"
          :title="brandingMode === 'logo' ? 'Switch to icon' : 'Switch to logo'"
          @click="emit('toggle-branding')"
        >{{ brandingMode === 'logo' ? 'icon' : 'logo' }}</button>
      </div>
      <div class="eqv4-hero-right">
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
    </template>

    <!-- Narrow mode: vertical stack — symbol → price → identity -->
    <template v-else>
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
        <button
          v-if="!isLocked"
          class="eqv4-branding-toggle filter-btn"
          :title="brandingMode === 'logo' ? 'Switch to icon' : 'Switch to logo'"
          @click="emit('toggle-branding')"
        >{{ brandingMode === 'logo' ? 'icon' : 'logo' }}</button>
      </div>
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
      <div class="eqv4-hero-identity-block">
        <span v-if="companyData?.name" class="eqv4-hero-company-name">{{ companyData.name }}</span>
        <span v-if="companyData?.sic_description" class="eqv4-hero-sic">{{ companyData.sic_description }}</span>
      </div>
    </template>

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
/* ── Base ── */
.eqv4-hero-card {
  height: 100%;
  overflow: auto;
  padding: 6px;
  box-sizing: border-box;
  display: flex;
  gap: 6px;
}

/* ── Wide mode: two columns ── */
.eqv4-hero--wide {
  flex-direction: row;
  align-items: flex-start;
}

/* ── Narrow mode: vertical stack ── */
.eqv4-hero--narrow {
  flex-direction: column;
}
.eqv4-hero--narrow .eqv4-hero-symbol-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.eqv4-hero--narrow .eqv4-hero-price-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.eqv4-hero--narrow .eqv4-hero-identity-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}
.eqv4-hero-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;
  min-width: 0;
  flex: 1;
}
.eqv4-hero-right {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
  flex-shrink: 0;
}

/* ── Shared elements ── */
.eqv4-hero-symbol-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.eqv4-hero-logo {
  height: 32px;
  max-width: 120px;
  object-fit: contain;
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
.eqv4-hero-company-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e2e8f0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eqv4-hero-sic {
  font-size: 11px;
  color: var(--text-muted, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
