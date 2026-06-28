<template>
  <header class="dashboard-header">
    <h1 class="dashboard-title">Stock Scanner Dashboard</h1>
    <div v-if="appConfig" class="status success">Connected</div>
    <div v-else class="status error">Error</div>

    <!-- ── Desktop toolbar (hidden on mobile) ── -->
    <div v-if="appConfig" class="layout-controls hidden-mobile">

      <div class="widget-menu">
        <WidgetMenu @add-widget="addWidget" />
      </div>

      <div class="layout-selector">
        <!-- Custom Dropdown with Hover Preview -->
        <div class="custom-select" ref="selectContainer">
          <div
              class="select-trigger"
              @click="toggleDropdown"
              :class="{ active: isDropdownOpen }"
          >
            <span v-if="selectedLayoutName">
              {{ selectedLayoutName }} {{ selectedLayoutName === defaultLayoutName ? '(Default)' : '' }}
            </span>
            <span v-else class="placeholder">-- Select Layout --</span>
            <span class="arrow">▼</span>
          </div>

          <div v-if="isDropdownOpen" class="select-dropdown">
            <div
                v-for="name in savedLayoutNames"
                :key="name"
                class="select-option"
                :class="{ selected: name === selectedLayoutName }"
                @mouseenter="startHoverPreview(name, $event)"
                @mouseleave="cancelHoverPreview"
            >
              <span class="option-name" @click="selectLayout(name)">
                {{ name }} {{ name === defaultLayoutName ? '(Default)' : '' }}
              </span>
              <button
                  class="option-preview-btn"
                  @click.stop="showLayoutPreview(name)"
                  title="View Details"
              >
                🔍
              </button>
            </div>
            <div v-if="savedLayoutNames.length === 0" class="select-option disabled">
              No saved layouts
            </div>
          </div>

        </div>

        <button @click="showSaveDialog = true" class="btn-icon" title="Save Layout">
          💾
        </button>
        <button
            @click="deleteCurrentLayout"
            :disabled="!selectedLayoutName"
            class="btn-icon"
            title="Delete Layout"
        >
          🗑️
        </button>
        <button
            @click="isLocked = !isLocked"
            class="btn-icon"
            :title="isLocked ? 'Unlock layout (edit mode)' : 'Lock layout'"
        >{{ isLocked ? '🔒' : '✏️' }}</button>
        <button
            @click="autosaveEnabled = !autosaveEnabled"
            :class="['btn-icon', autosaveEnabled ? '' : 'btn-icon--inactive']"
            :title="autosaveEnabled ? 'Autosave ON — click to disable' : 'Autosave OFF — click to enable'"
        >{{ autosaveEnabled ? '🔄' : '⏸' }}</button>
        <button @click="exportLayouts" class="btn-icon" title="Export All Layouts">
          📤
        </button>
        <button @click="$refs.importFile.click()" class="btn-icon" title="Import Layouts">
          📥
        </button>
        <input
            ref="importFile"
            type="file"
            accept=".json"
            @change="importLayouts"
            style="display: none"
        />
      </div>

      <div class="auto-save-indicator" v-if="isAutoSaving">
        <span>💾 Auto-saving...</span>
      </div>

      <div v-if="!isLocked" class="col-num-stepper" title="Dashboard column count">
        <button class="col-step-btn" @click="dashboardColNum = Math.max(1, dashboardColNum - 1)" aria-label="Fewer columns">−</button>
        <span class="col-num-display">{{ dashboardColNum }}c</span>
        <button class="col-step-btn" @click="dashboardColNum = Math.min(48, dashboardColNum + 1)" aria-label="More columns">+</button>
      </div>

    </div>

    <!-- ── Mobile hamburger button (hidden on desktop) ── -->
    <div v-if="appConfig" class="mobile-menu-wrap visible-mobile">
      <span v-if="isAutoSaving" class="mobile-autosave-dot" title="Auto-saving...">&#9679;</span>
      <button class="btn-icon hamburger-btn" @click="mobileMenuOpen = true" aria-label="Open menu">
        &#9776;
      </button>
    </div>

    <!-- ── Mobile bottom-sheet menu ── -->
    <teleport to="body">
      <div v-if="mobileMenuOpen" class="mobile-sheet-overlay" @click.self="mobileMenuOpen = false">
        <div class="mobile-sheet">

          <!-- Sheet header -->
          <div class="mobile-sheet-header">
            <span class="mobile-sheet-title">Dashboard Menu</span>
            <button class="mobile-sheet-close" @click="mobileMenuOpen = false" aria-label="Close menu">✕</button>
          </div>

          <!-- Layout picker -->
          <div class="mobile-sheet-section">
            <div class="mobile-sheet-label">Layout</div>
            <div class="mobile-layout-row">
              <div class="custom-select custom-select--sheet" ref="selectContainerMobile">
                <div
                    class="select-trigger"
                    @click="toggleDropdown"
                    :class="{ active: isDropdownOpen }"
                >
                  <span v-if="selectedLayoutName">{{ selectedLayoutName }}{{ selectedLayoutName === defaultLayoutName ? ' ✓' : '' }}</span>
                  <span v-else class="placeholder">Select layout…</span>
                  <span class="arrow">▼</span>
                </div>
                <div v-if="isDropdownOpen" class="select-dropdown">
                  <div
                      v-for="name in savedLayoutNames"
                      :key="name"
                      class="select-option"
                      :class="{ selected: name === selectedLayoutName }"
                  >
                    <span class="option-name" @click="selectLayout(name); mobileMenuOpen = false">
                      {{ name }}{{ name === defaultLayoutName ? ' ✓' : '' }}
                    </span>
                  </div>
                  <div v-if="savedLayoutNames.length === 0" class="select-option disabled">No saved layouts</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action grid -->
          <div class="mobile-sheet-section">
            <div class="mobile-sheet-label">Actions</div>
            <div class="mobile-action-grid">

              <div class="mobile-action-btn mobile-action-btn--menu">
                <WidgetMenu @add-widget="(w) => { addWidget(w); mobileMenuOpen = false }" />
              </div>

              <button class="mobile-action-btn" @click="isLocked = !isLocked">
                <span class="mobile-action-icon">{{ isLocked ? '🔒' : '✏️' }}</span>
                <span class="mobile-action-label">{{ isLocked ? 'Locked' : 'Edit Mode' }}</span>
              </button>

              <button
                  class="mobile-action-btn"
                  :class="{ 'mobile-action-btn--dim': !autosaveEnabled }"
                  @click="autosaveEnabled = !autosaveEnabled"
              >
                <span class="mobile-action-icon">{{ autosaveEnabled ? '🔄' : '⏸' }}</span>
                <span class="mobile-action-label">{{ autosaveEnabled ? 'Autosave' : 'Autosave Off' }}</span>
              </button>

              <button class="mobile-action-btn" @click="showSaveDialog = true; mobileMenuOpen = false">
                <span class="mobile-action-icon">💾</span>
                <span class="mobile-action-label">Save Layout</span>
              </button>

              <button
                  class="mobile-action-btn"
                  :class="{ 'mobile-action-btn--dim': !selectedLayoutName }"
                  :disabled="!selectedLayoutName"
                  @click="deleteCurrentLayout(); mobileMenuOpen = false"
              >
                <span class="mobile-action-icon">🗑️</span>
                <span class="mobile-action-label">Delete Layout</span>
              </button>

              <button
                  class="mobile-action-btn"
                  @click="widgetSettingsStore.alertManagerOpen = !widgetSettingsStore.alertManagerOpen; mobileMenuOpen = false"
              >
                <span class="mobile-action-icon">
                  🔔<span v-if="alertBadgeCount > 0" class="alert-badge alert-badge--menu">{{ alertBadgeCount }}</span>
                </span>
                <span class="mobile-action-label">Alerts{{ alertBadgeCount > 0 ? ` (${alertBadgeCount})` : '' }}</span>
              </button>

              <button class="mobile-action-btn" @click="exportLayouts(); mobileMenuOpen = false">
                <span class="mobile-action-icon">📤</span>
                <span class="mobile-action-label">Export</span>
              </button>

              <button class="mobile-action-btn" @click="$refs.importFileMobile.click(); mobileMenuOpen = false">
                <span class="mobile-action-icon">📥</span>
                <span class="mobile-action-label">Import</span>
              </button>

            </div>
            <input
                ref="importFileMobile"
                type="file"
                accept=".json"
                @change="importLayouts"
                style="display: none"
            />
          </div>

          <!-- Column stepper -->
          <div class="mobile-sheet-section" v-if="!isLocked">
            <div class="mobile-sheet-label">Columns</div>
            <div class="mobile-sheet-stepper">
              <button class="col-step-btn col-step-btn--large" @click="dashboardColNum = Math.max(1, dashboardColNum - 1)" aria-label="Fewer columns">−</button>
              <span class="col-num-display col-num-display--large">{{ dashboardColNum }}</span>
              <button class="col-step-btn col-step-btn--large" @click="dashboardColNum = Math.min(48, dashboardColNum + 1)" aria-label="More columns">+</button>
            </div>
          </div>

        </div>
      </div>
    </teleport>

    <!-- Alert Manager bell icon (desktop only) -->
    <div v-if="appConfig" class="alert-manager-wrap hidden-mobile">
      <button
        @click="widgetSettingsStore.alertManagerOpen = !widgetSettingsStore.alertManagerOpen"
        class="btn-icon alert-bell"
        :class="{ 'alert-bell--muted': alertStore.muted }"
        title="Alert Manager"
        data-testid="alert-bell"
      >
        🔔<span v-if="alertBadgeCount > 0" class="alert-badge">{{ alertBadgeCount }}</span>
      </button>
      <AlertManager
        v-if="widgetSettingsStore.alertManagerOpen"
        :alert-enabled-widgets="alertEnabledWidgets"
        class="alert-manager-dropdown"
      />
    </div>

    <div v-if="!appConfig" class="auth-required">
      <p>Please log in to access the dashboard</p>
    </div>

    <div v-if="appVersion" class="app-version">v{{ appVersion }}</div>
  </header>

  <!-- Autoplay blocked banner -->
  <div v-if="alertStore.audioBlocked" class="audio-blocked-banner" @click="alertStore.audioBlocked = false">
    🔔 Click to enable audio alerts
  </div>

  <!-- Hover Preview Tooltip -->
  <div
      v-if="hoverPreviewVisible"
      class="hover-preview-tooltip"
      :style="hoverPreviewStyle"
  >
    <div class="preview-header">
      <strong>{{ hoverPreviewLayout }}</strong>
      <span v-if="hoverPreviewMetadata?.description" class="preview-desc">
        {{ hoverPreviewMetadata.description }}
      </span>
    </div>
    <canvas ref="hoverPreviewCanvas" width="300" height="200" class="mini-preview-canvas"></canvas>
    <div v-if="hoverPreviewMetadata" class="preview-meta-mini">
      <span>Modified: {{ formatDate(hoverPreviewMetadata.modified) }}</span>
    </div>
  </div>

  <!-- Save Dialog -->
  <div v-if="showSaveDialog" class="modal-overlay" @click.self="showSaveDialog = false">
    <div class="modal">
      <h3>{{ editingExistingLayout ? 'Update Layout' : 'Save Layout' }}</h3>

      <input
          v-model="saveLayoutName"
          placeholder="Layout name"
          @keyup.enter="saveLayout"
          class="layout-input"
      />

      <textarea
          v-model="saveLayoutDescription"
          placeholder="Description (optional)"
          class="layout-textarea"
          rows="3"
      ></textarea>

      <label class="checkbox-label">
        <input type="checkbox" v-model="saveAsDefault" />
        Set as default
      </label>

      <div v-if="editingExistingLayout" class="warning-message">
        ⚠️ Layout "{{ saveLayoutName }}" already exists and will be updated.
      </div>

      <div class="modal-actions">
        <button @click="saveLayout" class="btn-primary">
          {{ editingExistingLayout ? 'Update' : 'Save' }}
        </button>
        <button @click="closeSaveDialog" class="btn-secondary">Cancel</button>
      </div>
    </div>
  </div>

  <!-- Full Preview Modal -->
  <div v-if="showPreviewDialog" class="modal-overlay" @click.self="showPreviewDialog = false">
    <div class="modal modal-large">
      <h3>Layout: {{ previewLayoutName }}</h3>

      <div v-if="previewMetadata" class="preview-metadata">
        <p v-if="previewMetadata.description" class="description">{{ previewMetadata.description }}</p>
        <div class="metadata-row">
          <span>Created: {{ formatDate(previewMetadata.created) }}</span>
          <span>Modified: {{ formatDate(previewMetadata.modified) }}</span>
        </div>
      </div>

      <div class="preview-container">
        <canvas ref="previewCanvas" class="preview-canvas"></canvas>
      </div>

      <div class="modal-actions">
        <button @click="loadPreviewedLayout" class="btn-primary">Load Layout</button>
        <button @click="showPreviewDialog = false" class="btn-secondary">Close</button>
      </div>
    </div>
  </div>

  <div class="dashboard">
    <!-- Single GridLayout for all screen sizes.
         isMobile is still forwarded to widgets for layout tweaks (e.g. NewsFeed card mode)
         but the grid itself is always used — the mobile stack is gone.
         On narrow viewports dashboardColNum defaults to 2 and rowHeight is larger
         so widgets get usable dimensions without a separate code path. -->
    <div v-if="appConfig">
    <!-- :key forces full remount on layout switch, preventing vue3-grid-layout-next
         from merging stale internal state with new widget positions -->
    <GridLayout
        :key="selectedLayoutName || '__default__'"
        v-model:layout="layout"
        :col-num="dashboardColNum"
        :row-height="gridRowHeight"
        :is-draggable="!isLocked"
        :is-resizable="!isLocked"
        :vertical-compact="true"
        :margin="[5, 5]"
        :use-css-transforms="true"
    >
      <GridItem
          v-for="item in layout"
          :key="item.i"
          :x="item.x"
          :y="item.y"
          :w="item.w"
          :h="item.h"
          :i="item.i"
          drag-allow-from=".widget-header"
      >
        <WidgetWrapper
            :widget-id="item.i"
            :widget-type="item.type"
            :is-locked="isLocked"
            :col-widths="item.colWidths || {}"
            :link-color="item.linkColor || null"
            :settings="item.settings || {}"
            :user-label="item.userLabel || ''"
            :is-mobile="isMobile"
            @close="removeWidget"
            @update-col-widths="(w) => updateColWidths(item.i, w)"
            @update-link-color="(c) => updateLinkColor(item.i, c)"
            @update-settings="(s) => updateSettings(item.i, s)"
            @update-label="(l) => updateLabel(item.i, l)"
        />
      </GridItem>
    </GridLayout>
    </div><!-- /v-if="appConfig" -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { GridLayout, GridItem } from 'vue3-grid-layout-next'
import 'vue3-grid-layout-next/dist/style.css'
import WidgetMenu from './WidgetMenu.vue'
import WidgetWrapper from './WidgetWrapper.vue'
import { useConfig } from '@/composables/useConfig.js'
import { useWidgetSettingsStore } from '@/stores/useWidgetSettingsStore.js'
import { useAlertStore } from '@/stores/useAlertStore.js'
import { LINK_COLOR_MAP } from '@/constants/linkColors.js'
import { storeToRefs } from 'pinia'
import AlertManager from './AlertManager.vue'

const WIDGET_TYPE_LABELS = {
  'top-gainers':       'Top Gainers',
  'top-gappers':       'Top Gappers',
  'top-volume':        'Top Volume',
  'news-feed':         'News Feed',
  'company-news':      'Company News',
  'quote':             'Mini Quote',
  'enhanced-quote':    'Quote',
  'enhanced-quote-v4': 'Enhanced Quote',
  'range-alerts':      'Range Alerts',
  'candlestick-chart': 'Candlestick Chart',
  'tv-lite-chart':     'TV Lite Chart',
}

const { config: appConfig, loading: configLoading, error: configError } = useConfig()
const appVersion = window.__APP_VERSION__ || null

// Responsive breakpoint — used to forward isMobile to widgets (e.g. NewsFeed card mode)
// and to tune grid defaults. The mobile *stack* is gone; GridLayout is used for all sizes.
const MOBILE_BREAKPOINT = 640
const isMobile = ref(window.innerWidth < MOBILE_BREAKPOINT)
const onResize = () => { isMobile.value = window.innerWidth < MOBILE_BREAKPOINT }

// On narrow viewports use a larger row height so widgets get real vertical space
// at reasonable h values without the user needing to drag them tall.
const gridRowHeight = computed(() => isMobile.value ? 44 : 30)

const AUTOSAVE_KEY = '__autosave__'
const AUTOSAVE_DEBOUNCE_MS = 2000

const widgetSettingsStore = useWidgetSettingsStore()
const { savedLayouts, defaultLayoutName, isLocked, autosaveEnabled } = storeToRefs(widgetSettingsStore)
const alertStore = useAlertStore()

// State
const layout = ref([])
const selectedLayoutName = ref('')
const showSaveDialog = ref(false)
const saveLayoutName = ref('')
const saveLayoutDescription = ref('')
const saveAsDefault = ref(false)
const isAutoSaving = ref(false)
const showPreviewDialog = ref(false)
const previewLayoutName = ref('')
const previewMetadata = ref(null)
const importFile = ref(null)
const importFileMobile = ref(null)
const previewCanvas = ref(null)
const isDropdownOpen = ref(false)
const selectContainer = ref(null)
const mobileMenuOpen = ref(false)
const hoverPreviewVisible = ref(false)
const hoverPreviewLayout = ref('')
const hoverPreviewMetadata = ref(null)
const hoverPreviewStyle = ref({})
const hoverPreviewCanvas = ref(null)
let widgetCounter = 0
let autoSaveTimeout = null
let hoverTimeout = null

// Configurable column count — persisted per layout as `dashboardColNum`.
// Default to 2 on narrow viewports so widgets are readable without manual resizing.
const dashboardColNum = ref(isMobile.value ? 2 : 12)

// Computed
const savedLayoutNames = computed(() =>
    Object.keys(savedLayouts.value)
        // .filter(name => name !== AUTOSAVE_KEY)
        .sort()
)

const editingExistingLayout = computed(() =>
    saveLayoutName.value.trim() && savedLayouts.value[saveLayoutName.value.trim()]
)

const alertEnabledWidgets = computed(() =>
  layout.value
    .filter(item => item.settings?.alertEnabled)
    .map(item => ({
      widgetId:       item.i,
      widgetLabel:    item.userLabel || WIDGET_TYPE_LABELS[item.type] || item.type,
      widgetType:     item.type,
      linkColor:      item.linkColor ?? null,
      effectiveSound: item.settings?.alertSound ?? widgetSettingsStore.defaultAlertSound,
    }))
)

const alertBadgeCount = computed(() => alertEnabledWidgets.value.length)

// Layout Operations
const saveLayout = () => {
  if (!saveLayoutName.value.trim()) return

  const name = saveLayoutName.value.trim()
  const layoutCopy = JSON.parse(JSON.stringify(layout.value))

  layoutCopy.forEach(item => {
    const num = parseInt(item.i.split('-')[1])
    if (!isNaN(num) && num >= widgetCounter) {
      widgetCounter = num + 1
    }
  })

  const now = Date.now()
  const existing = savedLayouts.value[name]

  savedLayouts.value[name] = {
    layout: layoutCopy,
    widgetCounter: widgetCounter,
    dashboardColNum: dashboardColNum.value,
    created: existing?.created || now,
    modified: now,
    description: saveLayoutDescription.value.trim()
  }

  if (saveAsDefault.value) {
    defaultLayoutName.value = name
  }

  selectedLayoutName.value = name
  closeSaveDialog()
}

const loadLayout = () => {
  const name = selectedLayoutName.value
  if (!name || !savedLayouts.value[name]) return

  const saved = savedLayouts.value[name]
  // Set dashboardColNum BEFORE layout so the grid never renders widgets
  // against the wrong column count during the reactive update cycle.
  dashboardColNum.value = saved.dashboardColNum ?? 12
  layout.value = JSON.parse(JSON.stringify(saved.layout))
  widgetCounter = saved.widgetCounter || 0
}

const deleteCurrentLayout = () => {
  const name = selectedLayoutName.value
  if (!name || !confirm(`Delete layout "${name}"?`)) return

  delete savedLayouts.value[name]

  if (defaultLayoutName.value === name) {
    defaultLayoutName.value = null
  }

  selectedLayoutName.value = ''
  layout.value = []
  widgetCounter = 0
}

const loadDefaultLayout = () => {
  // Try default layout first
  if (defaultLayoutName.value && savedLayouts.value[defaultLayoutName.value]) {
    selectedLayoutName.value = defaultLayoutName.value
    loadLayout()
    return
  }

  // Fall back to autosave
  if (savedLayouts.value[AUTOSAVE_KEY]) {
    const saved = savedLayouts.value[AUTOSAVE_KEY]
    // Set dashboardColNum BEFORE layout — same ordering rule as loadLayout()
    dashboardColNum.value = saved.dashboardColNum ?? 12
    layout.value = JSON.parse(JSON.stringify(saved.layout))
    widgetCounter = saved.widgetCounter || 0
  }
}

// Auto-save
const autoSaveLayout = () => {
  if (!autosaveEnabled.value) return
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
  }

  isAutoSaving.value = true

  autoSaveTimeout = setTimeout(() => {
    const layoutCopy = JSON.parse(JSON.stringify(layout.value))
    const name = selectedLayoutName.value
    const existing = savedLayouts.value[name || AUTOSAVE_KEY]
    savedLayouts.value[name || AUTOSAVE_KEY] = {
      layout: layoutCopy,
      widgetCounter: widgetCounter,
      dashboardColNum: dashboardColNum.value,
      created:     existing?.created     ?? Date.now(),
      description: existing?.description ?? '',
      modified:    Date.now(),
    }

    isAutoSaving.value = false
  }, AUTOSAVE_DEBOUNCE_MS)
}

// Watch for layout changes — only autosave when not locked
watch(layout, () => {
  if (!isLocked.value) autoSaveLayout()
}, { deep: true })

// Watch dashboardColNum — autosave so col count is persisted without a manual save
watch(dashboardColNum, () => {
  if (!isLocked.value) autoSaveLayout()
})

// Import/Export
const exportLayouts = () => {
  const exportData = {
    version: 1,
    exported: Date.now(),
    layouts: Object.fromEntries(
        Object.entries(savedLayouts.value)
            .filter(([name]) => name !== AUTOSAVE_KEY)
    ),
    defaultLayout: defaultLayoutName.value
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dashboard-layouts-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

const importLayouts = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)

      if (!data.layouts || typeof data.layouts !== 'object') {
        alert('Invalid layout file format')
        return
      }

      const conflicts = Object.keys(data.layouts)
          .filter(name => savedLayouts.value[name])

      if (conflicts.length > 0) {
        const msg = `The following layouts already exist and will be overwritten:\n${conflicts.join(', ')}\n\nContinue?`
        if (!confirm(msg)) return
      }

      // Merge layouts
      savedLayouts.value = {
        ...savedLayouts.value,
        ...data.layouts
      }

      if (data.defaultLayout && data.layouts[data.defaultLayout]) {
        defaultLayoutName.value = data.defaultLayout
      }

      alert(`Imported ${Object.keys(data.layouts).length} layout(s)`)

    } catch (e) {
      console.error('Import error:', e)
      alert('Failed to import layouts. Invalid file format.')
    }
  }
  reader.readAsText(file)

  // Reset file input
  event.target.value = ''
}

// Full Preview Modal
const showLayoutPreview = (layoutName) => {
  if (!layoutName || !savedLayouts.value[layoutName]) return

  previewLayoutName.value = layoutName
  previewMetadata.value = {
    created: savedLayouts.value[layoutName].created,
    modified: savedLayouts.value[layoutName].modified,
    description: savedLayouts.value[layoutName].description
  }
  showPreviewDialog.value = true
  isDropdownOpen.value = false  // Close dropdown when opening modal
  cancelHoverPreview()

  nextTick(() => {
    const saved = savedLayouts.value[layoutName]
    drawLayoutPreview(saved.layout, saved.dashboardColNum ?? 12)
  })
}

const drawLayoutPreview = (layoutData, colOverride) => {
  const canvas = previewCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const width = 600
  const height = 400
  const cols = colOverride ?? dashboardColNum.value
  const rowHeight = 30

  canvas.width = width
  canvas.height = height

  // Background
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, width, height)

  // Grid
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 1
  for (let i = 0; i <= cols; i++) {
    const x = (i / cols) * width
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  // Find max Y
  const maxY = Math.max(...layoutData.map(item => item.y + item.h), 10)
  const scale = height / (maxY * rowHeight)

  // Draw widgets
  layoutData.forEach(item => {
    const x = (item.x / cols) * width
    const y = (item.y * rowHeight) * scale
    const w = (item.w / cols) * width
    const h = (item.h * rowHeight) * scale

    // Widget background
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4)

    // Widget border
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4)

    // Widget type label
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.userLabel || item.type || 'widget', x + w/2, y + h/2)
  })
}

const loadPreviewedLayout = () => {
  selectedLayoutName.value = previewLayoutName.value
  loadLayout()
  showPreviewDialog.value = false
}

// Custom Dropdown
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const selectLayout = (name) => {
  selectedLayoutName.value = name
  loadLayout()
  isDropdownOpen.value = false
  cancelHoverPreview()
}

// Hover Preview
const startHoverPreview = (layoutName, event) => {
  cancelHoverPreview()

  hoverTimeout = setTimeout(() => {
    if (!savedLayouts.value[layoutName]) return

    const rect = event.target.getBoundingClientRect()
    hoverPreviewLayout.value = layoutName
    hoverPreviewMetadata.value = {
      created: savedLayouts.value[layoutName].created,
      modified: savedLayouts.value[layoutName].modified,
      description: savedLayouts.value[layoutName].description
    }

    // Position tooltip to the right of the option
    hoverPreviewStyle.value = {
      top: `${rect.top}px`,
      left: `${rect.right + 10}px`
    }

    hoverPreviewVisible.value = true

    nextTick(() => {
      const saved = savedLayouts.value[layoutName]
      drawMiniPreview(saved.layout, saved.dashboardColNum ?? 12)
    })
  }, 300) // 300ms hover delay
}

const cancelHoverPreview = () => {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    hoverTimeout = null
  }
  hoverPreviewVisible.value = false
  hoverPreviewLayout.value = ''
  hoverPreviewMetadata.value = null
}

const drawMiniPreview = (layoutData, colOverride) => {
  const canvas = hoverPreviewCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const width = 300
  const height = 200
  const cols = colOverride ?? dashboardColNum.value
  const rowHeight = 30

  // Background
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, width, height)

  // Grid lines
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 1
  for (let i = 0; i <= cols; i++) {
    const x = (i / cols) * width
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  // Calculate scale
  const maxY = Math.max(...layoutData.map(item => item.y + item.h), 10)
  const scale = height / (maxY * rowHeight)

  // Draw widgets
  layoutData.forEach(item => {
    const x = (item.x / cols) * width
    const y = (item.y * rowHeight) * scale
    const w = (item.w / cols) * width
    const h = (item.h * rowHeight) * scale

    // Widget background
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4)

    // Widget border
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4)

    // Widget type label
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.userLabel || item.type || 'widget', x + w/2, y + h/2)
  })
}

// Dialog Management
const closeSaveDialog = () => {
  showSaveDialog.value = false
  saveLayoutName.value = ''
  saveLayoutDescription.value = ''
  saveAsDefault.value = false
}

// Widget Operations
const addWidget = ({ type: widgetType, label: widgetLabel }) => {
  const perRow = 2  // always place 2 widgets side by side
  const w = Math.floor(dashboardColNum.value / perRow)
  const index = layout.value.length

  layout.value.push({
    x: (index % perRow) * w,
    y: Math.floor(index / perRow) * 19,
    w,
    h: 19,
    i: `widget-${widgetCounter++}`,
    type: widgetType,
    // userLabel is set to the friendly menu label on creation so the widget header
    // shows a human-readable name immediately. The user can rename from here.
    // Widgets from saved layouts that predate this change will have no userLabel
    // and fall back to the raw type string in WidgetWrapper — intentional.
    userLabel: widgetLabel,
  })
}

const updateLinkColor = (widgetId, linkColor) => {
  const item = layout.value.find(i => i.i === widgetId)
  if (item) {
    item.linkColor = linkColor || null
    autoSaveLayout()
  }
}

const updateColWidths = (widgetId, colWidths) => {
  const item = layout.value.find(i => i.i === widgetId)
  if (item) {
    item.colWidths = { ...colWidths }
    autoSaveLayout()
  }
}

const updateSettings = (widgetId, settings) => {
  const item = layout.value.find(i => i.i === widgetId)
  if (item) {
    item.settings = { ...settings }
    autoSaveLayout()
  }
}

const updateLabel = (widgetId, label) => {
  const item = layout.value.find(i => i.i === widgetId)
  if (item) {
    item.userLabel = label || ''
    autoSaveLayout()
  }
}

const removeWidget = (widgetId) => {
  layout.value = layout.value.filter(item => item.i !== widgetId)
}

// Utilities
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleString()
}

// Click-outside handler
const handleClickOutside = (e) => {
  if (selectContainer.value && !selectContainer.value.contains(e.target)) {
    isDropdownOpen.value = false
    cancelHoverPreview()
  }
}

// Lifecycle
onMounted(() => {
  window.addEventListener('resize', onResize)
  loadDefaultLayout()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  document.removeEventListener('click', handleClickOutside)
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
  if (hoverTimeout) clearTimeout(hoverTimeout)
})

defineExpose({ dashboardColNum, layout, addWidget, saveLayout, saveLayoutName, loadLayout, selectedLayoutName })
</script>

<style scoped>
.dashboard {
  padding: 2px;
  min-height: calc(100vh - 60px);
}

.dashboard-header {
  padding: 2px 4px;
  background: var(--pd-surface-2);
  border-bottom: 1px solid var(--pd-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.dashboard-header h1 {
  font-size: 20px;
  font-weight: 600;
  color: var(--pd-text);
}

.app-version {
  font-size: 13px;
  color: var(--pd-text-muted, #888);
  white-space: nowrap;
  margin-left: auto;
}

.layout-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.layout-selector {
  display: flex;
  gap: 6px;
  align-items: center;
}

/* Custom Select Styles */
.custom-select {
  position: relative;
  min-width: 200px;
}

.select-trigger {
  padding: 6px 12px;
  background: var(--pd-surface);
  border: 1px solid var(--pd-border);
  border-radius: 4px;
  color: var(--pd-text);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  user-select: none;
}

.select-trigger:hover {
  background: var(--pd-surface-2);
}

.select-trigger.active {
  border-color: var(--pd-accent);
  background: var(--pd-surface-2);
}

.select-trigger .placeholder {
  color: var(--pd-text-muted);
}

.select-trigger .arrow {
  font-size: 10px;
  transition: transform 0.2s;
}

.select-trigger.active .arrow {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--pd-surface);
  border: 1px solid var(--pd-border);
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
}

.select-option {
  padding: 8px 12px;
  color: var(--pd-text);
  font-size: 13px;
  cursor: pointer;
  border-bottom: 1px solid var(--pd-border);
  transition: background 0.1s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.option-name {
  flex: 1;
  cursor: pointer;
}

.option-preview-btn {
  padding: 2px 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--pd-text-muted);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition: all 0.2s;
  flex-shrink: 0;
}

.option-preview-btn:hover {
  background: var(--pd-bg);
  border-color: var(--pd-accent);
  color: var(--pd-accent);
}

.select-option:last-child {
  border-bottom: none;
}

.select-option:hover:not(.disabled) {
  background: var(--pd-surface-2);
}

.select-option.selected {
  background: rgba(124, 58, 237, 0.15);
  color: var(--pd-accent);
}

.select-option.disabled {
  color: var(--pd-text-muted);
  cursor: default;
}

.btn-icon {
  padding: 4px 8px;
  background: var(--pd-surface);
  border: 1px solid var(--pd-border);
  border-radius: 4px;
  color: var(--pd-text);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.btn-icon:hover:not(:disabled) {
  background: var(--pd-surface-2);
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-icon--inactive {
  opacity: 0.4;
  filter: grayscale(1);
}

.col-num-stepper {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}

.col-step-btn {
  width: 28px;
  height: 28px;
  background: var(--pd-surface);
  border: 1px solid var(--pd-border);
  border-radius: 4px;
  color: var(--pd-text);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  user-select: none;
}

.col-step-btn:hover {
  background: var(--pd-surface-2);
}

.col-num-display {
  min-width: 32px;
  text-align: center;
  font-size: 12px;
  color: var(--pd-text-muted);
  font-variant-numeric: tabular-nums;
}

/* Larger touch targets on mobile */
@media (max-width: 639px) {
  .col-step-btn {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
  .col-num-display {
    font-size: 13px;
    min-width: 36px;
  }
}

.auto-save-indicator {
  font-size: 12px;
  color: var(--pd-text-muted);
  padding: 4px 8px;
  background: rgba(175, 175, 175, 0.08);
  border-radius: 4px;
}

.status {
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 4px;
}

.status.success {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}

.status.error {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}

/* Hover Preview Tooltip */
.hover-preview-tooltip {
  position: fixed;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  padding: 12px;
  z-index: 200;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  max-width: 320px;
}

.preview-header {
  margin-bottom: 8px;
}

.preview-header strong {
  display: block;
  color: #fff;
  font-size: 14px;
  margin-bottom: 4px;
}

.preview-desc {
  display: block;
  color: #94a3b8;
  font-size: 12px;
  font-style: italic;
}

.mini-preview-canvas {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  margin-bottom: 8px;
}

.preview-meta-mini {
  font-size: 11px;
  color: #64748b;
  text-align: right;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 20px;
  min-width: 320px;
  max-width: 90vw;
}

.modal-large {
  min-width: 640px;
}

.modal h3 {
  margin: 0 0 16px 0;
  color: #fff;
  font-size: 18px;
}

.layout-input {
  width: 100%;
  padding: 8px;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.layout-textarea {
  width: 100%;
  padding: 8px;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  margin-bottom: 12px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ccc;
  font-size: 14px;
  margin-bottom: 16px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
}

.warning-message {
  padding: 8px 12px;
  background: rgba(251, 146, 60, 0.1);
  border: 1px solid rgba(251, 146, 60, 0.3);
  border-radius: 4px;
  color: #fb923c;
  font-size: 13px;
  margin-bottom: 16px;
}

.preview-metadata {
  margin-bottom: 16px;
  padding: 12px;
  background: #0a0a0a;
  border-radius: 4px;
}

.preview-metadata .description {
  color: #94a3b8;
  font-size: 14px;
  margin: 0 0 8px 0;
  font-style: italic;
}

.preview-metadata .metadata-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #64748b;
}

.preview-container {
  margin-bottom: 16px;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  overflow: hidden;
}

.preview-canvas {
  display: block;
  width: 100%;
  height: auto;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-primary, .btn-secondary {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid #444;
}

.btn-primary {
  background: #4ade80;
  color: #000;
  border-color: #4ade80;
}

.btn-primary:hover {
  background: #22c55e;
}

.btn-secondary {
  background: #2d2d2d;
  color: #fff;
}

.btn-secondary:hover {
  background: #3d3d3d;
}

.auth-required {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.auth-required p {
  margin-bottom: 16px;
  font-size: 16px;
  color: #999;
}

.auth-required button {
  padding: 10px 20px;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.auth-required button:hover {
  background: #3d3d3d;
}

.alert-manager-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.alert-bell {
  position: relative;
  font-size: 18px;
  padding: 4px 8px;
}

.alert-bell--muted {
  opacity: 0.5;
  filter: grayscale(1);
}

.alert-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 9999px;
  padding: 1px 4px;
  line-height: 1.2;
  min-width: 16px;
  text-align: center;
}

.alert-manager-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 200;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.audio-blocked-banner {
  background: #f97316;
  color: #fff;
  text-align: center;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}

.audio-blocked-banner:hover {
  background: #ea6a00;
}

/* ── Responsive visibility utilities ── */
.hidden-mobile  { display: flex; }   /* shown by default */
.visible-mobile { display: none; }   /* hidden by default */

@media (max-width: 639px) {
  .hidden-mobile  { display: none !important; }
  .visible-mobile { display: flex; }

  .dashboard-title { font-size: 15px; }
}

/* ── Mobile hamburger wrap ── */
.mobile-menu-wrap {
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.mobile-autosave-dot {
  font-size: 10px;
  color: #4ade80;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

.hamburger-btn {
  font-size: 22px;
  padding: 4px 10px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Mobile bottom-sheet overlay ── */
.mobile-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2000;
  display: flex;
  align-items: flex-end;   /* sheet rises from bottom */
}

.mobile-sheet {
  width: 100%;
  max-height: 90dvh;
  background: var(--pd-surface, #1a1a1a);
  border-top: 1px solid var(--pd-border, #2a2a2a);
  border-radius: 16px 16px 0 0;
  overflow-y: auto;
  padding: 0 0 env(safe-area-inset-bottom, 16px);
  -webkit-overflow-scrolling: touch;
}

.mobile-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 8px;
  border-bottom: 1px solid var(--pd-border, #2a2a2a);
  position: sticky;
  top: 0;
  background: var(--pd-surface, #1a1a1a);
  z-index: 1;
}

.mobile-sheet-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--pd-text, #fff);
}

.mobile-sheet-close {
  background: none;
  border: none;
  color: var(--pd-text-muted, #888);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.mobile-sheet-close:hover {
  background: var(--pd-surface-2, #2a2a2a);
}

.mobile-sheet-section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--pd-border, #2a2a2a);
}

.mobile-sheet-section:last-child {
  border-bottom: none;
}

.mobile-sheet-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pd-text-muted, #666);
  margin-bottom: 10px;
}

/* Layout picker row inside the sheet */
.mobile-layout-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.custom-select--sheet {
  flex: 1;
  min-width: 0;
}

.custom-select--sheet .select-trigger {
  font-size: 15px;
  padding: 10px 14px;
  min-height: 48px;
}

.custom-select--sheet .select-dropdown {
  font-size: 15px;
  max-height: 220px;
}

.custom-select--sheet .select-option {
  padding: 12px 16px;
  font-size: 15px;
}

/* 3-column action grid */
.mobile-action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.mobile-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 8px;
  background: var(--pd-surface-2, #2a2a2a);
  border: 1px solid var(--pd-border, #333);
  border-radius: 10px;
  cursor: pointer;
  color: var(--pd-text, #fff);
  min-height: 72px;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.mobile-action-btn:active {
  background: var(--pd-accent, #7c3aed);
}

.mobile-action-btn--dim {
  opacity: 0.45;
}

/* WidgetMenu sits inside an action-btn cell; override its internal styles */
.mobile-action-btn--menu {
  padding: 0;
  overflow: visible;
  background: none;
  border: none;
}

.mobile-action-btn--menu :deep(.widget-menu) {
  width: 100%;
  height: 100%;
}

.mobile-action-btn--menu :deep(.menu-toggle) {
  width: 100%;
  height: 100%;
  min-height: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--pd-surface-2, #2a2a2a);
  border: 1px solid var(--pd-border, #333);
  border-radius: 10px;
  color: var(--pd-text, #fff);
  font-size: 11px;
  cursor: pointer;
  padding: 14px 8px;
  -webkit-tap-highlight-color: transparent;
}

.mobile-action-btn--menu :deep(.menu-toggle):active {
  background: var(--pd-accent, #7c3aed);
}

.mobile-action-btn--menu :deep(.menu-panel) {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--pd-surface, #1a1a1a);
  border-top: 1px solid var(--pd-border, #2a2a2a);
  border-radius: 16px 16px 0 0;
  padding: 16px;
  z-index: 2100;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  max-height: 70dvh;
  overflow-y: auto;
}

.mobile-action-btn--menu :deep(.widget-button) {
  padding: 14px;
  background: var(--pd-surface-2, #2a2a2a);
  border: 1px solid var(--pd-border, #333);
  border-radius: 10px;
  color: var(--pd-text, #fff);
  font-size: 14px;
  cursor: pointer;
  text-align: center;
}

.mobile-action-icon {
  font-size: 24px;
  line-height: 1;
  position: relative;
}

.mobile-action-label {
  font-size: 11px;
  color: var(--pd-text-muted, #999);
  text-align: center;
  line-height: 1.2;
}

.alert-badge--menu {
  position: absolute;
  top: -6px;
  right: -8px;
  font-size: 9px;
}

/* Column stepper inside the sheet */
.mobile-sheet-stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.col-step-btn--large {
  width: 56px;
  height: 56px;
  font-size: 28px;
  border-radius: 8px;
}

.col-num-display--large {
  font-size: 28px;
  font-weight: 600;
  min-width: 56px;
  text-align: center;
  color: var(--pd-text, #fff);
  font-variant-numeric: tabular-nums;
}
</style>
