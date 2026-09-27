# Data Model — Rocky Local MVP

All shapes below live in `src/types/`. Every Repository implementation
(today: `LocalStorageRepository`) reads and writes exactly these shapes —
that's the contract a future `SharePointRepository`/`ApiRepository` would
need to honor (see ARCHITECTURE.md).

## Agent (`types/domain.ts`)

```ts
interface Agent {
  id: string
  name: string
  rockyName: string // chosen at onboarding; single source of truth for display
}
```

One per browser/session in this local prototype (`DEFAULT_AGENT_ID =
'local-agent'`). A future multi-agent backend would key every other
collection below by a real `agentId` instead of always assuming the local
one — the shapes already carry `agentId`, so this is mostly a Repository
concern, not an Engine one.

## GameState (`types/domain.ts`)

The current, derived snapshot of an agent's progress:

```ts
interface GameState {
  xp: number
  level: number
  energy: number            // 0-100
  mood: Mood                // 'Happy' | 'Motivated' | 'Worried' | 'Recovery'
  evolutionStage: EvolutionStage // 'Baby' | 'Young' | 'Advanced' | 'Elite'
  currentStreak: number
  bestStreak: number
  lastCheckInDate: string | null   // YYYY-MM-DD
  lastAlertAt: string | null       // ISO timestamp
  lastPositiveActionAt: string | null // ISO timestamp (Check-in or QA Pass)
  lastActivityLabel: string | null
  lastActivityAt: string | null
}
```

This is a *cache* of what the event log already implies — per Rule 7, if it
and the event history ever disagree, the event history wins
(`recalculateStateFromEvents` rebuilds it from scratch).

## GameEvent (`types/domain.ts`)

The immutable source of truth for progression:

```ts
type EventType =
  | 'CHECK_IN' | 'QA_PASS' | 'DOCUMENTATION_ALERT'
  | 'STREAK_MILESTONE' | 'LEVEL_UP' | 'EVOLUTION'
  | 'ACHIEVEMENT' | 'CORRECTION'

interface GameEvent {
  id: string           // stable, unique — the idempotency/dedupe key
  type: EventType
  agentId: string
  date: string          // YYYY-MM-DD, local day the event belongs to
  timestamp: string      // ISO — used to order replay
  payload?: Record<string, unknown>
  correctsEventId?: string // present only on CORRECTION events
}
```

Never mutated after creation. A correction is a new event with
`type: 'CORRECTION'` and `correctsEventId` pointing at the original — never
an edit of that original.

## Achievement (`types/domain.ts`)

```ts
interface Achievement {
  id: string           // matches an ACHIEVEMENT_CATALOG entry's id
  name: string
  description: string
  unlockedAt: string    // ISO timestamp
}
```

Denormalized alongside the `ACHIEVEMENT` events for cheap "what has this
agent unlocked" reads (`Repository.getAchievements()`); the event log
remains the authoritative record.

## ReminderRecord (`types/reminder.ts`)

```ts
type ReminderCategory = 'Documentation' | 'Streak' | 'Progress' | 'Celebration' | 'Recovery'
type ReminderStatus = 'sent' | 'opened' | 'dismissed' | 'acted'

interface ReminderRecord {
  id: string
  category: ReminderCategory
  message: string
  timestamp: string
  status: ReminderStatus
  actionable: boolean
  dedupeKey?: string     // the underlying GameEvent id, for Celebration reminders
}
```

`WorkingHoursSettings` (also in `types/reminder.ts`) is the one piece of
this model a future settings screen would let an admin edit directly.

## Team / Leaderboard-related data

These are **not** persisted per-agent Repository collections — they're
computed live from `GameState`/events (via `teamService.ts` /
`leaderboardService.ts`) plus a fixed mock roster (`mockAgents.ts`) for this
prototype's fictitious teammates. `types/team.ts` and `types/leaderboard.ts`
define the computed shapes (`TeamSummary`, `TeamRankEntry`,
`LeaderboardEntry`, etc.) — there is no "Team GameState" or "Team XP"
paralleling the individual economy (see DOMAIN_RULES.md — Team Score is
explicitly a separate, normalized metric, never a sum of individual XP).

A few small UI-facing signals (last-seen leaderboard rank, a team's
Evolution high-water-mark, a team's last score, last team rank) are
persisted outside the `Repository` interface, directly under dedicated
`localStorage` keys (e.g. `rocky.leaderboard.lastRank`,
`rocky.teams.highestStage`). They exist purely so Rocky can react to "you
moved up" / show Recovery after a dip, and are explicitly documented as
non-economy bookkeeping in `leaderboardService.ts` / `teamService.ts` —
never mistake them for a second source of truth for XP/Energy/Streak.

## Repository boundaries (`repository/repository.ts`)

```ts
interface Repository {
  getAgent(): Agent
  saveAgent(agent: Agent): void
  getGameState(): GameState
  saveGameState(state: GameState): void
  getEvents(): GameEvent[]
  saveEvent(event: GameEvent): void          // idempotent by id
  getAchievements(): Achievement[]
  saveAchievement(achievement: Achievement): void // idempotent by id
  getReminders(): ReminderRecord[]
  saveReminder(reminder: ReminderRecord): void    // idempotent by id
  updateReminderStatus(id: string, status: ReminderStatus): void
  resetReminders(): void
  resetAll(): void
}
```

`LocalStorageRepository` is the only implementation **in this frontend**
today. Its reads run every value through `repository/sanitize.ts` before
returning it — a corrupted or partially-invalid stored value never
crashes the app or propagates bad data into the Engine; it's repaired
field-by-field or, where that's not possible, replaced with a clean
default. A `rocky.schemaVersion` key is written on every save for a
future migration to key off.

## Backend persistence model (Phase 12-13)

The backend (`backend/`, not part of this frontend) implements this same
`Repository` interface twice more — `InMemoryRepositoryStore` (Phase 12,
dev/test, lost on restart) and `SqliteRepositoryStore` (Phase 13, durable,
survives a process restart). Full schema and rationale:
`docs/PERSISTENCE_FOUNDATION.md`. The shapes above are unchanged by
either — both backend implementations read/write exactly these same
`Agent`/`GameState`/`GameEvent`/`Achievement`/`ReminderRecord` structures,
just against a `Map` or a SQLite file instead of `localStorage`.

**Authoritative vs. derived, restated for persistence** (see
`docs/DATA_OWNERSHIP.md` for the full matrix): `events` is the one
durable source of truth in every implementation; `GameState` — including
its `mood` field — is always a cache of what replaying `events` implies,
written by whatever the Game Engine computed, never computed by any
Repository implementation itself. Achievements are denormalized for cheap
reads but remain reproducible from `ACHIEVEMENT` events. Reminder
`status` is the one piece of data that is NOT event-sourced — it's a
direct lifecycle action recorded as-is.

**Event persistence**: every implementation dedupes `saveEvent`/
`saveAchievement`/`saveReminder` by id (silent no-op on an identical
resubmission). The SQLite implementation additionally throws a
`RepositoryConflictError` if the same id arrives with *different*
content — never silently overwriting an immutable record — and the same
guard was added to `InMemoryRepositoryStore` so switching drivers can't
silently change this behavior.

**Idempotency persistence**: a separate, HTTP-level concern from the
Repository's own id-based dedup — see `docs/PERSISTENCE_FOUNDATION.md` §5.
The backend's `IdempotencyPort` (in-memory or SQLite-backed) records which
`(agentId, route, Idempotency-Key)` combinations have already been
processed, so a retried QA Pass/Alert/Correction request — even after a
restart, for the SQLite implementation — replays the same response instead
of re-invoking the Game Engine, and a key reused with a different request
body is rejected rather than silently accepted.
