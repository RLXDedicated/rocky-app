// Engagement on top of the Arcade and Friends:
//   - Champion badges: last week's #1 in each Arcade game wears a 🏆 next to
//     their name and on their Rocky until someone else takes it; the most
//     voted "Rocky of the week" wears a 👑 the same way.
//   - Monthly Arcade tournament: points from every game's best of the month;
//     the top 3 get an exclusive cup and coins.
//   - Duels: challenge a friend to beat your score in a game within 48 h.
//   - Rocky of the week: everyone votes for the best-dressed Rocky.
import { ApiError } from '../api/errors'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import type { DuelRecord } from '../infrastructure/accounts/AccountStore'
import { systemClock, type Clock } from '../domain/rockyEngine'
import { ARCADE_GAMES, ARCADE_MAX_SCORE, type ArcadeGame } from '../../../src/game/pantry'
import { arcadeWeekOf, normalizePetState } from '../../../src/game/pet'
import { monthOf } from '../../../src/game/engagement'
import { publicName } from './leaderboardApplicationService'
import { friendKey, type PetApplicationService } from './petApplicationService'
import type { LiveBus } from './liveBus'

export interface Honors {
  /** Arcade games this agent was #1 in last week. */
  arcade: string[]
  /** Rocky of the week (last week's most voted). */
  rotw: boolean
}

const DUEL_HOURS = 48
const DUELS_PER_DAY = 3
const DUEL_PRIZE = { win: 15, tie: 5 }
const ROTW_PRIZE = 60
export const CUPS = ['decor-cup-gold', 'decor-cup-silver', 'decor-cup-bronze'] as const
const CUP_COINS = [150, 100, 60]
const SYSTEM = { id: 'rocky-arcade', via: 'arcade' }

export const GAME_NAMES: Record<ArcadeGame, string> = {
  catch: 'Treat Catch',
  typo: 'Typo Hunt',
  memory: 'Memory Match',
  run: 'Rocky Run',
  whack: 'Mud Splat',
  bubbles: 'Bubble Pop',
  simon: 'Rocky Says',
  stack: 'Box Stack',
  sort: 'Package Sort',
  slide: 'Slide Puzzle',
  hoop: 'Hoop Shot',
  crush: 'Rocky Crush',
}

export function createEngagementApplicationService({
  persistence,
  pet,
  bus,
  clock = systemClock,
}: {
  persistence: PersistenceContext
  pet: PetApplicationService
  bus: LiveBus
  clock?: Clock
}) {
  const accounts = persistence.accounts
  const repo = persistence.repoStore
  const nameOf = (id: string) => {
    try {
      return publicName(id, repo.forAgent(id).getAgent().name)
    } catch {
      return publicName(id, '')
    }
  }
  const directory = () => new Map(repo.listAgentIds().map((id) => [friendKey(id), id]))
  const lastWeek = () => arcadeWeekOf(new Date(clock.now().getTime() - 7 * 86_400_000))

  // ------------------------------------------------------------ honors
  let cache: { key: string; at: number; map: Map<string, Honors> } | null = null
  function honorsMap(): Map<string, Honors> {
    const now = clock.now().getTime()
    const key = lastWeek()
    if (cache && cache.key === key && now - cache.at < 10 * 60_000) return cache.map
    const map = new Map<string, Honors>()
    const get = (id: string) => map.get(id) ?? (map.set(id, { arcade: [], rotw: false }), map.get(id)!)
    const byKey = directory()
    const board = pet.arcadeBoard('', true).games as Record<string, { top: { id: string }[] }>
    for (const [game, { top }] of Object.entries(board)) {
      const champ = top[0] ? byKey.get(top[0].id) : undefined
      if (champ) get(champ).arcade.push(GAME_NAMES[game as ArcadeGame] ?? game)
    }
    const rotw = rotwWinner(key)
    if (rotw) get(rotw.id).rotw = true
    cache = { key, at: now, map }
    return map
  }
  const refreshHonors = () => (cache = null)

  // ------------------------------------------------------------ tournament
  function tournament(viewerId: string, previous = false) {
    const now = clock.now()
    const month = monthOf(previous ? new Date(now.getFullYear(), now.getMonth() - 1, 15) : now)
    const rows = repo
      .listAgentIds()
      .map((id) => {
        const record = accounts.getPetProfile(id)
        const best = record ? (normalizePetState(record.state, now).games.arcadeMonths?.[month] ?? {}) : {}
        let points = 0
        let games = 0
        for (const g of ARCADE_GAMES) {
          const s = best[g] ?? 0
          if (s <= 0) continue
          games++
          points += Math.round((100 * Math.min(s, ARCADE_MAX_SCORE[g])) / ARCADE_MAX_SCORE[g])
        }
        return { id, points, games }
      })
      .filter((r) => r.points > 0)
      .sort((a, b) => b.points - a.points || b.games - a.games)
    const view = (r: (typeof rows)[number], i: number) => ({ rank: i + 1, id: friendKey(r.id), name: nameOf(r.id), points: r.points, games: r.games, me: r.id === viewerId })
    const mine = rows.findIndex((r) => r.id === viewerId)
    return {
      month,
      top: rows.slice(0, 10).map(view),
      me: mine >= 0 ? view(rows[mine]!, mine) : null,
      players: rows.length,
      prizes: CUP_COINS.map((coins, i) => ({ rank: i + 1, coins, item: CUPS[i] })),
    }
  }

  /** Early each month: last month's top 3 get their cup and coins (once). */
  function awardTournament(): number {
    const now = clock.now()
    const t = tournament('', true)
    const marker = `arcade-month-award:${t.month}`
    if (accounts.getCatalogOverrides()[marker]) return 0
    const byKey = directory()
    let n = 0
    t.top.slice(0, 3).forEach((row, i) => {
      const id = byKey.get(row.id)
      if (!id) return
      try {
        pet.grantItem(id, CUPS[i]!, SYSTEM)
        pet.adjustCoins(id, CUP_COINS[i]!, `Arcade tournament #${i + 1} (${t.month})`, SYSTEM)
        pet.sendGiftNote(id, `You finished #${i + 1} in the ${t.month} Arcade tournament! 🏆 A cup for Rocky’s home and ${CUP_COINS[i]} coins.`, SYSTEM)
        n++
      } catch {
        // keep going
      }
    })
    accounts.setCatalogOverride(marker, { price: null, enabled: true }, SYSTEM.id, now.toISOString())
    return n
  }

  // ------------------------------------------------------------ duels
  function expire(d: DuelRecord): DuelRecord {
    if (d.status === 'open' && clock.now().getTime() - Date.parse(d.createdAt) > DUEL_HOURS * 3_600_000) {
      accounts.updateDuel(d.id, { status: 'expired' })
      return { ...d, status: 'expired' }
    }
    return d
  }

  function duelView(d: DuelRecord, viewerId: string) {
    const mineSent = d.fromId === viewerId
    const result =
      d.status === 'open' || d.status === 'expired'
        ? d.status
        : d.status === 'tied'
          ? 'tied'
          : (d.status === 'won') === mineSent
            ? 'won'
            : 'lost'
    return {
      id: d.id,
      game: d.game,
      gameName: GAME_NAMES[d.game as ArcadeGame] ?? d.game,
      sent: mineSent,
      with: nameOf(mineSent ? d.toId : d.fromId),
      withKey: friendKey(mineSent ? d.toId : d.fromId),
      myScore: mineSent ? d.fromScore : d.toScore,
      theirScore: mineSent ? d.toScore : d.fromScore,
      result,
      createdAt: d.createdAt,
      expiresAt: new Date(Date.parse(d.createdAt) + DUEL_HOURS * 3_600_000).toISOString(),
    }
  }

  return {
    honorsOf(agentId: string): Honors | undefined {
      const h = honorsMap().get(agentId)
      return h && (h.arcade.length || h.rotw) ? h : undefined
    },
    refreshHonors,

    tournament,
    awardTournament,

    /** Runs from the hourly jobs. */
    awardAll() {
      const t = awardTournament()
      const r = awardRotw()
      if (t || r) refreshHonors()
      return { tournament: t, rotw: r }
    },

    duels(agentId: string) {
      const all = accounts.listDuels({ agentId, since: new Date(clock.now().getTime() - 7 * 86_400_000).toISOString(), limit: 60 }).map(expire)
      return {
        incoming: all.filter((d) => d.toId === agentId && d.status === 'open').map((d) => duelView(d, agentId)),
        outgoing: all.filter((d) => d.fromId === agentId && d.status === 'open').map((d) => duelView(d, agentId)),
        recent: all.filter((d) => d.status !== 'open').slice(0, 10).map((d) => duelView(d, agentId)),
        left: Math.max(0, DUELS_PER_DAY - all.filter((d) => d.fromId === agentId && Date.parse(d.createdAt) > clock.now().getTime() - 86_400_000).length),
      }
    },

    challenge(fromId: string, input: { to: unknown; game: unknown; score: unknown }) {
      const toId = typeof input.to === 'string' ? directory().get(input.to) : undefined
      if (!toId || toId === fromId) throw ApiError.notFound('That teammate could not be found.')
      const game = (ARCADE_GAMES as readonly string[]).includes(input.game as string) ? (input.game as ArcadeGame) : null
      if (!game) throw ApiError.validation('Pick an Arcade game.')
      const score = typeof input.score === 'number' && Number.isFinite(input.score) ? Math.max(0, Math.min(ARCADE_MAX_SCORE[game], Math.floor(input.score))) : -1
      if (score <= 0) throw ApiError.validation('Play a round first, then challenge with your score.')
      const now = clock.now()
      const mine = accounts.listDuels({ agentId: fromId, since: new Date(now.getTime() - DUEL_HOURS * 3_600_000).toISOString() }).map(expire)
      if (mine.filter((d) => d.fromId === fromId && Date.parse(d.createdAt) > now.getTime() - 86_400_000).length >= DUELS_PER_DAY)
        throw ApiError.validation(`You can send ${DUELS_PER_DAY} duels a day — try again tomorrow.`)
      if (mine.some((d) => d.status === 'open' && d.game === game && ((d.fromId === fromId && d.toId === toId) || (d.fromId === toId && d.toId === fromId))))
        throw ApiError.validation('You already have an open duel with this teammate in this game.')
      const d = accounts.addDuel({ fromId, toId, game, fromScore: score, createdAt: now.toISOString() })
      bus.publish([toId], { t: 'duel', duel: duelView(d, toId) })
      return duelView(d, fromId)
    },

    answer(agentId: string, id: number, scoreIn: unknown) {
      const found = accounts.getDuel(id)
      const d = found ? expire(found) : null
      if (!d || d.toId !== agentId) throw ApiError.notFound('That duel could not be found.')
      if (d.status !== 'open') throw ApiError.validation(d.status === 'expired' ? 'That duel expired.' : 'That duel is already decided.')
      const game = d.game as ArcadeGame
      const score = typeof scoreIn === 'number' && Number.isFinite(scoreIn) ? Math.max(0, Math.min(ARCADE_MAX_SCORE[game], Math.floor(scoreIn))) : 0
      const status: DuelRecord['status'] = score > d.fromScore ? 'lost' : score < d.fromScore ? 'won' : 'tied'
      accounts.updateDuel(d.id, { status, toScore: score, answeredAt: clock.now().toISOString() })
      const actor = { id: 'rocky-duels', via: 'duel' }
      const gameName = GAME_NAMES[game] ?? game
      const pay = (who: string, coins: number, text: string) => {
        try {
          if (coins) pet.adjustCoins(who, coins, `Duel: ${gameName}`, actor)
          pet.sendGiftNote(who, text, actor)
        } catch {
          // no Rocky yet
        }
      }
      if (status === 'tied') {
        pay(d.fromId, DUEL_PRIZE.tie, `Your ${gameName} duel with ${nameOf(d.toId)} was a tie (${score})! +${DUEL_PRIZE.tie} coins.`)
        pay(d.toId, DUEL_PRIZE.tie, `Your ${gameName} duel with ${nameOf(d.fromId)} was a tie (${score})! +${DUEL_PRIZE.tie} coins.`)
      } else {
        const [winner, loser] = status === 'won' ? [d.fromId, d.toId] : [d.toId, d.fromId]
        pay(winner, DUEL_PRIZE.win, `You won the ${gameName} duel against ${nameOf(loser)} (${Math.max(score, d.fromScore)} vs ${Math.min(score, d.fromScore)})! ⚔️ +${DUEL_PRIZE.win} coins.`)
        pay(loser, 0, `${nameOf(winner)} won your ${gameName} duel (${Math.max(score, d.fromScore)} vs ${Math.min(score, d.fromScore)}). Rematch? ⚔️`)
      }
      const done = accounts.getDuel(d.id)!
      bus.publish([d.fromId], { t: 'duel', duel: duelView(done, d.fromId) })
      return duelView(done, agentId)
    },

    // ------------------------------------------------------------ Rocky of the week
    rotw(viewerId: string) {
      const week = arcadeWeekOf(clock.now())
      const votes = accounts.listVotes(week)
      const tally = new Map<string, number>()
      for (const v of votes) tally.set(v.targetId, (tally.get(v.targetId) ?? 0) + 1)
      const top = [...tally]
        .sort((a, b) => b[1] - a[1] || nameOf(a[0]).localeCompare(nameOf(b[0])))
        .slice(0, 5)
        .map(([id, n], i) => ({ rank: i + 1, ...profile(id), votes: n }))
      const mine = votes.find((v) => v.voterId === viewerId)
      const last = rotwWinner(lastWeek())
      return {
        week,
        top,
        voters: votes.length,
        myVote: mine ? friendKey(mine.targetId) : null,
        lastWinner: last ? { ...profile(last.id), votes: last.votes } : null,
        prize: ROTW_PRIZE,
      }
    },

    vote(voterId: string, toKey: unknown) {
      const toId = typeof toKey === 'string' ? directory().get(toKey) : undefined
      if (!toId) throw ApiError.notFound('That teammate could not be found.')
      if (toId === voterId) throw ApiError.validation('Vote for a teammate’s Rocky — not your own. 😉')
      accounts.setVote(arcadeWeekOf(clock.now()), voterId, toId, clock.now().toISOString())
      return this.rotw(voterId)
    },
  }

  function profile(id: string) {
    try {
      const p = pet.publicProfile(id)
      return { id: p.id, name: p.name, rockyName: p.rockyName, stage: p.stage, mood: p.mood, outfit: p.outfit }
    } catch {
      return { id: friendKey(id), name: nameOf(id), rockyName: 'Rocky', stage: 'Baby' as const, mood: 'Happy' as const, outfit: null }
    }
  }

  function rotwWinner(week: string): { id: string; votes: number } | null {
    const tally = new Map<string, number>()
    for (const v of accounts.listVotes(week)) tally.set(v.targetId, (tally.get(v.targetId) ?? 0) + 1)
    const best = [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
    return best ? { id: best[0], votes: best[1] } : null
  }

  /** Once a week: last week's Rocky of the week gets coins and a note (the 👑 badge comes from honorsOf). */
  function awardRotw(): number {
    const week = lastWeek()
    const marker = `rotw-award:${week}`
    if (accounts.getCatalogOverrides()[marker]) return 0
    const w = rotwWinner(week)
    accounts.setCatalogOverride(marker, { price: null, enabled: true }, SYSTEM.id, clock.now().toISOString())
    if (!w) return 0
    try {
      pet.adjustCoins(w.id, ROTW_PRIZE, `Rocky of the week (${week})`, SYSTEM)
      pet.sendGiftNote(w.id, `Your Rocky was voted Rocky of the week (${w.votes} votes)! 👑 +${ROTW_PRIZE} coins and the crown badge all week.`, SYSTEM)
      return 1
    } catch {
      return 0
    }
  }
}

export type EngagementApplicationService = ReturnType<typeof createEngagementApplicationService>
