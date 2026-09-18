import { describe, expect, it } from 'vitest'
import { forecast, gap, percentOf, pipelineValue, surplus, weighted } from './money'

describe('weighted', () => {
  it('multiplies a deal by its probability', () => {
    expect(weighted({ value: 2_000_000_000, winProbability: 70 })).toBe(1_400_000_000)
  })

  it('rounds half up, the way it is done on paper', () => {
    expect(weighted({ value: 1_000_000_005, winProbability: 50 })).toBe(500_000_003)
  })

  it('keeps the ends exact', () => {
    expect(weighted({ value: 123_456_789, winProbability: 0 })).toBe(0)
    expect(weighted({ value: 123_456_789, winProbability: 100 })).toBe(123_456_789)
  })
})

describe('forecast', () => {
  /** The reason this module exists: in plain floating point the same sum
   *  drifts off the total of its own rows, and the dashboard stops agreeing
   *  with the list underneath it. */
  it('matches the sum of its rows exactly', () => {
    const rows = [
      { value: 333_333_333, winProbability: 35 },
      { value: 777_777_777, winProbability: 85 },
      { value: 1_010_101_010, winProbability: 15 },
    ]
    expect(forecast(rows)).toBe(rows.reduce((total, row) => total + weighted(row), 0))
  })

  it('is zero for an empty pipeline', () => {
    expect(forecast([])).toBe(0)
  })
})

describe('gap and surplus', () => {
  it('reports what is still missing', () => {
    expect(gap(10_000_000_000, 3_000_000_000, 4_000_000_000)).toBe(3_000_000_000)
  })

  it('never goes negative once the target is met', () => {
    expect(gap(10_000_000_000, 12_000_000_000)).toBe(0)
    expect(surplus(10_000_000_000, 12_000_000_000)).toBe(2_000_000_000)
  })
})

describe('percentOf', () => {
  it('returns a whole percent', () => {
    expect(percentOf(7_600_000_000, 10_000_000_000)).toBe(76)
  })

  it('returns zero instead of NaN when no target is set', () => {
    expect(percentOf(5_000_000, 0)).toBe(0)
  })
})

describe('pipelineValue', () => {
  it('ignores probability', () => {
    expect(pipelineValue([{ value: 2_000_000_000 }, { value: 500_000_000 }])).toBe(2_500_000_000)
  })
})
