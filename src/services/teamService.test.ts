import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageRepository } from '../repository/localStorageRepository'
import { GameService } from './gameService'
import { MOCK_AGENTS, TEAM_ALPHA_ID, TEAM_BRAVO_ID, TEAM_CHARLIE_ID } from './mockAgents'
import { CURRENT_USER_TEAM_ID, getTeamDetail, getTeamLeaderboard, getTeamSummaries } from './teamService'

describe('Team assignment', () => {
  it('assigns every mock agent to a team', () => {
    for (const agent of MOCK_AGENTS) {
      expect(agent.teamId).toBeDefined()
    }
  })

  it('the current user belongs to Team Alpha, alongside Alex', () => {
    expect(CURRENT_USER_TEAM_ID).toBe(TEAM_ALPHA_ID)
    const alex = MOCK_AGENTS.find((a) => a.agentId === 'mock-alex')
    expect(alex?.teamId).toBe(TEAM_ALPHA_ID)
  })

  it('Maria and James are on Team Bravo, Sarah is alone on Team Charlie', () => {
    expect(MOCK_AGENTS.find((a) => a.agentId === 'mock-maria')?.teamId).toBe(TEAM_BRAVO_ID)
    expect(MOCK_AGENTS.find((a) => a.agentId === 'mock-james')?.teamId).toBe(TEAM_BRAVO_ID)
    expect(MOCK_AGENTS.find((a) => a.agentId === 'mock-sarah')?.teamId).toBe(TEAM_CHARLIE_ID)
  })

  it("the current user appears in their own team's detail exactly once", () => {
    const repo = new LocalStorageRepository()
    const detail = getTeamDetail(CURRENT_USER_TEAM_ID, repo)
    const me = detail?.members.filter((m) => m.isCurrentUser)
    expect(me).toHaveLength(1)
  })
})

describe('getTeamSummaries / getTeamLeaderboard', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('produces one summary per team, ranked deterministically', () => {
    const repo = new LocalStorageRepository()
    const ranked = getTeamLeaderboard(repo)
    expect(ranked).toHaveLength(3)
    expect(ranked.map((t) => t.rank)).toEqual([1, 2, 3])
    // Re-running with the same underlying data produces the same order.
    const rankedAgain = getTeamLeaderboard(repo)
    expect(rankedAgain.map((t) => t.id)).toEqual(ranked.map((t) => t.id))
  })

  it('Team Charlie (1 strong member) is not penalized for being smaller than Team Bravo (2 members)', () => {
    const repo = new LocalStorageRepository()
    const summaries = getTeamSummaries(repo)
    const charlie = summaries.find((t) => t.id === TEAM_CHARLIE_ID)!
    const bravo = summaries.find((t) => t.id === TEAM_BRAVO_ID)!
    // Sarah (Charlie's only member) is Elite-tier; Charlie should be able to
    // outscore the larger Bravo team on the strength of her metrics alone.
    expect(charlie.score).toBeGreaterThan(bravo.score)
  })

  it('never modifies GameState, XP, Energy, Streak, or the event log — read-only w.r.t. the Game Engine', () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)
    service.checkIn(new Date('2026-09-04T09:00:00'))

    const beforeState = repo.getGameState()
    const beforeEvents = repo.getEvents()
    const beforeAchievements = repo.getAchievements()

    getTeamSummaries(repo)
    getTeamLeaderboard(repo)
    getTeamDetail(CURRENT_USER_TEAM_ID, repo)

    expect(repo.getGameState()).toEqual(beforeState)
    expect(repo.getEvents()).toEqual(beforeEvents)
    expect(repo.getEvents()).toHaveLength(beforeEvents.length)
    expect(repo.getAchievements()).toEqual(beforeAchievements)
  })

  it('reflects the persisted state correctly after a fresh repository instance (reload)', () => {
    const service = new GameService(new LocalStorageRepository())
    service.checkIn(new Date('2026-09-04T09:00:00'))

    const reopenedRepo = new LocalStorageRepository()
    const detail = getTeamDetail(CURRENT_USER_TEAM_ID, reopenedRepo)
    const me = detail?.members.find((m) => m.isCurrentUser)
    expect(me?.currentStreak).toBe(1)
  })

  it("an individual Documentation Alert does not directly regress the team's Evolution stage", () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)

    // Build the user up so Team Alpha reaches a solid Evolution stage.
    service.devTriggerLevel(10)
    for (let i = 0; i < 10; i++) {
      service.qaPass(new Date(`2026-09-0${(i % 9) + 1}T0${i}:00:00`))
    }
    const before = getTeamSummaries(repo).find((t) => t.id === CURRENT_USER_TEAM_ID)!

    service.documentationAlert(new Date('2026-09-05T09:00:00'))
    const after = getTeamSummaries(repo).find((t) => t.id === CURRENT_USER_TEAM_ID)!

    // Evolution never regresses, no matter what a single Alert does to the
    // live score.
    expect(['Baby', 'Young', 'Advanced', 'Elite'].indexOf(after.evolutionStage)).toBeGreaterThanOrEqual(
      ['Baby', 'Young', 'Advanced', 'Elite'].indexOf(before.evolutionStage),
    )
  })

  it('the team can show Recovery mood after a dip', () => {
    const repo = new LocalStorageRepository()
    const service = new GameService(repo)

    // First read establishes a low baseline score for Team Alpha.
    const first = getTeamSummaries(repo).find((t) => t.id === CURRENT_USER_TEAM_ID)!
    expect(first.score).toBeLessThan(55)

    // The user becomes highly active, lifting the team's live score back up.
    service.devTriggerLevel(20)
    for (let i = 0; i < 15; i++) {
      const day = String((i % 28) + 1).padStart(2, '0')
      service.qaPass(new Date(`2026-01-${day}T0${i % 9}:00:00`))
    }
    const second = getTeamSummaries(repo).find((t) => t.id === CURRENT_USER_TEAM_ID)!

    expect(second.score).toBeGreaterThan(first.score)
    expect(second.mood).toBe('Recovery')
  })
})
