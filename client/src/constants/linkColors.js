/**
 * linkColors — shared color palette for widget bus link groups.
 *
 * Extracted from useWidgetBus so both useWidgetBus and useDashboardStore
 * can import from a single source of truth.
 */

export const LINK_COLORS = [
  { name: 'red',    hex: '#ef4444' },
  { name: 'orange', hex: '#f97316' },
  { name: 'yellow', hex: '#eab308' },
  { name: 'green',  hex: '#22c55e' },
  { name: 'blue',   hex: '#3b82f6' },
  { name: 'violet', hex: '#8b5cf6' },
  { name: 'pink',   hex: '#ec4899' },
  { name: 'cyan',   hex: '#06b6d4' },
  { name: 'white',  hex: '#e5e7eb' },
]

export const LINK_COLOR_MAP = Object.fromEntries(LINK_COLORS.map(c => [c.name, c.hex]))
