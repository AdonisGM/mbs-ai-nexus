import { describe, expect, it } from 'vitest'
import { APPROVAL_STATUSES, type ApprovalStatus } from '../db/schema'
import {
  TERMINAL_STATUSES,
  TRANSITIONS,
  allows,
  availableActions,
  findTransition,
} from './transitions'

/** The table is pure data, so these tests are pure reasoning about it — no
 *  database. They are the cheapest place to catch a rule that contradicts
 *  itself, and they run in milliseconds. */

describe('the table as a whole', () => {
  it('names every action exactly once', () => {
    const names = TRANSITIONS.map((transition) => transition.action)
    expect(new Set(names).size).toBe(names.length)
  })

  it('only ever moves between the ten states from the brief', () => {
    for (const transition of TRANSITIONS) {
      expect(APPROVAL_STATUSES).toContain(transition.to)
      for (const from of transition.from) expect(APPROVAL_STATUSES).toContain(from)
    }
  })

  it('never lets a deal leave a terminal state', () => {
    for (const transition of TRANSITIONS) {
      for (const terminal of TERMINAL_STATUSES) {
        expect(transition.from).not.toContain(terminal)
      }
    }
  })

  it('never moves a deal to where it already is', () => {
    for (const transition of TRANSITIONS) {
      expect(transition.from).not.toContain(transition.to)
    }
  })

  /** A handover with nobody to hand to, or an in-place move that names
   *  someone, is rejected by the database. Catching it here means finding out
   *  while reading the table rather than mid-demo. */
  it('hands over exactly when it says it moved', () => {
    for (const transition of TRANSITIONS) {
      if (transition.direction === 'in_place') {
        expect(transition.handTo).toBe('none')
      } else {
        expect(transition.handTo).not.toBe('none')
      }
    }
  })

  /** Asking upward costs someone else their attention, so it is gated; handing
   *  work down is taking on responsibility and needs no permission. */
  it('sends every upward move to a tier above and every downward move to the owner', () => {
    for (const transition of TRANSITIONS) {
      if (transition.direction === 'up') expect(['lead', 'bm']).toContain(transition.handTo)
      if (transition.direction === 'down') expect(transition.handTo).toBe('owner')
    }
  })

  it('demands a reason for anything that costs someone else work', () => {
    for (const action of ['send_back', 'escalate', 'complete', 'close'] as const) {
      expect(findTransition(action)?.requiresReason).toBe(true)
    }
  })

  /** Every state other than the two terminal ones must have a way out, or a
   *  deal can get stranded where nobody can touch it. */
  it('leaves no state stranded', () => {
    const reachable = new Set<ApprovalStatus>()
    for (const transition of TRANSITIONS) {
      for (const from of transition.from) reachable.add(from)
    }

    for (const status of APPROVAL_STATUSES) {
      if (TERMINAL_STATUSES.includes(status)) continue
      expect(reachable, `${status} has no way out`).toContain(status)
    }
  })

  it('can reach every state from the starting one', () => {
    const seen = new Set<ApprovalStatus>(['sale_reviewing'])
    for (let pass = 0; pass < APPROVAL_STATUSES.length; pass++) {
      for (const transition of TRANSITIONS) {
        if (transition.from.some((from) => seen.has(from))) seen.add(transition.to)
      }
    }

    /** `ai_drafted` is only ever produced by the model, so nothing transitions
     *  into it — it is a starting state of its own. */
    for (const status of APPROVAL_STATUSES) {
      if (status === 'ai_drafted') continue
      expect(seen, `${status} is unreachable`).toContain(status)
    }
  })
})

describe('who may press what', () => {
  it('lets a salesperson confirm their own draft', () => {
    expect(availableActions('sale', 'sale_reviewing')).toContain('confirm')
  })

  it('does not let a salesperson approve or escalate their own work', () => {
    const actions = availableActions('sale', 'sale_confirmed')
    expect(actions).not.toContain('coach')
    expect(actions).not.toContain('escalate')
  })

  it('does not let a team lead confirm on a salesperson’s behalf', () => {
    expect(availableActions('team_lead', 'sale_reviewing')).toEqual([])
  })

  it('gives a team lead the four moves the brief lists', () => {
    expect(availableActions('team_lead', 'sale_confirmed').sort()).toEqual(
      ['close', 'coach', 'complete', 'escalate', 'send_back', 'view'].sort(),
    )
  })

  it('lets a branch manager decide only once it has been escalated', () => {
    expect(availableActions('bm', 'escalated_to_bm')).toContain('decide')
    expect(availableActions('bm', 'sale_confirmed')).not.toContain('decide')
  })

  it('offers nothing on a finished deal, to anyone', () => {
    for (const role of ['sale', 'team_lead', 'bm', 'admin'] as const) {
      expect(availableActions(role, 'completed')).toEqual([])
      expect(availableActions(role, 'closed_lost')).toEqual([])
    }
  })

  it('lets an admin do anything the state allows, so a demo can be unstuck', () => {
    expect(availableActions('admin', 'sale_reviewing')).toContain('confirm')
    expect(availableActions('admin', 'escalated_to_bm')).toContain('decide')
  })

  it('still refuses an admin a move the state itself forbids', () => {
    expect(allows(findTransition('decide')!, 'admin', 'sale_reviewing')).toBe(false)
  })
})

describe('the loop back', () => {
  /** Sending a deal back has to have a way home, or the salesperson is stuck
   *  holding something they cannot resubmit. */
  it('lets a returned deal be confirmed again', () => {
    expect(availableActions('sale', 'lead_returned')).toContain('confirm')
  })

  it('brings a returned deal back to the same state it left from', () => {
    expect(findTransition('confirm')?.to).toBe('sale_confirmed')
  })
})
