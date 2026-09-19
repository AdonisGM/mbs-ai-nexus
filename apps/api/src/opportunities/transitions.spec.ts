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

describe('the approval chain cannot be skipped', () => {
  /** The failure this guards against: a salesperson confirms their own deal
   *  and immediately marks it won, so it lands in the branch's results having
   *  passed neither gate. The person with the most reason to skip the chain
   *  was the one able to. */
  it('does not let a salesperson record a win straight after their own confirmation', () => {
    expect(availableActions('sale', 'sale_confirmed')).not.toContain('complete')
    expect(availableActions('sale', 'lead_viewed')).not.toContain('complete')
  })

  it('lets a salesperson record a win once the deal has been backed', () => {
    expect(availableActions('sale', 'lead_approved')).toContain('complete')
    expect(availableActions('sale', 'bm_decided')).toContain('complete')
  })

  /** A team lead pressing it is itself the deal being engaged with, so they
   *  are not made to approve their own approval first. */
  it('lets a team lead record a win from anywhere they can see the deal', () => {
    for (const status of ['sale_confirmed', 'lead_viewed', 'lead_approved', 'bm_decided'] as const) {
      expect(availableActions('team_lead', status)).toContain('complete')
    }
  })

  /** Losing a deal is not the same shape. The customer went elsewhere; making
   *  that wait for an approval would leave the pipeline carrying deals
   *  everyone knows are dead. */
  it('still lets a deal be closed as lost at any point after confirmation', () => {
    expect(availableActions('sale', 'sale_confirmed')).toContain('close')
    expect(availableActions('sale', 'lead_returned')).toContain('close')
  })

  it('reaches every state from the start even with the narrower rule', () => {
    const seen = new Set<ApprovalStatus>(['sale_reviewing'])
    for (let pass = 0; pass < APPROVAL_STATUSES.length; pass++) {
      for (const transition of TRANSITIONS) {
        if (transition.from.some((from) => seen.has(from))) seen.add(transition.to)
      }
    }
    expect(seen).toContain('completed')
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
