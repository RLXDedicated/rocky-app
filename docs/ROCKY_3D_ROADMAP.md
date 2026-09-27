# Rocky: from 2.5D to an interactive pet (and maybe 3D)

Status: proposal · Owner: RLX QA (Anibal Pereira) · Last updated: 2026-09-27

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
