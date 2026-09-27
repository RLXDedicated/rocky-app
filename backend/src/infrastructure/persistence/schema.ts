// Schema DDL, grouped by migration (Phase 13 §14). This file only holds
// SQL strings — no domain logic, no query building beyond table creation.
// Field names mirror docs/DATA_MODEL.md's shapes 1:1 (see that document
// and docs/PERSISTENCE_FOUNDATION.md for the authoritative/derived
// classification of each column).
export const MIGRATION_001_INITIAL = `
  CREATE TABLE agents (
    agent_id   TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    rocky_name TEXT NOT NULL
  );

  -- One row per agent — GameState.xp/level/... (DATA_MODEL.md). This is a
  -- CACHE of what the event log implies, same as the frontend's
  -- LocalStorageRepository/this backend's InMemoryRepositoryStore already
  -- treat it — the event log below remains authoritative (DOMAIN_RULES.md
  -- §Corrections; ARCHITECTURE.md §Event flow). "mood" is stored exactly
  -- because GameState.saveGameState(state) already includes whatever
  -- value the Game Engine computed for it — this table never computes
  -- Mood itself (Phase 13 §4).
  CREATE TABLE game_state (
    agent_id                TEXT PRIMARY KEY REFERENCES agents(agent_id),
    xp                      INTEGER NOT NULL,
    level                   INTEGER NOT NULL,
    energy                  INTEGER NOT NULL,
    mood                    TEXT NOT NULL,
    evolution_stage         TEXT NOT NULL,
    current_streak          INTEGER NOT NULL,
    best_streak             INTEGER NOT NULL,
    last_check_in_date      TEXT,
    last_alert_at           TEXT,
    last_positive_action_at TEXT,
    last_activity_label     TEXT,
    last_activity_at        TEXT
  );

  -- The durable source of truth (ARCHITECTURE.md §Event flow;
  -- DOMAIN_RULES.md §Idempotency). event_id is UNIQUE via PRIMARY KEY;
  -- agent_id/timestamp/type are indexed for the query patterns Streak,
  -- Corrections, and Achievement evaluation actually need.
  CREATE TABLE events (
    event_id           TEXT PRIMARY KEY,
    agent_id           TEXT NOT NULL,
    type               TEXT NOT NULL,
    event_date         TEXT NOT NULL,
    timestamp          TEXT NOT NULL,
    payload_json       TEXT,
    corrects_event_id  TEXT
  );
  CREATE INDEX idx_events_agent ON events(agent_id);
  CREATE INDEX idx_events_timestamp ON events(timestamp);
  CREATE INDEX idx_events_type ON events(type);

  -- Denormalized for cheap reads (DATA_MODEL.md §Achievement) — the event
  -- log's ACHIEVEMENT events remain authoritative if these ever disagree.
  CREATE TABLE achievements (
    agent_id       TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    name           TEXT NOT NULL,
    description    TEXT NOT NULL,
    unlocked_at    TEXT NOT NULL,
    PRIMARY KEY (agent_id, achievement_id)
  );

  CREATE TABLE reminders (
    reminder_id  TEXT PRIMARY KEY,
    agent_id     TEXT NOT NULL,
    category     TEXT NOT NULL,
    message      TEXT NOT NULL,
    timestamp    TEXT NOT NULL,
    status       TEXT NOT NULL,
    actionable   INTEGER NOT NULL,
    dedupe_key   TEXT
  );
  CREATE INDEX idx_reminders_agent ON reminders(agent_id);
`

// Durable idempotency records (Phase 13 §6) — one row per
// (agentId, route, idempotencyKey) that has ever been submitted. The
// UNIQUE constraint IS the durability guarantee: a retried request after
// a restart still finds its prior record and replays the same response
// instead of re-running the Game Engine.
export const MIGRATION_002_IDEMPOTENCY = `
  CREATE TABLE idempotency_records (
    agent_id        TEXT NOT NULL,
    route           TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_hash    TEXT NOT NULL,
    response_json   TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    PRIMARY KEY (agent_id, route, idempotency_key)
  );
`

// Teams are NOT part of this schema. In the current architecture (both
// the frontend and this backend, Phase 12) team membership/roster is a
// fixed constant (teamService.ts's TEAMS / CURRENT_USER_TEAM_ID /
// mockAgents.ts) computed live from each member's GameState, never its
// own persisted collection — DATA_MODEL.md §Team/Leaderboard-related
// data is explicit that Team Score is "never a sum of individual XP" and
// deliberately not a stored economy. Adding a `teams` table here would be
// inventing a parallel model Phase 13 explicitly says not to (§4). If a
// future phase needs real team rosters, that decision is made in the
// frontend/domain layer first, then reflected here — not the reverse.
