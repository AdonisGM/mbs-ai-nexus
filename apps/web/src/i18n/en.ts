import type { Dict } from './vi'

/** Empty for now, and that is the point: the entry is judged in Vietnamese, so
 *  there is nothing to gain from translating it today.
 *
 *  What it costs to leave room is one file. Typing it as a partial of the
 *  Vietnamese dictionary means an editor lists every valid key while it is
 *  being filled in, and `t()` falls back per key — so English can be switched
 *  on half-finished without a single screen breaking. */
export const en: Partial<Dict> = {}
