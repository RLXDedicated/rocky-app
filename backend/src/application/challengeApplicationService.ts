// Weekly team challenges: an admin sets a goal for one leader's team (or the
// whole pilot) — a check-in rate or a QA pass rate over a date window — and
// a reward. Everyone in it sees the live progress on their home screen.
// When the window closes the challenge settles once: if the team reached
// the goal, every member gets the reward (an item and/or coins).
import { ApiError } from '../api/errors'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import type { ChallengeRecord } from '../infrastructure/accounts/AccountStore'
import { systemClock, todayKey, type Clock } from '../domain/rockyEngine'
import { WORKING_DAYS } from '../../../src/engine/dateUtils'
import { findItem } from '../../../src/game/closet'
import { publicName } from './leaderboardApplicationService'
import type { PetApplicationService } from './petApplicationService'

const DAY = /^\d{4}-\d{2}-\d{2}$/
const SYSTEM = { id: 'rocky-challenges', via: 'challenge' }

export interface ChallengeInput {
  title: string
  leaderId: string | null
  metric: 'checkins' | 'qa'
  target: number
  startDay: string
  endDay: string
  rewardItem: string | null
  rewardCoins: number
}

/** Working days from `from` to `to`, inclusive. */
function workingDays(from: string, to: string): string[] {
  const out: string[] = []
  const d = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  while (d <= end) {
    if (WORKING_DAYS.includes(d.getDay())) out.push(todayKey(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

export function createChallengeApplicationService({ persistence, pet, clock = systemClock }: { persistence: PersistenceContext; pet: PetApplicationService; clock?: Clock }) {
  const accounts = persistence.accounts
  const repo = persistence.repoStore

  function members(c: ChallengeRecord): string[] {
    if (!c.leaderId) return repo.listAgentIds()
    return Object.entries(accounts.getTeams())
      .filter(([m, l]) => l === c.leaderId && repo.hasAgent(m))
      .map(([m]) => m)
  }

  /** 0–100 so far (only days that have started count). */
  function score(c: ChallengeRecord, today: string): { score: number; members: number; days: number } {
    const who = members(c)
    const last = today < c.endDay ? today : c.endDay
    const days = last < c.startDay ? [] : workingDays(c.startDay, last)
    if (who.length === 0) return { score: 0, members: 0, days: days.length }
    if (c.metric === 'checkins') {
      if (days.length === 0) return { score: 0, members: who.length, days: 0 }
      const inWindow = new Set(days)
      let hits = 0
      for (const id of who) {
        const checked = new Set(
          repo
            .forAgent(id)
            .getEvents()
            .filter((e) => e.type === 'CHECK_IN' && inWindow.has(e.date))
            .map((e) => e.date),
        )
        hits += checked.size
      }
      return { score: Math.round((100 * hits) / (who.length * days.length)), members: who.length, days: days.length }
    }
    let pass = 0
    let alert = 0
    for (const id of who)
      for (const e of repo.forAgent(id).getEvents()) {
        if (e.date < c.startDay || e.date > last) continue
        if (e.type === 'QA_PASS') pass++
        else if (e.type === 'DOCUMENTATION_ALERT') alert++
      }
    return { score: pass + alert ? Math.round((100 * pass) / (pass + alert)) : 0, members: who.length, days: days.length }
  }

  function view(c: ChallengeRecord, today: string) {
    const s = c.settledAt ? { score: c.finalScore ?? 0, members: members(c).length, days: 0 } : score(c, today)
    const item = c.rewardItem ? findItem(c.rewardItem) : null
    return {
      id: c.id,
      title: c.title,
      team: c.leaderId ? publicName(c.leaderId, safeName(c.leaderId)) : null,
      leaderId: c.leaderId,
      metric: c.metric,
      target: c.target,
      startDay: c.startDay,
      endDay: c.endDay,
      reward: { item: item ? { id: item.id, name: item.name, slot: item.slot } : null, coins: c.rewardCoins },
      score: s.score,
      members: s.members,
      status: c.result ?? (today < c.startDay ? 'upcoming' : 'active'),
      settledAt: c.settledAt,
    }
  }

  function safeName(id: string): string {
    try {
      return repo.forAgent(id).getAgent().name
    } catch {
      return ''
    }
  }

  return {
    /** Closes every challenge whose window has ended and pays the winners (once). */
    settle(): number {
      const today = todayKey(clock.now())
      let settled = 0
      for (const c of accounts.listChallenges()) {
        if (c.settledAt || c.endDay >= today) continue
        const { score: final } = score(c, today)
        const won = final >= c.target
        const at = clock.now().toISOString()
        persistence.withTransaction(() => accounts.settleChallenge(c.id, won ? 'won' : 'missed', final, at))
        settled++
        if (!won) continue
        for (const id of members(c)) {
          try {
            // A reward item retired since the challenge was set is skipped; the coins still arrive.
            if (c.rewardItem && findItem(c.rewardItem)) pet.grantItem(id, c.rewardItem, SYSTEM)
            if (c.rewardCoins > 0) pet.adjustCoins(id, c.rewardCoins, `Challenge won: ${c.title}`, SYSTEM)
            pet.sendGiftNote(id, `Challenge won — “${c.title}” (${final}%)! 🏆 Your reward is in Rocky’s closet.`, SYSTEM)
          } catch {
            // One agent's hiccup never blocks the others' rewards.
          }
        }
      }
      return settled
    },

    /** The challenges that include this agent (active and upcoming, plus the last week's results). */
    mine(agentId: string) {
      this.settle()
      const today = todayKey(clock.now())
      const leader = accounts.getTeams()[agentId] ?? null
      return accounts
        .listChallenges()
        .filter((c) => c.result !== 'cancelled' && (c.leaderId === null || c.leaderId === leader || c.leaderId === agentId))
        .filter((c) => !c.settledAt || c.endDay >= todayKey(new Date(clock.now().getTime() - 7 * 86_400_000)))
        .map((c) => view(c, today))
    },

    adminList() {
      this.settle()
      const today = todayKey(clock.now())
      return accounts.listChallenges().map((c) => view(c, today))
    },

    create(input: ChallengeInput, actorId: string) {
      const title = input.title.trim().slice(0, 80)
      if (!title) throw ApiError.validation('Give the challenge a title.')
      if (!DAY.test(input.startDay) || !DAY.test(input.endDay) || input.startDay > input.endDay)
        throw ApiError.validation('Pick a start day on or before the end day.')
      if (!Number.isInteger(input.target) || input.target < 1 || input.target > 100) throw ApiError.validation('The goal is a percent from 1 to 100.')
      if (input.leaderId && accounts.getTitles()[input.leaderId] !== 'leader') throw ApiError.validation('That person is not a team leader.')
      if (input.rewardItem) {
        const item = findItem(input.rewardItem)
        if (!item || item.staff) throw ApiError.validation('Pick a reward item from the shop.')
      }
      if (!Number.isInteger(input.rewardCoins) || input.rewardCoins < 0 || input.rewardCoins > 5000) throw ApiError.validation('Coins must be 0–5000.')
      if (!input.rewardItem && input.rewardCoins === 0) throw ApiError.validation('Add a reward: an item, coins or both.')
      const c = accounts.addChallenge({ ...input, title, createdBy: actorId, createdAt: clock.now().toISOString() })
      accounts.addAudit({ agentId: null, actor: actorId, action: 'admin.challenge.create', detail: { id: c.id, ...input }, source: null, createdAt: clock.now().toISOString() })
      return view(c, todayKey(clock.now()))
    },

    cancel(id: number, actorId: string) {
      const c = accounts.listChallenges().find((x) => x.id === id)
      if (!c) throw ApiError.notFound('That challenge could not be found.')
      accounts.settleChallenge(id, 'cancelled', null, clock.now().toISOString())
      accounts.addAudit({ agentId: null, actor: actorId, action: 'admin.challenge.cancel', detail: { id }, source: null, createdAt: clock.now().toISOString() })
      return { ok: true }
    },
  }
}

export type ChallengeApplicationService = ReturnType<typeof createChallengeApplicationService>
