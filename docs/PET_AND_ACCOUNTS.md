# Rocky the pet, sign-in and traceability

Status: live in this change · Owner: RLX QA (Anibal Pereira) · Last updated: 2026-09-28

## Why

Progress used to live partly in the browser: open Rocky on a new PC (or
without the Teams `?agente=` link) and the agent got a brand-new local Rocky —
coins, outfit, care, name and the intro were gone. Now everything an agent
sees comes from the backend, keyed to their work email.

## Sign-in (email + PIN)

- When the app is connected to the backend and doesn't know who is using it,
  it shows a sign-in screen: work email, then a 4–8 digit PIN.
- The **first** sign-in for an address creates its PIN. After that the PIN is
  required on every new device.
- Sign-in returns a session token (sent as `Authorization: Bearer`), valid
  90 days. Only a SHA-256 hash of the token and a salted scrypt hash of the
  PIN are stored.
- 5 wrong PINs lock the address for 15 minutes. QA can reset a PIN from the
  admin console (it also signs the agent out everywhere).
- **Sign out** (top bar) removes everything of that agent from the browser —
  safe on shared PCs.
- The existing Teams links (`?agente=`) keep working. To make sign-in
  mandatory, set `ROCKY_REQUIRE_LOGIN=true` on the backend (after agents have
  created their PINs). `ROCKY_LOGIN_DOMAINS=rlx.us` restricts sign-in to work
  addresses.

This is pilot-grade identity. The next step is Microsoft Entra ID (SSO),
which would replace the PIN check and keep the sessions and audit trail.

## What syncs on start-up

`src/services/remoteSync.ts` pulls, before the first paint: agent + role,
game state, badges, the **full event history** (diary, weekly streak view,
coin math), Rocky's name, whether the intro was completed, and the pet. If
the browser last held a different agent's data, it is wiped first.

## The pet

Rules: `src/game/pet.ts` (shared by browser and server).

| Need | Changes over time | Care |
| --- | --- | --- |
| Health | Recovers 1.5/h; drops 1/h only while very dirty (70+) or very unhappy (≤20) | Treat +12, Bath +3 |
| Happiness | −1.5/h | Pet +5 (8×/day), Treat +6, Play +14, Bath +4 |
| Cleanliness | Dirt +2/h | Play adds 12 dirt, Bath washes it all |

Long absences count as at most 72 hours, so a weekend never "kills" Rocky.
Needs never change XP, Energy, Streak, Mood or Evolution.

Actions are applied instantly in the browser and sent to `POST /api/pet/actions`;
the server re-applies them with the same rules and its copy wins.

## Coins, shop and ledger

- Earned from progress (recomputed, never stored as a balance): check-in 10,
  clean QA 25, badge 40, level 30, full streak week 50.
- Spent in the shop (36 items: 14 hats, 7 places, 9 decor, 5 ambience) and on
  treat bags. Items unlock by progress, then are bought.
- `coin_ledger` records every purchase and admin adjustment with who did it
  and the balance right after.

## Playing with Rocky

- **Click/tap the ground** and Rocky walks there (runs if it's far) and looks
  at the spot.
- **Eyes**: the iris moves inside each measured eye toward the pointer, the
  ball or the tapped spot, and glances around on its own when idle.
- **Legs**: below the hips (the bottom edge of the vest) each leg moves on
  its own — a walk cycle, and a faster, wider run.
- **Play**: the ball drops in and for ~9 seconds Rocky chases and dribbles
  it; the agent can tap the ball to kick it around; then Rocky takes the
  final shot.

## Clothes

Besides hats: **glasses** (on the measured eyes, moving with the head),
**neck** items (RLX ID badge — starter —, bow tie, bandana, scarf, tie,
medal) and **back** items drawn behind Rocky (backpack, hero cape, angel
wings). Placement is measured per artwork (`tools/build-rocky-rig.py`), so
every item fits every stage and mood. Full-body outfits would need layered
art (the torso changes shape between artworks).

## Note Check (the core habit)

`src/game/notesQuiz.ts`: 18 questions about great account notes; five a day,
the same for everyone. Rocky explains each answer. The first round of the
day pays 4 coins per correct answer, +10 and a treat for a perfect round —
scored on the server with the same bank (ledger kind `quiz`). Replays are
practice. The screen keeps a "what a great note has" checklist next to the
game, and Rocky mixes note tips into what he says on the pet screen. QA can
edit the question bank to match RLX's exact note standard.

## Traceability

`audit_log` records, with actor and source (PIN session / Teams link / admin):
sign-ins, failures, lockouts, sign-outs; care actions; purchases; outfit
changes; Rocky renames; QA Pass / Alert / Correction; every admin change
(coins, treats, gifts, needs, pet reset, PIN reset, shop edits, agent rename /
reset / delete). It is append-only and survives agent resets.

## Admin console

- **Agent drawer → Mascota y coins**: grant/deduct coins (reason required),
  add/remove treats, restore needs, reset the pet, gift or take back any
  accessory (gifts bypass the progress unlock), coin ledger.
- **Agent drawer → Trazabilidad / Acceso**: the agent's audit trail; PIN
  status, sessions by device, reset PIN, sign out everywhere.
- **Economía**: pilot totals, every wallet and pet's needs, latest movements.
- **Tienda**: change any item's price or take it out of the shop.
- **Auditoría**: the whole pilot's audit trail, filterable.

## Admin: progress

In the agent drawer, **Progreso**: grant XP (with a reason), raise to a
level, or unlock an evolution (Young = level 5, Advanced = 10, Elite = 20).
All of it is an `XP_GRANT` event — replayable from the event log, shown in
the agent's diary and in the audit trail. XP never goes down (use Reset
progress). The agent's screen picks it up when they come back to the tab
and celebrates the level-up or evolution.

## API

| Method | Path | Who |
| --- | --- | --- |
| POST | `/api/auth/status`, `/api/auth/login` | anyone |
| POST | `/api/auth/logout` | agent |
| PATCH | `/api/agent/me` (`rockyName`) · POST `/api/agent/onboarded` | agent |
| GET | `/api/events`, `/api/pet` · POST `/api/pet/actions` | agent |
| GET | `/api/admin/agents/:id/pet`, `/api/admin/catalog`, `/api/admin/economy`, `/api/admin/audit` | QA/Admin |
| POST | `/api/admin/agents/:id/{coins,treats,items,needs/restore,pet/reset,pin-reset,sessions/revoke}` | QA/Admin |
| PATCH | `/api/admin/catalog/:itemId` | QA/Admin |
| POST | `/api/admin/agents/:id/xp` (`xp`, `reason`) · `/api/admin/agents/:id/level` (`level` or `stage`) | QA/Admin |

Storage: migration 3 (`backend/src/infrastructure/persistence/schema.ts`).

## Other fixes in this change

- **Ranking** now ranks the real pilot agents (it showed 5 demo agents), and
  never sends other agents' email addresses. "My team"/"Teams" are hidden
  when connected to the backend until a real team roster exists.
- The server kept "you moved up/down" in one key shared by all agents; it is
  now per browser.
- Admin "at risk" counts **working days** without a check-in (Monday no
  longer flags everyone who checked in on Friday).
- The reminder card no longer covers the check-in button, and closes when
  the agent checks in; a check-in from the reminder updates the pet screen.

## Open product decision: weekend streaks

The streak is a calendar-day count (documented, tested product decision), so
a Monday–Friday agent who rests on weekends restarts at 1 every Monday. That
makes the 7-day streak (Happy mood, 50 XP, streak-week coins), the 14/30-day
milestones and several shop unlocks reachable only by checking in on
weekends. Recommendation: count working days (a weekend off doesn't break
the streak). `missedWorkingDays` in `src/engine/dateUtils.ts` already
implements the counting; changing the rule is a one-function change in
`calculateStreak` plus its tests.

## Next improvements (identified)

1. **Link Note Check to real QA findings**: when an audit raises a
   Documentation Alert, show the agent the related Note Check tip the next
   time they open Rocky ("Your last alert was about missing next steps").
2. **Question bank in the admin console**, so QA can add questions from real
   audit patterns without a deploy.
3. **Weekend streak rule** (open decision above).
4. **Team roster** from SharePoint to bring back real team pages.
5. **Layered Rocky art** for true blinking, mouth shapes and full outfits.
6. **Entra ID sign-in** to replace the PIN.
