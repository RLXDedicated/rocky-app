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

// Accounts, the pet and traceability (migration 3):
//  - pet_profiles: Rocky the pet per agent (needs, outfit, items, wallet
//    counters) as one JSON document, validated by src/game/pet.ts.
//  - coin_ledger: every coin movement that isn't derived from progress
//    (purchases, treat bags, admin grants/deductions), with who did it and
//    the balance right after.
//  - audit_log: who did what, when and from where — logins, care actions,
//    purchases, admin changes. Append-only; survives agent resets.
//  - catalog_overrides: admin edits to the shop (price, availability).
//  - agent_credentials / sessions: PIN sign-in so an agent's progress
//    follows them to any device. Only salted scrypt hashes of PINs and
//    SHA-256 hashes of session tokens are stored.
export const MIGRATION_003_ACCOUNTS = `
  CREATE TABLE pet_profiles (
    agent_id   TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    revision   INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE coin_ledger (
    entry_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id      TEXT NOT NULL,
    delta         INTEGER NOT NULL,
    kind          TEXT NOT NULL,
    item_id       TEXT,
    note          TEXT,
    actor         TEXT NOT NULL,
    balance_after INTEGER NOT NULL,
    created_at    TEXT NOT NULL
  );
  CREATE INDEX idx_ledger_agent ON coin_ledger(agent_id, entry_id);

  CREATE TABLE audit_log (
    entry_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id    TEXT,
    actor       TEXT NOT NULL,
    action      TEXT NOT NULL,
    detail_json TEXT,
    source      TEXT,
    created_at  TEXT NOT NULL
  );
  CREATE INDEX idx_audit_agent ON audit_log(agent_id, entry_id);

  CREATE TABLE catalog_overrides (
    item_id    TEXT PRIMARY KEY,
    price      INTEGER,
    enabled    INTEGER,
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE agent_credentials (
    agent_id        TEXT PRIMARY KEY,
    pin_hash        TEXT NOT NULL,
    salt            TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until    TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  );

  CREATE TABLE sessions (
    token_hash   TEXT PRIMARY KEY,
    agent_id     TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    expires_at   TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    user_agent   TEXT,
    revoked_at   TEXT
  );
  CREATE INDEX idx_sessions_agent ON sessions(agent_id);
`

// Limited collections (seasonal specials, themed packs) can be opened for a
// date window: the day it opens and the last day it stays open.
export const MIGRATION_004_COLLECTION_WINDOWS = `
  ALTER TABLE catalog_overrides ADD COLUMN starts_on TEXT;
  ALTER TABLE catalog_overrides ADD COLUMN ends_on TEXT;
`

// Internal chat between agents (docs/REALTIME_CHAT_PLAN.md). Messages are
// kept 90 days (purged nightly); Rocky admins keep a full copy for quality
// control, and every admin read is written to audit_log.
export const MIGRATION_005_CHAT = `
  CREATE TABLE chat_channels (
    channel_id TEXT PRIMARY KEY,
    kind       TEXT NOT NULL,
    title      TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE chat_members (
    channel_id   TEXT NOT NULL,
    agent_id     TEXT NOT NULL,
    last_read_id INTEGER NOT NULL DEFAULT 0,
    joined_at    TEXT NOT NULL,
    PRIMARY KEY (channel_id, agent_id)
  );
  CREATE INDEX idx_chat_members_agent ON chat_members(agent_id);

  CREATE TABLE chat_messages (
    message_id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    author_id  TEXT NOT NULL,
    body       TEXT NOT NULL,
    flagged    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    hidden_at  TEXT,
    hidden_by  TEXT
  );
  CREATE INDEX idx_chat_messages_channel ON chat_messages(channel_id, message_id);
  CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

  CREATE TABLE chat_reports (
    report_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id  INTEGER NOT NULL,
    reporter_id TEXT NOT NULL,
    reason      TEXT,
    created_at  TEXT NOT NULL,
    resolved_at TEXT,
    resolved_by TEXT,
    resolution  TEXT
  );

  CREATE TABLE chat_consents (
    agent_id    TEXT PRIMARY KEY,
    version     TEXT NOT NULL,
    accepted_at TEXT NOT NULL
  );

  CREATE TABLE chat_mutes (
    agent_id TEXT PRIMARY KEY,
    until    TEXT NOT NULL,
    muted_by TEXT NOT NULL,
    reason   TEXT
  );
`

// People: titles (a QA analyst badge, team leaders) and which leader each
// agent reports to. A title grants no permissions — ADMIN still comes only
// from ROCKY_ADMIN_EMAILS. Seeded with the pilot's current people.
export const MIGRATION_006_PEOPLE = `
  CREATE TABLE agent_titles (
    agent_id   TEXT PRIMARY KEY,
    title      TEXT NOT NULL CHECK (title IN ('qa', 'leader')),
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
  );

  CREATE TABLE team_members (
    member_id  TEXT PRIMARY KEY,
    leader_id  TEXT NOT NULL,
    added_at   TEXT NOT NULL,
    added_by   TEXT NOT NULL
  );
  CREATE INDEX idx_team_members_leader ON team_members(leader_id);

  INSERT INTO agent_titles (agent_id, title, updated_at, updated_by) VALUES
    ('mcantillo@rlx.us', 'leader', '2026-09-29T12:00:00.000Z', 'seed'),
    ('madiaz@rlx.us', 'qa', '2026-09-29T12:00:00.000Z', 'seed'),
    ('kcolina@rlx.us', 'qa', '2026-09-29T12:00:00.000Z', 'seed');
`

/** The Teams/SharePoint roster's shifts, and every card Rocky sent to Teams. */
/** Teams cards replaced after the agent answers (or the card goes stale). */
export const MIGRATION_015_CARD_UPDATES = `
  ALTER TABLE teams_deliveries ADD COLUMN card_updated_at TEXT;
`

/** QA desk: every audit a QA analyst logs (the engine event it produced, and any later correction). */
export const MIGRATION_014_QA_AUDITS = `
  CREATE TABLE qa_audits (
    audit_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id     TEXT NOT NULL,
    audit_date   TEXT NOT NULL,
    result       TEXT NOT NULL,
    ticket       TEXT,
    reason       TEXT,
    note         TEXT,
    auditor      TEXT NOT NULL,
    event_id     TEXT,
    created_at   TEXT NOT NULL,
    corrected_at TEXT,
    corrected_by TEXT
  );
  CREATE INDEX idx_qa_audits_agent ON qa_audits(agent_id, audit_date);
  CREATE INDEX idx_qa_audits_created ON qa_audits(created_at);
`

/** Shifts written in another time zone (e.g. US Eastern), and who gets Teams cards (SharePoint "Active"). */
export const MIGRATION_013_SCHEDULE_TZ = `
  ALTER TABLE agent_schedules ADD COLUMN time_zone TEXT;
  ALTER TABLE agent_schedules ADD COLUMN teams_enabled INTEGER NOT NULL DEFAULT 1;
`

export const MIGRATION_012_TEAMS = `
  CREATE TABLE agent_schedules (
    agent_id    TEXT PRIMARY KEY,
    name        TEXT,
    work_days   TEXT NOT NULL,
    start_time  TEXT NOT NULL,
    end_time    TEXT NOT NULL,
    source      TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    updated_by  TEXT NOT NULL
  );

  CREATE TABLE teams_deliveries (
    delivery_id  TEXT PRIMARY KEY,
    agent_id     TEXT NOT NULL,
    reminder_id  TEXT,
    kind         TEXT NOT NULL,
    category     TEXT,
    sent_at      TEXT NOT NULL,
    ok           INTEGER NOT NULL,
    error        TEXT,
    opened_at    TEXT,
    acted_at     TEXT,
    ignored_at   TEXT
  );
  CREATE INDEX idx_teams_deliveries_agent ON teams_deliveries(agent_id, sent_at);
`

/** Pinned chat announcements, weekly team challenges and Rocky's photo album. */
export const MIGRATION_011_EXTRAS = `
  CREATE TABLE chat_pins (
    channel_id TEXT PRIMARY KEY,
    message_id INTEGER NOT NULL,
    pinned_by  TEXT NOT NULL,
    pinned_at  TEXT NOT NULL
  );

  CREATE TABLE team_challenges (
    challenge_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    leader_id    TEXT,
    metric       TEXT NOT NULL CHECK (metric IN ('checkins', 'qa')),
    target       INTEGER NOT NULL,
    start_day    TEXT NOT NULL,
    end_day      TEXT NOT NULL,
    reward_item  TEXT,
    reward_coins INTEGER NOT NULL DEFAULT 0,
    created_by   TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    settled_at   TEXT,
    result       TEXT,
    final_score  INTEGER
  );

  CREATE TABLE rocky_photos (
    photo_id   TEXT PRIMARY KEY,
    agent_id   TEXT NOT NULL,
    mime       TEXT NOT NULL,
    data       BLOB NOT NULL,
    caption    TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_rocky_photos_agent ON rocky_photos(agent_id, created_at);
`

/** Streak shields: earned with QA Passes, spent on missed days. */
export const MIGRATION_010_STREAK_SHIELDS = `
  ALTER TABLE game_state ADD COLUMN streak_shields INTEGER NOT NULL DEFAULT 0;
`

/** Chat reactions (emoji on a message) and image/GIF attachments (kept like messages: 90 days). */
export const MIGRATION_009_CHAT_MEDIA = `
  CREATE TABLE chat_reactions (
    message_id INTEGER NOT NULL,
    agent_id   TEXT NOT NULL,
    emoji      TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (message_id, agent_id, emoji)
  );
  CREATE INDEX idx_chat_reactions_message ON chat_reactions(message_id);

  CREATE TABLE chat_attachments (
    attachment_id TEXT PRIMARY KEY,
    channel_id    TEXT NOT NULL,
    uploader_id   TEXT NOT NULL,
    mime          TEXT NOT NULL,
    size          INTEGER NOT NULL,
    data          BLOB NOT NULL,
    created_at    TEXT NOT NULL
  );
  CREATE INDEX idx_chat_attachments_created ON chat_attachments(created_at);
`

/** Testers of the pilot: a "Tester" badge next to their name, set by admins. */
export const MIGRATION_008_TESTERS = `
  CREATE TABLE agent_testers (
    agent_id  TEXT PRIMARY KEY,
    added_at  TEXT NOT NULL,
    added_by  TEXT NOT NULL
  );
`

/** Anibal (Rocky admin, shown as DEV) is also a quality analyst. Kept if an admin already set a title. */
export const MIGRATION_007_DEV_QA = `
  INSERT OR IGNORE INTO agent_titles (agent_id, title, updated_at, updated_by) VALUES
    ('apereira@rlx.us', 'qa', '2026-09-29T18:00:00.000Z', 'seed');
`
