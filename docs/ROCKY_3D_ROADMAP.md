# Rocky: from 2.5D to an interactive pet (and maybe 3D)

Status: Baby Rocky 3D in preview (off by default) · Owner: RLX QA (Anibal Pereira) · Last updated: 2026-09-28

## Goal

Make Rocky feel like a pet the agent owns — in the spirit of *Pet Society* and
*Talking Tom*: Rocky moves, reacts to touch, eats, plays, wears clothes and
lives in a place that is his. All of it must keep reinforcing the real habit
(daily check-ins, clean QA audits); nothing cosmetic may grant XP.

## Where we are (shipped in this change)

The approved 2.5D artwork (16 stage × mood PNGs + 6 reactions) is the only
Rocky. On top of it we now have a 2.5D "world":

| Capability | How it works |
| --- | --- |
| Rocky walks around | The whole sprite moves along the route with a waddle and lean; idles and wanders every 5–10 s. |
| Pet / tap | Tap Rocky → squash-and-stretch, hearts, a hand-written line. |
| Treats | Earned by real work (1 per check-in, 2 per QA pass); feeding plays a toss + chomp. |
| Play | A ball drops, Rocky walks to it and hops. |
| Clothes | 8 hats drawn as vector overlays and placed with **measured head anchors** per artwork (`tools/build-rocky-anchors.py` → `src/components/rockyAnchors.ts`). |
| Places & decor | 4 scenes in the RLX isometric-map style and 5 props. |
| Unlocks | Every item unlocks from real progress (level, streak, badges) — see `src/game/closet.ts`. |

Limits of this approach: Rocky can't turn around (mirroring the art would
mirror the RLX logo on the vest), can't change pose beyond the 22 drawn
images, and clothes can only go on the head (the torso and arms change shape
between artworks).

## 2.5D animated Rocky — live (all stages)

The default Rocky is the approved 2.5D artwork brought to life by a small
WebGL mesh-deformation rig (`src/components/world/RockyRig.tsx` +
`rigRenderer.ts`), Live2D-style: no cutting, no redrawing.

- Head sways, bobs and turns toward the pointer, bending smoothly at the
  neck; the chest breathes. The face is never painted over — the earlier
  fake eyelids were removed because they cheapened the approved art. Real
  blinks need layered art (option B).
- Personality per mood (Happy lively, Worried slower with the head low,
  Recovery slow deep breaths), plus reactions: content squint and head lean
  when petted, chewing nods when eating, head bob when walking.
- Closet hats follow the head every frame.
- Rig points per artwork (neck, pivot, chest, feet) are measured by
  `tools/build-rocky-rig.py` → `src/components/rockyRig.ts`.
- Falls back to the still image without WebGL; reduced motion shows a
  still frame.

To swap in new art (e.g. high-res exports of Visual Canon v2), replace the
PNGs and re-run the tool; check `eyecheck`-style overlays for the eyes.

## Mood: calm by default

Rocky's default mood is **Motivated** (calm, ready). He is only **Worried**
for a concrete reason: energy under 40, or a QA alert with no check-in or
QA pass since (for up to 72 h, `GAME_CONFIG.mood.unansweredAlertHours`). A
new agent or a short streak is not a reason to worry. Happy still needs
energy 70+ and a 7-day streak; Recovery is unchanged.

## Coins and Rocky's shop

The pet screen is only Rocky's world. Stats, goals, evolution and the diary
moved to the **Progress** tab; looks moved to **Rocky's shop** (side panel,
so Rocky stays visible while trying things on).

- Coins are earned only by real work (`src/game/economy.ts`): check-in 10,
  clean QA audit 25, badge 40, each level 30, each full streak week 50.
  The earned total is recomputed from progress; only purchases are stored,
  so the balance can't be inflated by editing a number.
- Shop items (`src/game/closet.ts`) are unlocked by progress, then bought:
  hats, places (incl. Sunset route), decor, ambience (falling leaves,
  fireflies, confetti) and treat bags (+3 treats).
- Coins never change XP, Energy, Streak or Mood.
- The pet (needs, outfit, purchases, wallet) now lives on the backend and
  follows the agent to any device — see `docs/PET_AND_ACCOUNTS.md`.

## 3D Rocky — preview (Baby stage)

The Baby Rocky GLB (Tripo model, Mixamo rig, 9 clips) is wired into the
Home world, but it is **off by default**: the delivered file has no texture
(see below) and the stop-gap colouring isn't at the approved art's quality,
so agents keep seeing the 2.5D Rocky. Open the app with `?rocky3d=1` to
preview the 3D Rocky on that browser (`?rocky3d=0` to go back). Flip the
default in `rocky3dModels.ts` once a textured model is in.

| Game moment | Clip |
| --- | --- |
| Rocky appears | `Wave` |
| Standing / wandering | `Idle` / `Walk` (turns toward where he walks) |
| Tap / Pet | `Happy` |
| Treat | `Eat` |
| Play (ball) | `Celebrate` |
| Check-in, level up, evolution | `Celebrate` |
| QA pass / alert / comeback | `Happy` / `Worried` / `Recovery` |
| Every ~11 s while idle | the clip for the current mood (`Happy`, `Motivated`, `Worried`, `Recovery`) |

How it's built (`src/components/world/`):

- `rocky3dRuntime.ts` — three.js scene, clip crossfades, turning, and the
  head pose each frame (closet hats follow the head bone, including tilt).
  Loaded as a separate chunk only when needed.
- `Rocky3D.tsx` — React wrapper; shows the 2.5D art until the model is
  ready and falls back to it on any error or when WebGL is missing.
- `rocky3dModels.ts` — which stage has a model, and the 3D on/off switch
  (off by default; `?rocky3d=1` / `?rocky3d=0` per browser).
- Reduced motion: Rocky holds still poses, no animation.

### Known issue in the delivered file — no textures

`docs/rocky-assets-source/3d/Baby_Rocky_AllAnimations.glb` has **no
textures and no material colours** (Blender export dropped Tripo's
texture), so as delivered it renders plain white. `tools/bake-rocky3d-colors.py`
works around it with vertex colours: clean solid colours per part (fur,
hair, horns, RLX-green vest, hooves) and only the facial features (eyes,
muzzle, mouth) projected from the approved Happy art, fitted to the
sculpted eyes. It's presentable for a preview, not for release — a real
texture is needed. (A first version projected the art onto the whole body
and looked smeared; don't go back to that.) Re-export from Blender with the texture
packed (File › External Data › Pack Resources, then glTF export with
Materials: Export and Images: Automatic) and drop it in — the app uses a
file's own textures automatically; skip the bake step for it.

### Adding Young / Advanced / Elite

1. Same format as Baby: GLB, Mixamo rig, clips named `Idle Walk Wave Eat
   Celebrate Happy Motivated Worried Recovery`, feet at y=0, facing +Z,
   ~1 unit tall, textures packed.
2. Put it in `src/assets/rocky3d/<stage>.glb` and register it in
   `rocky3dModels.ts`.

## Options

### A. Stay 2.5D, draw more (layered sprite sheets)

Commission the illustrator to deliver Rocky in **layers** (body, head,
eyes, mouth, arms) plus a few extra poses (walk cycle, eat, sleep, wave).

- Pros: keeps the approved look 1:1; cheap to run (plain images); works on
  any agent PC.
- Cons: every new pose or outfit slot means more drawing; motion stays "paper
  doll".
- Effort: illustrator work + ~1–2 weeks of front-end.

### B. 2D skeletal animation (Rive or Spine) — **recommended next step**

Rig the layered 2D Rocky in [Rive](https://rive.app) (or Spine). The rig gives
smooth, Talking-Tom-style motion: blinking, breathing, looking at the cursor,
head pats, eating, dancing, and outfits as swappable slots on any bone (head,
body, hands) — driven by a state machine that our app feeds with mood,
evolution stage and events.

- Pros: closest to the *Talking Tom* feel for the least cost; keeps the 2.5D
  identity the brand already approved; outfits on the whole body; tiny files
  (a rig is usually tens of KB) and a small web runtime (on the order of
  ~100–200 KB, wasm); runs well on modest office hardware.
- Cons: needs the layered art (option A's deliverable) and a rigger/animator;
  a new runtime dependency.
- Effort: layered art + rigging by a motion designer, then ~2–3 weeks to wire
  the state machine to the game (the engine and events already exist).

### C. Real 3D (three.js / react-three-fiber + a rigged GLB)

Model Rocky in 3D (Blender or an AI image-to-3D tool as a starting point,
cleaned up by a 3D artist), rig and animate him, export glTF/GLB, and render
with react-three-fiber. Clothes become separate meshes attached to bones; the
room becomes a real 3D space the camera can orbit.

- Pros: full freedom — turn around, walk anywhere, any camera angle, true
  dress-up, a room you can decorate like *Pet Society*.
- Cons: the biggest investment by far (modelling, texturing, rigging,
  animation for 4 evolution stages); the brand team must re-approve a 3D
  Rocky; three.js adds roughly 150+ KB gzipped plus the model (typically
  1–5 MB per stage); needs WebGL — must be tested on the agents' actual PCs
  and inside Teams; accessibility and reduced-motion need extra care.
- Effort: several weeks of 3D art per stage plus ~4–6 weeks of engineering.

### D. Hybrid

Keep the 2.5D/Rive Rocky everywhere, and add one 3D surface — "Rocky's
room" — once option B proves engagement. Lets us test 3D where it matters
most without redoing every screen.

## Recommendation

1. **Now (done):** 2.5D world, care actions, closet with performance-based
   unlocks. Measure engagement (daily opens, care actions, check-in rate)
   with the admin console.
2. **Next:** option B. Ask the illustrator for a layered Rocky + walk/eat/
   wave poses, rig it in Rive, swap `RockyWorld`'s `<img>` for the Rive
   canvas behind the same props. The closet catalog, unlock rules, care
   system and anchors all stay.
3. **Later, if engagement justifies it:** option D, a 3D room.

## Things to decide with RLX

- Brand approval for Rocky in new poses / outfits (and for a 3D Rocky, if C).
- Who produces the art (internal design, agency, freelancer).
- Whether cosmetic progress (outfit, treats, hearts) should follow the agent
  across PCs — today it lives in the browser; moving it to the backend is a
  small API addition (`/api/closet`).
- Social features ("visit a teammate's Rocky", team room) — the ranking and
  team pages currently use demo data and would need real roster data first.
