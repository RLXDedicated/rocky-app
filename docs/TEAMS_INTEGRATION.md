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
`GET /api/admin/teams/preview/:email` · `PUT|DELETE /api/admin/schedules/:email` ·
`POST /api/admin/roster/import {text|rows, removeMissing, defaultSchedule}`
