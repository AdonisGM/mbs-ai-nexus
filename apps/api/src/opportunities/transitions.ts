import type { ApprovalStatus, Direction, Role } from '../db/schema'

/** Every legal move a deal can make, in one table.
 *
 *  This file exists because the alternative — a status check written inline in
 *  each controller — is how a deal ends up escalated by someone who never
 *  confirmed it, or sent back from a state that has no way home. Eight rows
 *  that can be read end to end beat eight `if` statements nobody reads together.
 *
 *  Nobody ever picks a status. A person presses a button; the status is the
 *  consequence. That is why the table is keyed by action rather than by target
 *  state, and why `from` is a list: "Confirm" means the same thing whether the
 *  salesperson is finishing a draft or answering a request for more.
 *
 *  `handTo` decides who the deal lands on next, which drives both the unread
 *  badge and "today's priorities". It names a tier rather than "my manager",
 *  so the recipient is derived from the deal's own owner: an admin unsticking
 *  a demo hands it to the salesperson's team lead, not to their own. `direction` records which way it went — up
 *  is asking, down is assigning — and `none` covers the moves that hand the
 *  deal to nobody: an edit in place, and the two terminal states. */

export type ActionName =
  | 'confirm'
  | 'view'
  | 'send_back'
  | 'coach'
  | 'escalate'
  | 'decide'
  | 'complete'
  | 'close'

export type Transition = {
  action: ActionName
  from: readonly ApprovalStatus[]
  to: ApprovalStatus
  /** Roles allowed to press it. An admin passes every gate; see `allows`. */
  roles: readonly Role[]
  direction: Direction
  handTo: 'owner' | 'lead' | 'bm' | 'none'
  /** Anything that costs someone else work has to say why. */
  requiresReason?: boolean
  /** A narrower `from` for particular roles.
   *
   *  Exists for one rule, and it is a rule worth the extra field: a
   *  salesperson may record a win, but only once a team lead has backed the
   *  deal. Without it they can go from their own confirmation straight to
   *  "won" and the deal lands in the branch's results having passed neither
   *  gate — which is the entire approval chain quietly optional. */
  fromByRole?: Partial<Record<Role, readonly ApprovalStatus[]>>
}

export const TRANSITIONS: readonly Transition[] = [
  /** The first gate. Until this happens the deal is the salesperson's private
   *  draft and no manager can see it — the answer to "is every keystroke of
   *  mine being watched". */
  {
    action: 'confirm',
    from: ['ai_drafted', 'sale_reviewing', 'lead_returned'],
    to: 'sale_confirmed',
    roles: ['sale'],
    direction: 'up',
    handTo: 'lead',
  },

  /** Written the first time a team lead opens a confirmed deal. Nothing is
   *  handed over, so it records a look rather than a move — but it is one of
   *  the ten states the brief asks for, and it is what makes "time to notice"
   *  measurable. */
  {
    action: 'view',
    from: ['sale_confirmed'],
    to: 'lead_viewed',
    roles: ['team_lead'],
    direction: 'in_place',
    handTo: 'none',
  },

  {
    action: 'send_back',
    from: ['sale_confirmed', 'lead_viewed'],
    to: 'lead_returned',
    roles: ['team_lead'],
    direction: 'down',
    handTo: 'owner',
    /** A rejection with no reason just costs the salesperson another round. */
    requiresReason: true,
  },

  /** The team lead backs the approach and hands it back to be carried out.
   *  Down, not up: approving is assigning work, not asking for it. */
  {
    action: 'coach',
    from: ['sale_confirmed', 'lead_viewed'],
    to: 'lead_approved',
    roles: ['team_lead'],
    direction: 'down',
    handTo: 'owner',
  },

  /** The second gate. Only past here can a branch manager open the deal. */
  {
    action: 'escalate',
    from: ['sale_confirmed', 'lead_viewed', 'lead_approved'],
    to: 'escalated_to_bm',
    roles: ['team_lead'],
    direction: 'up',
    handTo: 'bm',
    requiresReason: true,
  },

  /** The move that closes the loop. A decision does not stop at a dashboard:
   *  it hands the salesperson something concrete to do next. */
  {
    action: 'decide',
    from: ['escalated_to_bm'],
    to: 'bm_decided',
    roles: ['bm'],
    direction: 'down',
    handTo: 'owner',
  },

  /** Recording a win.
   *
   *  A team lead may do it from anywhere they can see the deal — pressing it
   *  is itself them engaging with it. A salesperson may only do it after the
   *  deal has been backed, because otherwise the whole chain is skippable by
   *  the person with the most reason to skip it. */
  {
    action: 'complete',
    from: ['sale_confirmed', 'lead_viewed', 'lead_approved', 'bm_decided'],
    fromByRole: { sale: ['lead_approved', 'bm_decided'] },
    to: 'completed',
    roles: ['sale', 'team_lead'],
    direction: 'in_place',
    handTo: 'none',
    requiresReason: true,
  },

  /** Closing is for a deal that was real and did not come off, so it starts
   *  only once the salesperson has confirmed it at least once.
   *
   *  The private draft states are deliberately absent. A deal nobody but its
   *  author has seen was never in the pipeline; abandoning one is a discard,
   *  not a loss, and listing them here would let a team lead close a draft
   *  they are not even allowed to read. */
  {
    action: 'close',
    from: [
      'sale_confirmed',
      'lead_viewed',
      'lead_returned',
      'lead_approved',
      'escalated_to_bm',
      'bm_decided',
    ],
    to: 'closed_lost',
    roles: ['sale', 'team_lead', 'bm'],
    direction: 'in_place',
    handTo: 'none',
    requiresReason: true,
  },
]

export function findTransition(action: ActionName): Transition | undefined {
  return TRANSITIONS.find((transition) => transition.action === action)
}

/** Whether this person may press this button on a deal in this state.
 *
 *  An admin passes, because it is the technical account and someone has to be
 *  able to unstick a demo. The audit trail still records who did it. */
export function allows(transition: Transition, role: Role, from: ApprovalStatus): boolean {
  if (role === 'admin') return transition.from.includes(from)
  const allowedFrom = transition.fromByRole?.[role] ?? transition.from
  return transition.roles.includes(role) && allowedFrom.includes(from)
}

/** Which buttons to show on a deal. The screen renders this rather than
 *  deciding for itself, so a rule added here reaches every screen at once. */
export function availableActions(role: Role, from: ApprovalStatus): ActionName[] {
  return TRANSITIONS.filter((transition) => allows(transition, role, from)).map(
    (transition) => transition.action,
  )
}

/** The buttons to offer, with what each one needs.
 *
 *  Returned to the screen rather than letting it work this out, so the rule
 *  about which moves demand a reason lives in one place. A screen that guessed
 *  would eventually guess wrong and post something the server rejects — and
 *  the person on the other end would see a form clear itself for no reason
 *  they could see. */
export type OfferedAction = { action: ActionName; requiresReason: boolean }

export function actionsFor(role: Role, from: ApprovalStatus): OfferedAction[] {
  return TRANSITIONS.filter((transition) => allows(transition, role, from)).map(
    (transition) => ({
      action: transition.action,
      requiresReason: transition.requiresReason ?? false,
    }),
  )
}

/** States a deal can never leave. */
export const TERMINAL_STATUSES: readonly ApprovalStatus[] = ['completed', 'closed_lost']
