<template>
  <header class="dashboard-header">
    <h1 class="dashboard-title">Stock Scanner Dashboard</h1>
    <div v-if="appConfig" class="status success">Connected</div>
    <div v-else class="status error">Error</div>

    <!-- Mobile toolbar: layout selector + lock + widget add -->
    <div v-if="appConfig && isMobile" class="layout-controls layout-controls--mobile">
      <!-- Layout load dropdown -->
      <div class="custom-select custom-select--mobile" ref="selectContainerMobile">
        <div
            class="select-trigger"
            @click="toggleDropdown"
            :class="{ active: isDropdownOpen }"
        >
          <span v-if="selectedLayoutName">{{ selectedLayoutName }}</span>
          <span v-else class="placeholder">Layout</span>
          <span class="arrow">▼</span>
        </div>
        <div v-if="isDropdownOpen" class="select-dropdown">
          <div
              v-for="name in savedLayoutNames"
              :key="name"
              class="select-option"
              :class="{ selected: name === selectedLayoutName }"
          >
            <span class="option-name" @click="selectLayout(name)">
              {{ name }}{{ name === defaultLayoutName ? ' ✓' : '' }}
            </span>
          </div>
          <div v-if="savedLayoutNames.length === 0" class="select-option disabled">
            No saved layouts
          </div>
        </div>
      </div>
      <button @click="showSaveDialog = true" class="btn-icon" title="Save Layout">💾</button>
      <button
          @click="isLocked = !isLocked"
          class="btn-icon"
          :title="isLocked ? 'Unlock layout' : 'Lock layout'"
      >{{ isLocked ? '🔒' : '✏️' }}</button>
      <div class="widget-menu">
        <WidgetMenu @add-widget="addWidget" />
      </div>
    </div>

    <!-- Desktop toolbar: full controls -->
    <div v-if="appConfig && !isMobile" class="layout-controls">

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

    </div>

    <div v-if="!appConfig" class="auth-required">
      <p>Please log in to access the dashboard</p>
    </div>
  </header>

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
    <!-- Mobile: simple vertical stack (< 640px) -->
    <div v-if="isMobile" class="mobile-stack">
      <div
          v-for="item in layout"
          :key="item.i"
          class="mobile-widget"
      >
        <WidgetWrapper
            :widget-id="item.i"
            :widget-type="item.type"
            :is-locked="true"
            :col-widths="item.colWidths || {}"
            :link-color="item.linkColor || null"
            :settings="item.settings || {}"
            :user-label="item.userLabel || ''"
            :is-mobile="true"
            @close="removeWidget"
            @update-col-widths="(w) => updateColWidths(item.i, w)"
            @update-link-color="(c) => updateLinkColor(item.i, c)"
            @update-settings="(s) => updateSettings(item.i, s)"
            @update-label="(l) => updateLabel(item.i, l)"
        />
      </div>
    </div>

    <!-- Desktop/tablet: grid layout -->
    <GridLayout
        v-else
        v-model:layout="layout"
        :col-num="12"
        :row-height="30"
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
      >
        <WidgetWrapper
            :widget-id="item.i"
            :widget-type="item.type"
            :is-locked="isLocked"
            :col-widths="item.colWidths || {}"
            :link-color="item.linkColor || null"
            :settings="item.settings || {}"
            :user-label="item.userLabel || ''"
            :is-mobile="false"
            @close="removeWidget"
            @update-col-widths="(w) => updateColWidths(item.i, w)"
            @update-link-color="(c) => updateLinkColor(item.i, c)"
            @update-settings="(s) => updateSettings(item.i, s)"
            @update-label="(l) => updateLabel(item.i, l)"
        />
      </GridItem>
    </GridLayout>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { GridLayout, GridItem } from 'vue3-grid-layout-next'
import 'vue3-grid-layout-next/dist/style.css'
import WidgetMenu from './WidgetMenu.vue'
import WidgetWrapper from './WidgetWrapper.vue'

const appConfig = window.__APP_CONFIG__ || {};

// Responsive: phone < 640px gets stacked layout; tablet/desktop keeps grid
const MOBILE_BREAKPOINT = 640
const isMobile = ref(window.innerWidth < MOBILE_BREAKPOINT)
const onResize = () => { isMobile.value = window.innerWidth < MOBILE_BREAKPOINT }

const STORAGE_KEY = 'dashboard-layouts'
const DEFAULT_KEY = 'dashboard-default-layout'
const LOCK_KEY = 'dashboard-layout-locked'
const AUTOSAVE_KEY = '__autosave__'
const AUTOSAVE_ENABLED_KEY = 'dashboard-autosave-enabled'
const AUTOSAVE_DEBOUNCE_MS = 2000

// Lock mode — default locked to prevent accidental drag/autosave
const isLocked = ref(localStorage.getItem(LOCK_KEY) !== 'false')
watch(isLocked, (val) => localStorage.setItem(LOCK_KEY, String(val)))

const autosaveEnabled = ref(localStorage.getItem(AUTOSAVE_ENABLED_KEY) !== 'false')
watch(autosaveEnabled, (val) => localStorage.setItem(AUTOSAVE_ENABLED_KEY, String(val)))

// State
const layout = ref([])
const savedLayouts = ref({})
const defaultLayoutName = ref(null)
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
const previewCanvas = ref(null)
const isDropdownOpen = ref(false)
const selectContainer = ref(null)
const hoverPreviewVisible = ref(false)
const hoverPreviewLayout = ref('')
const hoverPreviewMetadata = ref(null)
const hoverPreviewStyle = ref({})
const hoverPreviewCanvas = ref(null)
let widgetCounter = 0
let autoSaveTimeout = null
let hoverTimeout = null

// Computed
const savedLayoutNames = computed(() =>
    Object.keys(savedLayouts.value)
        // .filter(name => name !== AUTOSAVE_KEY)
        .sort()
)

const editingExistingLayout = computed(() =>
    saveLayoutName.value.trim() && savedLayouts.value[saveLayoutName.value.trim()]
)

// LocalStorage Operations
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    savedLayouts.value = stored ? JSON.parse(stored) : {}
    defaultLayoutName.value = localStorage.getItem(DEFAULT_KEY)
  } catch (e) {
    console.error('Failed to load layouts:', e)
    savedLayouts.value = {}
  }
}

const saveToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLayouts.value))
    if (defaultLayoutName.value) {
      localStorage.setItem(DEFAULT_KEY, defaultLayoutName.value)
    } else {
      localStorage.removeItem(DEFAULT_KEY)
    }
  } catch (e) {
    console.error('Failed to save layouts:', e)
  }
}

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
    created: existing?.created || now,
    modified: now,
    description: saveLayoutDescription.value.trim()
  }

  if (saveAsDefault.value) {
    defaultLayoutName.value = name
  }

  saveToStorage()
  selectedLayoutName.value = name
  closeSaveDialog()
}

const loadLayout = () => {
  const name = selectedLayoutName.value
  if (!name || !savedLayouts.value[name]) return

  const saved = savedLayouts.value[name]
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

  saveToStorage()
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
    savedLayouts.value[name || AUTOSAVE_KEY] = {
      layout: layoutCopy,
      widgetCounter: widgetCounter,
      modified: Date.now()
    }

    saveToStorage()
    isAutoSaving.value = false
  }, AUTOSAVE_DEBOUNCE_MS)
}

// Watch for layout changes — only autosave when not locked
watch(layout, () => {
  if (!isLocked.value) autoSaveLayout()
}, { deep: true })

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
  a.click()
  URL.revokeObjectURL(url)
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

      saveToStorage()
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
    drawLayoutPreview(savedLayouts.value[layoutName].layout)
  })
}

const drawLayoutPreview = (layoutData) => {
  const canvas = previewCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const width = 600
  const height = 400
  const cols = 12
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
    ctx.fillText(item.type || 'widget', x + w/2, y + h/2)
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
      drawMiniPreview(savedLayouts.value[layoutName].layout)
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

const drawMiniPreview = (layoutData) => {
  const canvas = hoverPreviewCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const width = 300
  const height = 200
  const cols = 12
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
    ctx.fillText(item.type || 'widget', x + w/2, y + h/2)
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
const addWidget = (widgetType) => {
  const cols = 2
  const index = layout.value.length

  layout.value.push({
    x: (index % cols) * 6,
    y: Math.floor(index / cols) * 19,
    w: 6,
    h: 19,
    i: `widget-${widgetCounter++}`,
    type: widgetType
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
  loadFromStorage()
  loadDefaultLayout()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  document.removeEventListener('click', handleClickOutside)
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
  if (hoverTimeout) clearTimeout(hoverTimeout)
})
</script>

<style scoped>
.dashboard {
  padding: 2px;
  min-height: calc(100vh - 60px);
}

.dashboard-header {
  padding: 2px 4px;
  background: #1a1a1a;
  border-bottom: 1px solid #2a2a2a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.dashboard-header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
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
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  user-select: none;
}

.select-trigger:hover {
  background: #3d3d3d;
}

.select-trigger.active {
  border-color: #4ade80;
  background: #3d3d3d;
}

.select-trigger .placeholder {
  color: #666;
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
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.select-option {
  padding: 8px 12px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  border-bottom: 1px solid #1a1a1a;
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
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition: all 0.2s;
  flex-shrink: 0;
}

.option-preview-btn:hover {
  background: #1a1a1a;
  border-color: #3b82f6;
  color: #3b82f6;
}

.select-option:last-child {
  border-bottom: none;
}

.select-option:hover:not(.disabled) {
  background: #3d3d3d;
}

.select-option.selected {
  background: #1e3a2e;
  color: #4ade80;
}

.select-option.disabled {
  color: #666;
  cursor: default;
}

.btn-icon {
  padding: 4px 8px;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.btn-icon:hover:not(:disabled) {
  background: #3d3d3d;
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-icon--inactive {
  opacity: 0.4;
  filter: grayscale(1);
}

.auto-save-indicator {
  font-size: 12px;
  color: #94a3b8;
  padding: 4px 8px;
  background: rgba(148, 163, 184, 0.1);
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

/* ── Mobile (< 640px) ── */
@media (max-width: 639px) {
  .dashboard-title { font-size: 15px; }

  .layout-controls--mobile {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .custom-select--mobile {
    min-width: 110px;
    max-width: 150px;
    position: relative;
  }

  .custom-select--mobile .select-trigger {
    font-size: 12px;
    padding: 4px 8px;
  }

  .custom-select--mobile .select-dropdown {
    font-size: 12px;
    z-index: 9999;
  }

  .mobile-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 6px;
  }

  .mobile-widget {
    width: 100%;
    /* Fixed heights per widget type handled by inner widget */
  }

  .mobile-widget .widget-wrapper {
    border-radius: 6px;
  }
}
</style>
