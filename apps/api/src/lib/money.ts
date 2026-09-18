import Big from 'big.js'

/** Every money calculation in the project goes through this module.
 *
 *  JavaScript numbers are binary, so 0.1 + 0.2 is not 0.3 and a figure that
 *  should land exactly halfway can come out just under it and round the wrong
 *  way. One đồng of drift is invisible on a single deal and obvious once the
 *  branch manager's forecast is compared against the sum of its parts — and
 *  that number is the one the whole pitch rests on. big.js works in decimal,
 *  so it cannot happen.
 *
 *  Amounts are whole đồng: stored as bigint in Postgres, carried as `number`
 *  in TypeScript. Rates are whole percents, 0 to 100. */
Big.RM = Big.roundHalfUp
Big.DP = 6

export type WeightedInput = {
  /** Deal size in đồng. */
  value: number
  /** Conversion probability, 0 to 100. */
  winProbability: number
}

/** Expected value of one opportunity: size × probability, to the đồng.
 *
 *  Rounded per deal rather than once at the end so that what the branch
 *  manager reads on a deal and what the dashboard totals agree exactly. A
 *  total that does not match its own rows is the fastest way to lose a judge's
 *  trust. */
export function weighted(row: WeightedInput): number {
  return Number(new Big(row.value).times(row.winProbability).div(100).round(0))
}

/** Forecast for a set of opportunities — Σ(value × probability).
 *
 *  Deliberately a formula rather than anything the model produces. When a
 *  judge asks where the number comes from, this line is the answer. */
export function forecast(rows: WeightedInput[]): number {
  return rows.reduce((total, row) => total + weighted(row), 0)
}

/** Total deal size, ignoring probability — the raw size of the pipeline. */
export function pipelineValue(rows: { value: number }[]): number {
  return rows.reduce((total, row) => total + row.value, 0)
}

/** What is still missing against a target. Never negative: once the target is
 *  met the gap is closed, and a negative gap on screen reads as a bug. Use
 *  `surplus` for the amount over. */
export function gap(target: number, achieved: number, forecasted = 0): number {
  return Math.max(0, target - achieved - forecasted)
}

export function surplus(target: number, achieved: number, forecasted = 0): number {
  return Math.max(0, achieved + forecasted - target)
}

/** Progress as a whole percent, for bars and headline figures. Returns 0 when
 *  no target is set, rather than dividing by zero and rendering NaN. */
export function percentOf(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Number(new Big(part).times(100).div(whole).round(0))
}
