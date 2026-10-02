# Official Rocky artwork

Marketing-approved assets delivered by the client. **Rocky's identity must not
change**: these files are used exactly as delivered — cut out of the original
sheets, never redrawn, recoloured, deformed or turned into new versions
(no evolutions, no 3D, no AI variations). Effects such as a white contour,
a glow, movement of the whole image, labels or emoji *around* Rocky are fine.

Original sheets: `docs/rocky-assets-source/official/sheets/`.
To add a new sheet: `python3 tools/slice-rocky-sheet.py SHEET COLS ROWS src/assets/rocky/official/poses name1 name2 …`,
then register the names in `src/components/rockyVisuals.ts` (`ROCKY_POSES`).

## puppet/ (preview, `?puppet=1`)
The A-pose (`docs/rocky-assets-source/official/sheets/a-pose.webp`) cut into
7 pieces by `tools/build-rocky-puppet.py` — tail, legs, arms, body, head —
for cut-out animation: pieces only turn at their joints (small angles) and
lift; at rest they rebuild the A-pose exactly. Off for everyone until
Marketing approves it.

## welcome/
| File | Used for |
|---|---|
| `welcome-wave.webp` | Sign-in page |

## poses/
| Pose | Sheet | Looks like | Used for |
|---|---|---|---|
| `thumbs-up-both` | 1 · work | Half body, two thumbs up | Thank you! |
| `pointing-up` | 1 · work | Index finger up | Lunch? |
| `thumbs-up` | 1 · work | One thumb up, hand on hip | **check-in reaction** |
| `arms-crossed` | 1 · work | Arms crossed | Monday… |
| `hand-truck` | 1 · work | Pushing a hand truck with boxes | BRB, On my way, On it! |
| `waving` | 1 · work | Waving, hand on hip | Good morning |
| `hello` | 2 · everyday | Big wave hello | Hi! |
| `cheering` | 2 · everyday | Fist pump, eyes closed | — |
| `thumbs-up-hip` | 2 · everyday | Thumbs up toward you | — |
| `thinking` | 2 · everyday | Hand on chin, "?" | — |
| `laptop` | 2 · everyday | Typing on an RLX laptop | Notes first! |
| `idea` | 2 · everyday | Wink, finger up, light bulb | Quick tip |
| `celebrating` | 3 · emotions | Jumping in confetti | **level-up reaction**, **evolution reaction**, Level up!, Party! |
| `love` | 3 · emotions | Hugging a big heart | Love it, Hug |
| `laughing` | 3 · emotions | Laughing and pointing | LOL |
| `nervous` | 3 · emotions | Sweat drop, worried | Oops |
| `determined` | 3 · emotions | Fists up, fired up | **recovery reaction**, On fire!, Let’s go! |
| `cool` | 3 · emotions | Sunglasses, thumbs up | Like a boss, Too cool |
| `jumping-joy` | 4 · moments | Jumping, both fists up | Yay! |
| `thumbs-up-sparkle` | 4 · moments | Two thumbs up with sparkles | **qa-pass reaction**, Nice notes! |
| `warning` | 4 · moments | Stop hand, warning sign | **alert reaction**, Wait! |
| `confused` | 4 · moments | Scratching head, blue "?" | Hmm… |
| `proud` | 4 · moments | Hands on hips, sparkles | Proud of you! |
| `sleeping` | 4 · moments | Asleep on the floor, Zzz | Good night |
| `fist-pump` | 5 · wins | Jumping fist pump | Friday! |
| `ok-wink` | 5 · wins | OK sign, wink, star | Got it! |
| `trophy` | 5 · wins | Holding a trophy in confetti | Congrats!, Winner! |
| `panic` | 5 · wins | Panicking, sweat drops | OMG, Help! |
| `sitting-laptop` | 5 · wins | Sitting with the RLX laptop | Focus mode |
| `yawning` | 5 · wins | Sitting, yawning | Coffee time |

Stickers' captions are drawn on top in a comic style (allowed by Marketing: letters and emoji may overlap Rocky).
