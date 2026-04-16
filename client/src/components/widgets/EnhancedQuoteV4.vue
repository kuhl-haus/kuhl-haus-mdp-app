<template>
  <div class="eqv4-widget" ref="widgetEl">
    <!-- Ticker input bar — always visible -->
    <div class="eqv4-controls">
      <input
        v-model="inputTicker"
        class="eqv4-input"
        placeholder="Enter ticker (e.g. AAPL)"
        maxlength="10"
        spellcheck="false"
        @keyup.enter="applyInput"
        @keyup.escape="inputTicker = ''"
      />
      <button class="eqv4-go-btn" @click="applyInput" @touchend.prevent="applyInput" title="Load quote">Go</button>
    </div>

    <!-- Status overlay — shown over the grid when no ticker or no data yet -->
    <div v-if="!activeTicker" class="eqv4-overlay">
      <span class="eqv4-empty-icon">⚡</span>
      <span class="eqv4-empty-text">Enter a ticker above, or link to a scanner and click a row</span>
    </div>
    <div v-else-if="!quoteData" class="eqv4-overlay">
      <span class="eqv4-empty-icon">⏳</span>
      <span class="eqv4-empty-text">Waiting for data for <strong>{{ activeTicker }}</strong>...</span>
    </div>

    <!-- Grid — always rendered so layout is visible and configurable immediately -->
    <div class="eqv4-body">
      <GridLayout
        v-model:layout="internalLayout"
        :col-num="gridCols"
        :row-height="gridRowHeight"
        :margin="[5, 5]"
        :is-draggable="!isLocked"
        :is-resizable="!isLocked"
        :vertical-compact="false"
        :use-css-transforms="true"
        @layout-updated="onLayoutUpdated"
      >
        <GridItem
          v-for="item in internalLayout"
          :key="item.i"
          :x="item.x" :y="item.y" :w="item.w" :h="item.h" :i="item.i"
          class="eqv4-grid-item"
        >
          <!-- Card header: label + edit-mode controls
               Suppressed for company-news — that card owns its full header -->
          <div v-if="item.i !== 'company-news'" class="eqv4-card-header">
            <span class="eqv4-card-label">{{ cardLabel(item.i) }}</span>
            <span v-if="!isLocked" class="eqv4-card-controls">
              <!-- Hero layout toggle -->
              <button
                v-if="item.i === 'hero'"
                class="eqv4-card-toggle"
                :title="heroMode === 'wide' ? 'Switch to narrow layout' : 'Switch to wide layout'"
                @click="toggleHeroMode"
              >{{ heroMode === 'wide' ? 'wide' : 'narrow' }}</button>
              <!-- Chips toggle for chipsCapable cards -->
              <button
                v-if="isChipsCapable(item.i)"
                :class="['eqv4-card-toggle', { 'eqv4-card-toggle--active': chipCardIds.has(item.i) }]"
                :title="chipCardIds.has(item.i) ? 'Switch to list mode' : 'Switch to chips mode'"
                @click="toggleCardChips(item.i)"
              >{{ chipCardIds.has(item.i) ? 'chips' : 'list' }}</button>
              <!-- Remove button -->
              <button
                class="eqv4-card-remove"
                title="Remove card"
                @click="removeCard(item.i)"
              >✕</button>
            </span>
          </div>

          <!-- Card body: dynamic component by card id -->
          <component
            :is="cardComponent(item.i)"
            :quote-data="quoteData"
            :company-data="companyData"
            :short-interest-data="shortInterestData"
            :loading="item.i === 'short' ? shortInterestLoading : (item.i === 'company' ? companyLoading : false)"
            :is-locked="isLocked"
            :chips-mode="chipCardIds.has(item.i)"
            :hero-mode="item.i === 'hero' ? heroMode : undefined"
            :ticker="item.i === 'company-news' ? activeTicker : undefined"
            :article-count="item.i === 'company-news' ? newsArticleCount : undefined"
            :branding-mode="brandingMode"
            :active-branding-url="activeBrandingUrl"
            :flame-icon="flameIcon"
            @toggle-branding="toggleBranding"
            @update-article-count="item.i === 'company-news' ? onNewsArticleCountChange($event) : undefined"
            @remove="item.i === 'company-news' ? removeCard('company-news') : undefined"
            class="eqv4-card-component"
          />
        </GridItem>
      </GridLayout>
    </div>

    <!-- Edit bar — visible whenever unlocked, outside the data guard -->
    <div v-if="!isLocked" class="eqv4-edit-bar">
      <EQV4CardPicker
        v-if="absentCards.length > 0"
        :absent-cards="absentCards"
        @add-card="addCard"
      />
      <div class="eqv4-grid-config">
        <label class="eqv4-config-label">
          Cols
          <input
            type="number"
            :value="gridCols"
            min="1" max="24"
            class="eqv4-config-input"
            @change="onGridColsChange"
          />
        </label>
        <label class="eqv4-config-label">
          Row H
          <input
            type="number"
            :value="gridRowHeight"
            min="20" max="120"
            class="eqv4-config-input"
            @change="onGridRowHeightChange"
          />
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { GridLayout, GridItem } from 'vue3-grid-layout-next'
import { useWidgetBus, getFlameVariant, getFlameTooltip } from '@/composables/useWidgetBus.js'
import { useWebSocketClient } from '@/composables/useWebSocketClient.js'
import { useConfig } from '@/composables/useConfig.js'
import EQV4HeroCard    from './EQV4HeroCard.vue'
import EQV4TodayCard   from './EQV4TodayCard.vue'
import EQV4PrevCard    from './EQV4PrevCard.vue'
import EQV4VolumeCard  from './EQV4VolumeCard.vue'
import EQV4SessionCard from './EQV4SessionCard.vue'
import EQV4ShortCard   from './EQV4ShortCard.vue'
import EQV4CompanyCard     from './EQV4CompanyCard.vue'
import EQV4CompanyNewsCard from './EQV4CompanyNewsCard.vue'
import EQV4CardPicker  from './EQV4CardPicker.vue'

// ── Card registry ────────────────────────────────────────────────────────────
const CARD_REGISTRY = [
  { id: 'hero',    label: 'Hero',           component: EQV4HeroCard,    defaultW: 6, defaultH: 3 },
  { id: 'today',   label: 'Today',          component: EQV4TodayCard,   defaultW: 2, defaultH: 2 },
  { id: 'prev',    label: 'Previous Day',   component: EQV4PrevCard,    defaultW: 2, defaultH: 2 },
  { id: 'volume',  label: 'Volume',         component: EQV4VolumeCard,  defaultW: 2, defaultH: 2 },
  { id: 'session', label: 'Session H/L',    component: EQV4SessionCard, defaultW: 3, defaultH: 3 },
  { id: 'short',   label: 'Short Interest', component: EQV4ShortCard,   defaultW: 3, defaultH: 2 },
  { id: 'company',      label: 'Company',        component: EQV4CompanyCard,     defaultW: 3, defaultH: 3 },
  { id: 'company-news', label: 'Company News',   component: EQV4CompanyNewsCard, defaultW: 6, defaultH: 4 },
]

const CARD_MAP = Object.fromEntries(CARD_REGISTRY.map(c => [c.id, c]))

const DEFAULT_CARDS = [
  { id: 'hero',    x: 0, y: 0, w: 6, h: 3 },
  { id: 'today',   x: 0, y: 3, w: 2, h: 2 },
  { id: 'prev',    x: 2, y: 3, w: 2, h: 2 },
  { id: 'volume',  x: 4, y: 3, w: 2, h: 2 },
  { id: 'session', x: 0, y: 5, w: 3, h: 3 },
  { id: 'short',   x: 3, y: 5, w: 3, h: 2 },
  { id: 'company', x: 3, y: 7, w: 3, h: 3 },
]

// ── Props / emits ────────────────────────────────────────────────────────────
const props = defineProps({
  isLocked:  { type: Boolean, default: true },
  linkColor: { type: String,  default: null },
  isMobile:  { type: Boolean, default: false },
  settings:  { type: Object,  default: () => ({}) },
})

const emit = defineEmits(['update-settings'])

// ── Config ───────────────────────────────────────────────────────────────────
const { config } = useConfig()

// ── Widget bus ───────────────────────────────────────────────────────────────
const { activeTickers, setActiveTicker } = useWidgetBus()

// ── Settings helpers ─────────────────────────────────────────────────────────
const gridCols = computed(() => props.settings?.gridCols ?? 6)
const gridRowHeight = computed(() => props.settings?.gridRowHeight ?? 40)
const chipCardIds = computed(() => new Set(props.settings?.chipCards ?? []))
const brandingMode = computed(() => props.settings?.brandingMode ?? 'logo')
const heroMode = computed(() => props.settings?.heroMode ?? 'wide')
const newsArticleCount = computed(() => props.settings?.newsArticleCount ?? 20)

// Cards that support chip render mode (company card does not)
const CHIPS_CAPABLE = new Set(['today', 'prev', 'volume', 'session', 'short'])
const isChipsCapable = (id) => CHIPS_CAPABLE.has(id)

const toggleCardChips = (cardId) => {
  const chips = new Set(props.settings?.chipCards ?? [])
  if (chips.has(cardId)) chips.delete(cardId)
  else chips.add(cardId)
  emit('update-settings', { ...props.settings, chipCards: [...chips] })
}

const toggleHeroMode = () => {
  const next = heroMode.value === 'wide' ? 'narrow' : 'wide'
  emit('update-settings', { ...props.settings, heroMode: next })
}

const onNewsArticleCountChange = (count) => {
  emit('update-settings', { ...props.settings, newsArticleCount: count })
}

const settingsCards = computed(() => {
  const c = props.settings?.cards
  return Array.isArray(c) && c.length > 0 ? c : null
})

// ── Grid layout ──────────────────────────────────────────────────────────────
// Derived from settings.cards (or default). GridLayout needs `i` field; we use card id as i.
const gridLayout = computed(() =>
  (settingsCards.value ?? DEFAULT_CARDS).map(card => ({ ...card, i: card.id }))
)

// Internal mutable layout ref — v-model:layout for GridLayout reactivity.
// Kept in sync with gridLayout computed on settings change.
// Guard flag: prevents re-syncing internalLayout when the settings change
// was triggered by our own onLayoutUpdated emit (avoids feedback loop).
const internalLayout = ref(gridLayout.value.map(c => ({ ...c })))
let _ownLayoutUpdate = false

watch(gridLayout, (newLayout) => {
  if (_ownLayoutUpdate) {
    _ownLayoutUpdate = false
    return
  }
  internalLayout.value = newLayout.map(c => ({ ...c }))
}, { deep: true })

// Emit default layout on first render if settings.cards is absent/empty.
// Do this after mount to avoid emitting during parent setup.
const emittedDefault = ref(false)
watch(settingsCards, (cards) => {
  if (cards === null && !emittedDefault.value) {
    emittedDefault.value = true
    emit('update-settings', {
      ...props.settings,
      gridCols: gridCols.value,
      gridRowHeight: gridRowHeight.value,
      chipCards: props.settings?.chipCards ?? [],
      brandingMode: brandingMode.value,
      cards: DEFAULT_CARDS,
    })
  }
}, { immediate: true })

// @layout-updated fires on dragend/resizeend only (not on every drag tick).
// Persist new positions via update-settings.
// Set guard before emitting so the gridLayout watcher skips the echo-back.
const onLayoutUpdated = (newLayout) => {
  _ownLayoutUpdate = true
  emit('update-settings', {
    ...props.settings,
    cards: newLayout.map(({ i, ...rest }) => ({ ...rest, id: i })),
  })
}

// ── Card helpers ─────────────────────────────────────────────────────────────
const cardLabel = (id) => CARD_MAP[id]?.label ?? id
const cardComponent = (id) => CARD_MAP[id]?.component ?? null

const activeCardIds = computed(() =>
  new Set((settingsCards.value ?? DEFAULT_CARDS).map(c => c.id))
)

const absentCards = computed(() =>
  CARD_REGISTRY.filter(c => !activeCardIds.value.has(c.id))
)

// ── Add card: first-fit row-major scan ───────────────────────────────────────
const addCard = (cardId) => {
  const def = CARD_MAP[cardId]
  if (!def) return
  const current = settingsCards.value ?? DEFAULT_CARDS
  const cols = gridCols.value

  // Build occupied set: all (x, y) cells taken by placed cards.
  const occupied = new Set()
  for (const card of current) {
    for (let row = card.y; row < card.y + card.h; row++) {
      for (let col = card.x; col < card.x + card.w; col++) {
        occupied.add(`${col},${row}`)
      }
    }
  }

  // Scan row-major for first position where the card fits without overlap.
  const maxY = current.reduce((m, c) => Math.max(m, c.y + c.h), 0)
  let placed = null

  outer:
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= cols - def.defaultW; x++) {
      let fits = true
      for (let dy = 0; dy < def.defaultH && fits; dy++) {
        for (let dx = 0; dx < def.defaultW && fits; dx++) {
          if (occupied.has(`${x + dx},${y + dy}`)) fits = false
        }
      }
      if (fits) {
        placed = { id: cardId, x, y, w: def.defaultW, h: def.defaultH }
        break outer
      }
    }
  }

  // Fallback: append below all placed cards.
  if (!placed) {
    placed = { id: cardId, x: 0, y: maxY, w: def.defaultW, h: def.defaultH }
  }

  emit('update-settings', {
    ...props.settings,
    cards: [...current, placed],
  })
}

// ── Remove card ───────────────────────────────────────────────────────────────
const removeCard = (cardId) => {
  const current = settingsCards.value ?? DEFAULT_CARDS
  emit('update-settings', {
    ...props.settings,
    cards: current.filter(c => c.id !== cardId),
  })
}

// ── Grid config ───────────────────────────────────────────────────────────────
const onGridColsChange = (e) => {
  const val = Math.max(1, Math.min(24, parseInt(e.target.value, 10) || 1))
  emit('update-settings', { ...props.settings, gridCols: val })
}

const onGridRowHeightChange = (e) => {
  const val = Math.max(20, Math.min(120, parseInt(e.target.value, 10) || 40))
  emit('update-settings', { ...props.settings, gridRowHeight: val })
}

// ── Ticker input ─────────────────────────────────────────────────────────────
const inputTicker = ref('')
const manualTicker = ref('')
const busTicker = computed(() =>
  props.linkColor ? (activeTickers[props.linkColor] || null) : null
)
const activeTicker = computed(() => busTicker.value || manualTicker.value || null)

const applyInput = () => {
  const t = inputTicker.value.trim().toUpperCase()
  if (!t) return
  manualTicker.value = t
  inputTicker.value = ''
  if (props.linkColor) {
    setActiveTicker(props.linkColor, t)
  }
}

watch(busTicker, (t) => {
  if (t) manualTicker.value = ''
})

// ── Quote data ───────────────────────────────────────────────────────────────
const quoteData = ref(null)
const lastDataAt = ref(null)

// ── Company data ─────────────────────────────────────────────────────────────
const companyData = ref({})
const companyLoading = ref(false)
const logoUrl = ref(null)
const iconUrl = ref(null)

const fetchCompany = async (symbol) => {
  if (!symbol) return
  companyLoading.value = true
  companyData.value = {}
  logoUrl.value = null
  iconUrl.value = null
  try {
    const url = `https://api.massive.com/v3/reference/tickers/${symbol}?apiKey=${config.value?.massiveApiKey}`
    const resp = await fetch(url)
    if (resp.ok) {
      const json = await resp.json()
      const results = json.results || {}
      companyData.value = {
        name: results.name ?? null,
        sic_description: results.sic_description ?? null,
        description: results.description ?? null,
        homepage_url: results.homepage_url ?? null,
        primary_exchange: results.primary_exchange ?? null,
        market_cap: results.market_cap ?? null,
        total_employees: results.total_employees ?? null,
        list_date: results.list_date ?? null,
      }
      logoUrl.value = results.branding?.logo_url ?? null
      iconUrl.value = results.branding?.icon_url ?? null
    }
  } catch (e) {
    console.warn(`[EnhancedQuoteV4] company fetch failed for ${symbol}:`, e)
  } finally {
    companyLoading.value = false
  }
}

// ── Short interest data ───────────────────────────────────────────────────────
const shortInterestData = ref({})
const shortInterestLoading = ref(false)

const fetchShortData = async (symbol) => {
  if (!symbol) return
  shortInterestLoading.value = true
  shortInterestData.value = {}
  const key = config.value?.massiveApiKey
  try {
    const [siResp, svResp] = await Promise.all([
      fetch(`https://api.massive.com/stocks/v1/short-interest?ticker=${symbol}&limit=1&sort=settlement_date.desc&apiKey=${key}`),
      fetch(`https://api.massive.com/stocks/v1/short-volume?ticker=${symbol}&limit=1&sort=date.desc&apiKey=${key}`),
    ])
    const siJson = siResp.ok ? await siResp.json() : {}
    const svJson = svResp.ok ? await svResp.json() : {}
    const si = siJson.results?.[0] ?? {}
    const sv = svJson.results?.[0] ?? {}
    shortInterestData.value = {
      short_interest: si.short_interest ?? null,
      days_to_cover: si.days_to_cover ?? null,
      avg_daily_volume: si.avg_daily_volume ?? null,
      settlement_date: si.settlement_date ?? null,
      short_volume_ratio: sv.short_volume_ratio ?? null,
      short_volume: sv.short_volume ?? null,
      total_volume: sv.total_volume ?? null,
    }
  } catch (e) {
    console.warn(`[EnhancedQuoteV4] short data fetch failed for ${symbol}:`, e)
  } finally {
    shortInterestLoading.value = false
  }
}

// ── WDS WebSocket ─────────────────────────────────────────────────────────────
const currentFeed = ref('')

const { wsUrl, authKey, feedName, cacheKey, isConnected, reconnecting, getCache, subscribe, unsubscribe, connect: wdsConnect } = useWebSocketClient({
  wsUrl: '',
  authKey: '',
  feedName: '',
  cacheKey: '',
  onData: (data) => {
    if (!data || (data.symbol && data.symbol !== activeTicker.value)) return
    quoteData.value = data
    lastDataAt.value = Date.now()
  },
  autoConnect: false,
})

watch(config, (cfg) => {
  if (cfg?.wsEndpoint && cfg?.apiKey) {
    wsUrl.value = cfg.wsEndpoint
    authKey.value = cfg.apiKey
    if (!isConnected.value) {
      wdsConnect()
    }
  }
}, { immediate: true })

watch(activeTicker, (newTicker) => {
  if (currentFeed.value) {
    feedName.value = currentFeed.value
    cacheKey.value = ''
    unsubscribe()
    currentFeed.value = ''
  }
  quoteData.value = null
  companyData.value = {}
  shortInterestData.value = {}
  logoUrl.value = null
  iconUrl.value = null
  if (newTicker) {
    fetchCompany(newTicker)
    fetchShortData(newTicker)
    const feed = `daily_range:${newTicker}`
    feedName.value = feed
    cacheKey.value = feed
    currentFeed.value = feed
    if (isConnected.value) {
      subscribe()
      getCache()
    }
  }
})

watch(isConnected, (connected) => {
  if (connected && currentFeed.value) {
    feedName.value = currentFeed.value
    cacheKey.value = currentFeed.value
    subscribe()
    getCache()
  }
})

// ── Flame icon ────────────────────────────────────────────────────────────────
const FLAME_SRCS = {
  red:    new URL('@/assets/icons/flame-red.svg',    import.meta.url).href,
  orange: new URL('@/assets/icons/flame-orange.svg', import.meta.url).href,
  yellow: new URL('@/assets/icons/flame-yellow.svg', import.meta.url).href,
  white:  new URL('@/assets/icons/flame-white.svg',  import.meta.url).href,
  blue:   new URL('@/assets/icons/flame-blue.svg',   import.meta.url).href,
  dark:   new URL('@/assets/icons/flame-dark.svg',   import.meta.url).href,
}

const flameIcon = computed(() => {
  if (!activeTicker.value) return null
  const variant = getFlameVariant(activeTicker.value)
  if (!variant) return null
  return { src: FLAME_SRCS[variant], tooltip: getFlameTooltip(activeTicker.value) }
})

// ── Branding ──────────────────────────────────────────────────────────────────
const activeBrandingUrl = computed(() => {
  if (!config.value?.massiveApiKey) return null
  const key = config.value.massiveApiKey
  if (brandingMode.value === 'icon') {
    return iconUrl.value ? `${iconUrl.value}?apiKey=${key}` : (logoUrl.value ? `${logoUrl.value}?apiKey=${key}` : null)
  }
  return logoUrl.value ? `${logoUrl.value}?apiKey=${key}` : (iconUrl.value ? `${iconUrl.value}?apiKey=${key}` : null)
})

const toggleBranding = () => {
  const next = brandingMode.value === 'logo' ? 'icon' : 'logo'
  emit('update-settings', { ...props.settings, brandingMode: next })
}

// ── defineExpose ──────────────────────────────────────────────────────────────
defineExpose({
  lastDataAt,
  isConnected,
  reconnecting,
  quoteData,
  manualTicker,
  companyData,
  companyLoading,
  shortInterestData,
  shortInterestLoading,
  gridLayout,
  gridCols,
  gridRowHeight,
  chipCardIds,
  heroMode,
  newsArticleCount,
  addCard,
  removeCard,
  toggleCardChips,
  toggleHeroMode,
  activeCardIds,
})
</script>

<style scoped>
.eqv4-widget {
  --bg: #0d0d12;
  --surface: #141420;
  --border: #2d2d3d;
  --text-primary: #e2e8f0;
  --text-muted: #afafaf;
  --accent: #7c3aed;
  --pd-accent: #7c3aed;
  background: var(--bg);
  color: var(--text-primary);
  font-family: system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.eqv4-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.eqv4-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-family: 'Roboto Mono', monospace;
  font-size: 13px;
  padding: 4px 8px;
  outline: none;
}
.eqv4-input:focus { border-color: var(--pd-accent); }
.eqv4-go-btn {
  background: var(--pd-accent);
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  padding: 4px 10px;
  cursor: pointer;
}
.eqv4-overlay {
  position: absolute;
  inset: 80px 8px 40px 8px; /* below controls bar */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 13px;
  padding: 24px;
  text-align: center;
  background: rgba(13, 13, 18, 0.85);
  z-index: 10;
  pointer-events: none;
}
.eqv4-empty-icon { font-size: 28px; }
.eqv4-body {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  position: relative;
}
.eqv4-grid-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.eqv4-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.eqv4-card-controls {
  display: flex;
  align-items: center;
  gap: 3px;
}
.eqv4-card-toggle {
  background: none;
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text-muted);
  font-size: 10px;
  padding: 1px 5px;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  text-transform: none;
  letter-spacing: 0;
  transition: border-color 0.15s, color 0.15s;
}
.eqv4-card-toggle:hover {
  border-color: var(--pd-accent);
  color: var(--pd-accent);
}
.eqv4-card-toggle--active {
  border-color: var(--pd-accent);
  color: var(--pd-accent);
}
.eqv4-card-remove {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 11px;
  padding: 0 2px;
  line-height: 1;
}
.eqv4-card-remove:hover { color: #ef4444; }
.eqv4-card-component {
  flex: 1;
  min-height: 0;
}
.eqv4-edit-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg);
}
.eqv4-grid-config {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
.eqv4-config-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
}
.eqv4-config-input {
  width: 48px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  padding: 2px 4px;
  text-align: center;
}
</style>
