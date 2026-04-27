/**
 * chartIndicators.js — Pure client-side indicator computation.
 *
 * All functions accept bars sorted ascending (oldest first) as returned by the
 * Massive /v2/aggs API with sort=asc. Each bar is { t, o, h, l, c, v, vw }.
 *
 * Null convention: warmup periods produce null values so callers can skip
 * rendering those data points cleanly.
 */

// ── EMA ───────────────────────────────────────────────────────────────────────

/**
 * Exponential Moving Average.
 * Seed strategy: SMA of the first `period` bars → `period - 1` null warmup values.
 * k = 2 / (period + 1)
 *
 * @param {object[]} bars
 * @param {number}   period
 * @returns {(number|null)[]}  null for first period-1 bars; SMA-seeded EMA thereafter
 */
export function calcEMA(bars, period) {
  const result = new Array(bars.length).fill(null)
  if (bars.length < period) return result

  // Seed: SMA of first `period` bars
  let sum = 0
  for (let i = 0; i < period; i++) sum += bars[i].c
  let ema = sum / period
  result[period - 1] = ema

  const k = 2 / (period + 1)
  for (let i = period; i < bars.length; i++) {
    ema = bars[i].c * k + ema * (1 - k)
    result[i] = ema
  }
  return result
}

// ── SMA ───────────────────────────────────────────────────────────────────────

/**
 * Simple Moving Average.
 * @param {object[]} bars
 * @param {number}   period
 * @returns {(number|null)[]}  null for first period-1 bars
 */
export function calcSMA(bars, period) {
  const result = new Array(bars.length).fill(null)
  for (let i = period - 1; i < bars.length; i++) {
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += bars[j].c
    result[i] = sum / period
  }
  return result
}

// ── VWMA ──────────────────────────────────────────────────────────────────────

/**
 * Volume Weighted Moving Average.
 * @param {object[]} bars
 * @param {number}   period
 * @returns {(number|null)[]}  null for first period-1 bars; null if total volume is zero
 */
export function calcVWMA(bars, period) {
  const result = new Array(bars.length).fill(null)
  for (let i = period - 1; i < bars.length; i++) {
    let sumPV = 0, sumV = 0
    for (let j = i - period + 1; j <= i; j++) {
      sumPV += bars[j].c * bars[j].v
      sumV  += bars[j].v
    }
    result[i] = sumV === 0 ? null : sumPV / sumV
  }
  return result
}

// ── VWAP ──────────────────────────────────────────────────────────────────────

/**
 * Volume Weighted Average Price using the API-provided `vw` (bar VWAP) field.
 *
 * - Daily/weekly (isIntraday = false): returns `vw` per bar directly — no accumulation.
 * - Intraday (isIntraday = true): cumulative Σ(vw×v) / Σ(v) reset at each calendar
 *   day boundary detected from `t` (Unix ms). Zero-volume bars preserve the prior value.
 *
 * @param {object[]} bars
 * @param {boolean}  isIntraday  — when true, applies per-session cumulative reset
 * @returns {number[]}  no null values; vw field is always defined
 */
export function calcVWAP(bars, isIntraday) {
  if (!isIntraday) {
    return bars.map(b => b.vw)
  }

  const result = []
  let cumPV = 0, cumV = 0
  let lastDateStr = null

  for (const bar of bars) {
    const dateStr = new Date(bar.t).toDateString()
    if (dateStr !== lastDateStr) {
      cumPV = 0
      cumV  = 0
      lastDateStr = dateStr
    }

    if (bar.v > 0) {
      cumPV += bar.vw * bar.v
      cumV  += bar.v
    }

    result.push(cumV === 0 ? bar.vw : cumPV / cumV)
  }
  return result
}

// ── MACD ──────────────────────────────────────────────────────────────────────

/**
 * Moving Average Convergence/Divergence.
 *
 * Null propagation:
 *   macdLine[i]             null for i < slow - 1
 *   signalLine[i]/histogram null for i < slow + signal - 2
 *
 * @param {object[]} bars
 * @param {number}   fast    default 12
 * @param {number}   slow    default 26
 * @param {number}   signal  default 9
 * @returns {{ macdLine: (number|null)[], signalLine: (number|null)[], histogram: (number|null)[] }}
 */
export function calcMACD(bars, fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(bars, fast)
  const emaSlow = calcEMA(bars, slow)

  const macdLine = bars.map((_, i) => {
    if (emaFast[i] === null || emaSlow[i] === null) return null
    return emaFast[i] - emaSlow[i]
  })

  // Signal = EMA of macdLine (period = signal), computed only over defined values
  // We need to find the first non-null macdLine index and seed from there
  const signalLine = new Array(bars.length).fill(null)
  const histogram  = new Array(bars.length).fill(null)

  const firstMacd = macdLine.findIndex(v => v !== null)
  if (firstMacd === -1) return { macdLine, signalLine, histogram }

  // Build a sub-array of macdLine values starting from firstMacd, compute EMA
  const macdSlice = macdLine.slice(firstMacd).map(v => ({ c: v }))
  const signalSlice = calcEMA(macdSlice, signal)

  for (let i = 0; i < signalSlice.length; i++) {
    const absIdx = firstMacd + i
    if (signalSlice[i] !== null) {
      signalLine[absIdx] = signalSlice[i]
      histogram[absIdx]  = macdLine[absIdx] - signalSlice[i]
    }
  }

  return { macdLine, signalLine, histogram }
}

// ── Volume Average ────────────────────────────────────────────────────────────

/**
 * Simple moving average of bar volume.
 * @param {object[]} bars
 * @param {number}   period
 * @returns {(number|null)[]}  null for first period-1 bars
 */
export function calcVolumeAvg(bars, period) {
  // Reuse calcSMA on a volume-close proxy
  const volBars = bars.map(b => ({ c: b.v }))
  return calcSMA(volBars, period)
}
