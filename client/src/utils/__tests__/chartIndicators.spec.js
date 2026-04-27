import { describe, test, expect } from 'vitest'
import {
  calcEMA,
  calcSMA,
  calcVWMA,
  calcVWAP,
  calcMACD,
  calcVolumeAvg,
} from '../chartIndicators.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBars(closes, volumes = null, vws = null) {
  return closes.map((c, i) => ({
    t: (1_700_000_000 + i * 60) * 1000,
    o: c - 0.1,
    h: c + 0.2,
    l: c - 0.2,
    c,
    v: volumes ? volumes[i] : 1_000_000,
    vw: vws ? vws[i] : c,
  }))
}

function makeIntradayBars() {
  // Two trading days — day 1: bars 0-3 (t = day1), day 2: bars 4-7 (t = day2)
  const day1 = new Date('2026-01-02T14:00:00Z').getTime()  // Friday
  const day2 = new Date('2026-01-05T14:00:00Z').getTime()  // Monday
  return [0, 1, 2, 3].map(i => ({
    t: day1 + i * 60_000,
    o: 100, h: 101, l: 99, c: 100 + i,
    v: 1_000_000,
    vw: 100 + i,
  })).concat([0, 1, 2, 3].map(i => ({
    t: day2 + i * 60_000,
    o: 110, h: 111, l: 109, c: 110 + i,
    v: 2_000_000,
    vw: 110 + i,
  })))
}

// ── calcEMA ───────────────────────────────────────────────────────────────────

describe('calcEMA', () => {
  test('with period 3 expect first 2 values null (SMA seed warmup)', () => {
    // Arrange
    const bars = makeBars([10, 20, 30, 40, 50])

    // Act
    const result = calcEMA(bars, 3)

    // Assert
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
  })

  test('with period 3 expect first defined value at index 2 equals SMA of first 3 bars', () => {
    // Arrange
    const bars = makeBars([10, 20, 30, 40, 50])

    // Act
    const result = calcEMA(bars, 3)

    // Assert — seed = SMA(10,20,30) = 20
    expect(result[2]).toBeCloseTo(20, 5)
  })

  test('with period 3 expect subsequent values converge with EMA formula', () => {
    // Arrange
    const bars = makeBars([10, 20, 30, 40, 50])
    const k = 2 / (3 + 1)  // 0.5

    // Act
    const result = calcEMA(bars, 3)

    // Assert — EMA[3] = close[3]*k + EMA[2]*(1-k) = 40*0.5 + 20*0.5 = 30
    expect(result[3]).toBeCloseTo(30, 5)
    // EMA[4] = 50*0.5 + 30*0.5 = 40
    expect(result[4]).toBeCloseTo(40, 5)
  })

  test('with period equal to bar count expect only last bar defined', () => {
    // Arrange
    const bars = makeBars([10, 20, 30])

    // Act
    const result = calcEMA(bars, 3)

    // Assert
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
    expect(result[2]).not.toBeNull()
  })

  test('with period 1 expect no null warmup (single bar seed = that close)', () => {
    // Arrange
    const bars = makeBars([10, 20, 30])

    // Act
    const result = calcEMA(bars, 1)

    // Assert — period 1: k=1, EMA = close
    expect(result[0]).toBeCloseTo(10, 5)
    expect(result[1]).toBeCloseTo(20, 5)
    expect(result[2]).toBeCloseTo(30, 5)
  })
})

// ── calcSMA ───────────────────────────────────────────────────────────────────

describe('calcSMA', () => {
  test('with period 3 expect first 2 values null', () => {
    // Arrange
    const bars = makeBars([10, 20, 30, 40])

    // Act
    const result = calcSMA(bars, 3)

    // Assert
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
  })

  test('with period 3 expect correct sliding window average', () => {
    // Arrange
    const bars = makeBars([10, 20, 30, 40])

    // Act
    const result = calcSMA(bars, 3)

    // Assert
    expect(result[2]).toBeCloseTo(20, 5)   // (10+20+30)/3
    expect(result[3]).toBeCloseTo(30, 5)   // (20+30+40)/3
  })

  test('with period 1 expect all values defined and equal to close', () => {
    // Arrange
    const bars = makeBars([5, 10, 15])

    // Act
    const result = calcSMA(bars, 1)

    // Assert
    expect(result).toEqual([5, 10, 15])
  })
})

// ── calcVWMA ──────────────────────────────────────────────────────────────────

describe('calcVWMA', () => {
  test('with period 3 expect first 2 values null', () => {
    // Arrange
    const bars = makeBars([10, 20, 30, 40])

    // Act
    const result = calcVWMA(bars, 3)

    // Assert
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
  })

  test('with equal volumes expect VWMA equals SMA', () => {
    // Arrange — equal volumes make VWMA = SMA
    const bars = makeBars([10, 20, 30], [1, 1, 1])

    // Act
    const result = calcVWMA(bars, 3)

    // Assert
    expect(result[2]).toBeCloseTo(20, 5)  // (10+20+30)/3
  })

  test('with higher volume on last bar expect VWMA weighted toward last close', () => {
    // Arrange
    const bars = makeBars([10, 10, 30], [1, 1, 10])

    // Act
    const result = calcVWMA(bars, 3)

    // Assert — (10×1 + 10×1 + 30×10) / 12 ≈ 26.67
    expect(result[2]).toBeCloseTo((10 + 10 + 300) / 12, 3)
  })

  test('with zero total volume in window expect null', () => {
    // Arrange
    const bars = makeBars([10, 20, 30], [0, 0, 0])

    // Act
    const result = calcVWMA(bars, 3)

    // Assert
    expect(result[2]).toBeNull()
  })
})

// ── calcVWAP ──────────────────────────────────────────────────────────────────

describe('calcVWAP', () => {
  test('intraday: first bar VWAP equals its vw value', () => {
    // Arrange
    const bars = makeIntradayBars()

    // Act
    const result = calcVWAP(bars, true)

    // Assert
    expect(result[0]).toBeCloseTo(bars[0].vw, 5)
  })

  test('intraday: cumulative formula Σ(vw×v)/Σ(v) within a day', () => {
    // Arrange
    const bars = makeIntradayBars()

    // Act
    const result = calcVWAP(bars, true)

    // Assert — bar 1: (vw0×v0 + vw1×v1) / (v0+v1)
    const expected = (bars[0].vw * bars[0].v + bars[1].vw * bars[1].v) / (bars[0].v + bars[1].v)
    expect(result[1]).toBeCloseTo(expected, 5)
  })

  test('intraday: VWAP resets at day boundary', () => {
    // Arrange
    const bars = makeIntradayBars()

    // Act
    const result = calcVWAP(bars, true)

    // Assert — bar 4 (first bar of day 2) resets; equals day2 bar0 vw
    expect(result[4]).toBeCloseTo(bars[4].vw, 5)
  })

  test('intraday: no null values (vw field always defined)', () => {
    // Arrange
    const bars = makeIntradayBars()

    // Act
    const result = calcVWAP(bars, true)

    // Assert
    expect(result.every(v => v !== null)).toBe(true)
  })

  test('daily: returns vw field directly without accumulation', () => {
    // Arrange
    const bars = makeBars([100, 110, 120], null, [101, 111, 121])

    // Act
    const result = calcVWAP(bars, false)

    // Assert
    expect(result[0]).toBeCloseTo(101, 5)
    expect(result[1]).toBeCloseTo(111, 5)
    expect(result[2]).toBeCloseTo(121, 5)
  })

  test('intraday: zero volume bar preserves previous cumulative VWAP', () => {
    // Arrange — second bar has zero volume
    const day = new Date('2026-01-02T14:00:00Z').getTime()
    const bars = [
      { t: day,             o: 100, h: 101, l: 99, c: 100, v: 1_000_000, vw: 100 },
      { t: day + 60_000,    o: 100, h: 101, l: 99, c: 105, v: 0,         vw: 0   },
    ]

    // Act
    const result = calcVWAP(bars, true)

    // Assert — zero volume bar does not corrupt VWAP
    expect(result[1]).toBeCloseTo(100, 5)
  })
})

// ── calcMACD ──────────────────────────────────────────────────────────────────

describe('calcMACD', () => {
  function makeLongBars(n) {
    return makeBars(Array.from({ length: n }, (_, i) => 100 + i))
  }

  test('macdLine null for first slow-1 bars', () => {
    // Arrange
    const bars = makeLongBars(40)

    // Act
    const { macdLine } = calcMACD(bars, 12, 26, 9)

    // Assert — first 25 null (slow=26 → 25 warmup)
    for (let i = 0; i < 25; i++) expect(macdLine[i]).toBeNull()
    expect(macdLine[25]).not.toBeNull()
  })

  test('signalLine null for first slow+signal-2 bars', () => {
    // Arrange
    const bars = makeLongBars(50)

    // Act
    const { signalLine } = calcMACD(bars, 12, 26, 9)

    // Assert — first 33 null (26+9-2=33)
    for (let i = 0; i < 33; i++) expect(signalLine[i]).toBeNull()
    expect(signalLine[33]).not.toBeNull()
  })

  test('histogram null where signalLine is null', () => {
    // Arrange
    const bars = makeLongBars(50)

    // Act
    const { histogram, signalLine } = calcMACD(bars, 12, 26, 9)

    // Assert — histogram mirrors signalLine null pattern
    histogram.forEach((h, i) => {
      if (signalLine[i] === null) expect(h).toBeNull()
      else expect(h).not.toBeNull()
    })
  })

  test('histogram equals macdLine minus signalLine where both defined', () => {
    // Arrange
    const bars = makeLongBars(50)

    // Act
    const { macdLine, signalLine, histogram } = calcMACD(bars, 12, 26, 9)

    // Assert — spot check a few defined values
    for (let i = 33; i < 40; i++) {
      expect(histogram[i]).toBeCloseTo(macdLine[i] - signalLine[i], 10)
    }
  })

  test('returns arrays with same length as input bars', () => {
    // Arrange
    const bars = makeLongBars(50)

    // Act
    const { macdLine, signalLine, histogram } = calcMACD(bars, 12, 26, 9)

    // Assert
    expect(macdLine.length).toBe(50)
    expect(signalLine.length).toBe(50)
    expect(histogram.length).toBe(50)
  })
})

// ── calcVolumeAvg ─────────────────────────────────────────────────────────────

describe('calcVolumeAvg', () => {
  test('with period 3 expect first 2 values null', () => {
    // Arrange
    const bars = makeBars([10, 10, 10, 10], [100, 200, 300, 400])

    // Act
    const result = calcVolumeAvg(bars, 3)

    // Assert
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
  })

  test('with period 3 expect correct sliding average of volume', () => {
    // Arrange
    const bars = makeBars([10, 10, 10, 10], [100, 200, 300, 400])

    // Act
    const result = calcVolumeAvg(bars, 3)

    // Assert
    expect(result[2]).toBeCloseTo(200, 5)  // (100+200+300)/3
    expect(result[3]).toBeCloseTo(300, 5)  // (200+300+400)/3
  })
})
