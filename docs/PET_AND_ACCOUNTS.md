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
- Spent in the shop — two sections, **Rocky** (hats, glasses, clothes) and
  **World** (backgrounds, items, ambience) — and on treat bags. Items unlock by progress, then are bought.
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
  final shot. The ball has a generous invisible hit area, and a tap within
  ~70 px of it also counts as a kick.

## Items that live with Rocky (Pet Society style)

- World items (package stack and snack bowl to start; hay bale, plant,
  balloons, lamp, trophy, bench, mailbox, bed, pennant, toy truck, barn) are
  placed in the scene — up to 6 at a time.
- **Arrange my world** (the ✥ button on the stage, or in the shop's World
  section): drag items along the floor (arrow keys also work), × puts one
  away, Done saves. Positions are stored in the pet's outfit
  (`outfit.spots`, % of the stage width, clamped 3–95) on the server, so the
  layout follows the agent to any device.
- **Tap an item** and Rocky walks over and plays with it: eats from the bowl
  and the hay, naps on the bed, rests on the bench, cheers at the trophy,
  balloons and pennant, sniffs the plant and lamp, peeks into the boxes,
  mailbox and barn, "vroom"s the truck. When idle he also visits his things
  on his own. Visits are for fun only: no coins, XP or needs change.

## Rocky's art: white background clean-up

The delivered PNGs had opaque white patches where the background was
enclosed (between the legs, around the tail). Once the rig moves the legs,
those patches stretched with them. `tools/clean-rocky-art.py` makes them
transparent (flood fill from the outside through near-white pixels below
the neck, plus enclosed white blobs below the hips) and softens the fringe;
the untouched originals are kept in `docs/rocky-assets-source/original-png/`
and the tool always starts from them. The half-body reaction stills are not
touched. Re-run `tools/build-rocky-rig.py` after changing the art.

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

## Rocky's bag: food and soaps

- **Food** (`src/game/pantry.ts`): the basic treat is still earned by work
  (1 per check-in, 2 per clean audit); on top of that the Pantry sells foods
  by the unit (apple, carrot, hay cookie, veggie wrap, smoothie, cake, plus
  seasonal candy corn, caramel apple, pumpkin pie, gingerbread, hot cocoa,
  candy cane), each with its own health/happiness boost. New agents start
  with 2 apples.
- **Feeding**: the Food button opens the bag; the agent **drags** a snack
  onto Rocky (he glows when it's over him) and he eats it. Tap or Enter also
  works (accessibility).
- **Bathing**: the Bath button opens the soaps. The agent **holds the soap
  and scrubs Rocky** — foam appears where the soap passes and a "Scrub %"
  meter fills; at 100% the shower rinses him. Soaps are bought once
  (RLX soap bar is free; bubble-gum, lavender, pumpkin spice, peppermint add
  happiness and tint the foam).
- **Dirty Rocky** now shows wavy stink lines rising beside him (and flies
  when it's bad) instead of the brown spots.

## Mini-games that pay (capped)

Both are server-scored in `applyPetAction` and share daily caps
(`GAME_CAPS`: 60 coins and 12 XP a day). XP is recorded as an `XP_GRANT`
event with `grantedBy: "rocky-games"` (it replays, shows in the diary as
"XP playing with Rocky", and can level Rocky up).

- **Keep it up**: during Play, taps on (or within ~100 px of) the ball kick
  it up; each tap in a row without the ball touching the ground counts. The
  session keeps going while the rally lasts (up to 90 s). 3+ touches pay:
  `keepyReward` (e.g. 5 → 1 coin + 1 XP, 10 → 6 coins + 2 XP, 20 → 14 coins
  + 3 XP). Streaks above 80 are clamped. The ball's hit area is 34 px larger
  than the ball on every side.
- **Litter**: a piece (can, paper, banana peel, bottle, box, wrapper) drops
  in Rocky's world every 3 hours, up to 4 (deterministic, so browser and
  server agree). Drag it into the green bin: 1–5 coins, and a 35% chance of
  1–3 XP. Picked-up pieces can't be claimed twice.

## Seasonal specials and more effects

- Shop sections: **Rocky** (hats, glasses, clothes), **World**
  (backgrounds, items, effects), **Pantry** (food, soaps, treat bags) and
  **Seasonal** (🎃 Spooky, 🎄 Holidays). Seasonal items are open to
  everyone (no progress lock) and carry a badge.
- Spooky: witch hat, pumpkin hat, masquerade mask, spooky bow tie, bat
  wings, Haunted hill and Pumpkin patch backgrounds, jack-o'-lantern, candy
  bucket, "RIP typos" tombstone, friendly ghost, bubbling cauldron, bat
  swarm, spooky mist, floating ghosts, candy rain.
- Holidays: elf hat, reindeer antlers, snowflake glasses, jingle bell
  collar, candy-stripe scarf, gift sack, Winter village and North Pole
  lights backgrounds, candy cane, gift pile, snowman, holiday tree, mini
  sleigh, twinkle lights, snowflake storm, northern lights.
- New effects for everyone: flying notes, maple swirl, summer rain, bubble
  party, cherry blossoms, dandelion wishes, butterflies, shooting stars,
  rainbow sparkle, fireworks show, coin shower. All are CSS animations on
  small SVGs (no per-frame JS) and are hidden with reduced motion.
- Shop bug fixed: in the scrolling shop column the section tabs were
  squashed to 8 px by flex-shrink, so sections overlapped. Every block now
  keeps its height.

## Friends and visits

- Every agent in the pilot is a friend (`GET /api/friends`): Rocky name,
  public name, level, stage, mood, streak, how Rocky feels and when they
  were last active. Friends are identified by an opaque id (a hash of the
  email); emails never reach other agents.
- **Visit** (`GET /api/friends/:id`) shows the friend's real world: their
  background, placed items, effects and Rocky. Visitors can **pet**,
  **wave** or **give one of their own treats**
  (`POST /api/friends/:id/visit`). The first visit to each friend a day
  pays the visitor 2 coins (up to 5 friends a day); the host's Rocky gets
  +3 happiness, a treat if one was given, and a note in the inbox ("Ana
  visited and petted Rocky").
- **Inbox**: visits, gifts and QA messages. A new QA message is the first
  thing Rocky says on the home screen; the ✉️ chip opens the list.

### Going real-time (research, next step)

What's built is asynchronous (like Pet Society's visits): you visit a
friend's world and they see it later. Making Rockys meet *live* would add:

1. **Presence**: a lightweight Server-Sent Events stream
   (`GET /api/friends/live`) pushing "who is online" and new inbox entries.
   SSE works through the Vercel → Railway setup without extra services; the
   backend keeps a map of open streams per agent.
2. **Live visits**: when both are online, the visitor's Rocky appears in the
   host's world (a second, read-only Rocky on the stage) and their actions
   (wave, ball kick) are broadcast over the same stream. The ball could be
   shared by sending kick impulses, not positions, so each browser
   simulates it.
3. **Scale**: 56 agents fit comfortably in one Node process. Beyond a few
   hundred concurrent streams, move fan-out to Redis pub/sub (Railway has a
   Redis template) so multiple backend instances can share it.
4. **Safety**: only preset interactions (no free-text chat) keeps
   moderation out of scope; rate-limit visits per agent.

## Admin superpowers

- **⚡ Acciones masivas** tab: pick agents (all, filtered or by hand) and
  run one operation for all of them — coins, XP, gift any item, food or
  soap, treats, a message Rocky reads to the agent, restore needs, clear
  litter, reset today's mini-game caps. One-click events: 🎃 Halloween kit,
  🎄 Holiday kit, 🌟 Perfect week. Each agent gets their own ledger and
  audit entries (`POST /api/admin/bulk`, plus one `admin.bulk` summary).
- Per agent (drawer): the bag (give/remove food and soaps), mini-game stats
  (best keep-it-up, litter picked, today's coins/XP vs the caps), send a
  message, clear litter, reset caps, see the inbox.
- Pantry items can be repriced or taken out of the shop from the Tienda tab
  like any other item.

## Next improvements (identified)

1. **Link Note Check to real QA findings**: when an audit raises a
   Documentation Alert, show the agent the related Note Check tip the next
   time they open Rocky ("Your last alert was about missing next steps").
2. **Question bank in the admin console**, so QA can add questions from real
   audit patterns without a deploy.
3. **Weekend streak rule** (open decision above).
4. **Team roster** from SharePoint to bring back real team pages.
5. **Layered Rocky art** — the real quality jump. Per stage, deliver Rocky in
   separate transparent layers (PSD or PNGs on one canvas): head, each horn,
   each ear, eyes (white, iris, eyelids), mouth shapes, torso, vest, each
   arm, each leg, tail, with each part drawn complete where it overlaps.
   That enables true blinking, talking, arm waves, sitting/sleeping poses
   and full outfits that follow the body, with a proper skeletal rig
   (Spine/Rive, or the current mesh renderer per layer).
6. **Entra ID sign-in** to replace the PIN.
