# Rocky ↔ Microsoft Teams

Standard Microsoft 365 connectors only: no premium HTTP, no Entra ID app
registration, no Graph. Rules live in Rocky; the flow only delivers
(docs/adr/0004, 0005).

## Pieces

| Piece | Where | What it does |
| --- | --- | --- |
| Roster & shifts | Admin → 🗓️ Horarios y Teams → *Importar* | Paste the SharePoint list export (CSV/TSV). Columns found by name, ES/EN: `TeamsEmail`/`Correo`, `AgentName`/`Nombre`, `TeamLeadEmail` (or `TeamLead` by name), `WorkDays`, `ShiftStart`, `ShiftEnd`, `Schedule` ("WED-SUN / 1100 - 2000"), `Active`, `TimeZone`. A list with names and no emails is matched by name to the roster already in Rocky. Stored in `agent_schedules` (migrations 012–013). |
| Time zones | `toLocalSchedule` in `src/game/schedule.ts` | A shift is kept in the zone it was written in (the RLX roster uses US Eastern) and converted to server time (Colombia) when used, so US daylight saving is followed automatically. |
| Active | SharePoint `Active` → `teams_enabled` | Active = No: the shift still applies in the app (streaks, in-app reminders) but no Teams cards. Toggle per agent in Admin. |
| Reminder cards | `backend/src/application/teamsApplicationService.ts` | Every 5 min (server.ts) Rocky evaluates each rostered agent with the same reminder engine as the app (cooldowns, daily cap, priorities), **only inside their shift**, and POSTs the due cards in one call to the Workflows webhook. Logged in `teams_deliveries`. |
| Workflows flow | Teams → Workflows | "When a Teams webhook request is received" → Parse JSON → Apply to each `cards` → "Post card in a chat or channel" (Flow bot → chat with `email`, card = `string(item()?['card'])`). Step-by-step guide in the Admin tab. |
| Card buttons | `GET /api/teams/go?t=…` (public) | HMAC-signed, 7-day links. Records opened / "notes done", marks the reminder, and redirects to the web app (`?agente=…&from=teams&teams=done|open`). Tampered/expired → friendly 403 page. |
| Rocky in Teams | `public/teams/rocky-teams-app.zip` (built by `tools/teams-app/build.py`) | Personal static tab opening the web app with `?agente={loginHint}`. Fallback: a Website tab in a channel. |

## Cards (all note coaching first)

Every card carries a rotating **note lesson** (`src/engine/noteCoaching.ts`):
why notes matter, how a note is built (who · what · outcome · next step),
the process (right away, updates, transfers, voicemails, escalations),
before/after examples, what never goes in, and how QA reads a note. An
agent never gets one of their last 20 lessons again; each week has a focus
theme, so a month walks the whole process. The lesson stays on the card
after it's answered. "📘 Practice notes" opens the Note Check game.

| Kind | When | Counts in the 3/day? |
| --- | --- | --- |
| `greeting` | First 45 min of the shift: hello, today's focus lesson, the 5-point checklist, team challenge | No (extra) |
| `weekly` | The greeting of the first shift day of the week, plus last week's summary (check-ins, cards answered, notes confirmed, kudos, QA passes) | No (extra) |
| `reminder` | The reminder engine (cooldowns, priorities). Evolutions / streak milestones get a big celebration layout | Yes |
| `streakrisk` | 30–120 min before the shift ends, streak ≥ 2 and no check-in today | Yes (saved in the reminder history) |
| `kudos` | Teammates' thank-yous, batched into one card | No (extra) |
| `leader` | Monday from 9:00: each team lead's week (per-agent check-ins, cards, kudos, mood; who could use a hand; a lesson for the huddle). Admin: toggle and "send now" | — |

No reminder goes out within 45 min of a greeting or kudos card. Admin →
Teams y horarios → "Ver las tarjetas" previews every kind.

## Kudos and polls

- `POST /api/kudos {to, tag, message}`: 3 a day, one per teammate; the
  teammate's Rocky gets +4 happiness and 3 coins. Friends page: 🙌 on each
  teammate, the team wall and "for me". Stored in `kudos` (migration 017).
- Chat polls: `POST /api/chat/channels/:id/polls {question, options}`,
  `PUT /api/chat/messages/:id/vote {option}` (one vote, changeable). The poll
  lives in the message body, votes are `poll:<n>` reactions.

## Effects on Rocky

| Event | Effect |
| --- | --- |
| First answer to a reminder card (open or "notes done") | +6 happiness, +2 coins |
| Check-in from 30 min before to 60 min after the shift starts (once a day) | +5 happiness, +5 coins |
| Reminder card unanswered for 3 h | −6 happiness (max 2 per day) |
| Days off in the agent's shift | Don't break the streak (`missedWorkingDays` with the agent's days) |
| In-app reminders | Only during the agent's shift |

All effects go through `pet.teamsEffect` (ledger + audit, actor `rocky-teams`).

## Environment (Railway)

| Variable | Notes |
| --- | --- |
| `ROCKY_TEAMS_WEBHOOK_URL` | The flow's HTTP POST URL. Set it yourself in Railway (it's a secret: anyone with it can post cards). Unset → cards off. |
| `ROCKY_LINK_SECRET` | Signs card links. Falls back to a hash of `ROCKY_CHAT_BACKUP_KEY`; otherwise random per boot (links die on restart). |
| `ROCKY_PUBLIC_WEB_URL` / `ROCKY_PUBLIC_API_URL` | Defaults: rocky-dist.vercel.app / the Railway backend. |

## Admin API

`GET /api/admin/teams/status` · `POST /api/admin/teams/test` · `POST /api/admin/teams/dispatch` ·
`GET /api/admin/teams/preview/:email?kind=` · `PUT /api/admin/teams/leader-summary` · `POST /api/admin/teams/leaders/send` · `PUT|DELETE /api/admin/schedules/:email` ·
`POST /api/admin/roster/import {text|rows, removeMissing, defaultSchedule}`

## Card updates (optional flow branch)

After an agent answers a card (or it expires after 3 h), Rocky sends the
card's "done/expired" version in the same webhook call, under `updates`
(`[{ deliveryId, email, card }]`). Teams can only replace a message by its
ID, so the flow keeps a small SharePoint list **RockyCards** (Title =
deliveryId, MessageId = text):

1. Inside the `cards` loop, after "Post card in a chat or channel":
   SharePoint **Create item** → Title = `item()?['deliveryId']`,
   MessageId = the post action's *Message ID*.
2. A second **Apply to each** over `triggerBody()?['updates']`:
   SharePoint **Get items** (Filter Query `Title eq '@{item()?['deliveryId']}'`,
   Top Count 1) → Microsoft Teams **Update an adaptive card in a chat or
   channel** (Flow bot, Chat with Flow bot, Recipient `item()?['email']`,
   Message ID `first(body('Get_items')?['value'])?['MessageId']`,
   card `string(item()?['card'])`).

Without the branch the updates are simply ignored by the flow.

## Backups

Nightly after 2 a.m. (and "Respaldar ahora" in Admin → Registros → Sistema)
the whole SQLite database is snapshotted (`VACUUM INTO`), gzipped, sealed
with `ROCKY_CHAT_BACKUP_KEY` and written to `<db dir>/db-backups/` (newest
14) and the bucket (`db-backups/`, full history). Restore with
`ROCKY_CHAT_BACKUP_KEY=… node tools/restore-db-backup.mjs <file> rocky.db`.
