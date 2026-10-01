# Official Rocky artwork

Marketing-approved assets delivered by the client. **Rocky's identity must not
change**: these files are used exactly as delivered — cut out of the original
sheets, never redrawn, recoloured, deformed or turned into new versions
(no evolutions, no 3D, no AI variations). Effects such as a white contour,
a glow, movement of the whole image, labels or emoji *around* Rocky are fine.

Original sheets: `docs/rocky-assets-source/official/sheets/`.
To add a new sheet: `python3 tools/slice-rocky-sheet.py SHEET COLS ROWS src/assets/rocky/official/poses name1 name2 …`,
then register the names in `src/components/rockyVisuals.ts` (`ROCKY_POSES`).

## welcome/
| File | Used for |
|---|---|
| `welcome-wave.webp` | Sign-in page |

## poses/
| Pose | Sheet | Looks like | Used for |
|---|---|---|---|
| `thumbs-up-both` | 1 · work | Half body, two thumbs up | Thank you! |
| `pointing-up` | 1 · work | Index finger up | Lunch? |
| `thumbs-up` | 1 · work | One thumb up, hand on hip | Check-in reaction, Nice notes! |
| `arms-crossed` | 1 · work | Arms crossed | Monday… |
| `hand-truck` | 1 · work | Pushing a hand truck with boxes | BRB, On my way, On it! |
| `waving` | 1 · work | Waving, hand on hip | Good morning |
| `hello` | 2 · everyday | Big wave hello | Hi!, Good night |
| `cheering` | 2 · everyday | Fist pump, eyes closed | QA pass reaction, Yay!, Congrats! |
| `thumbs-up-hip` | 2 · everyday | Thumbs up toward you | Got it! |
| `thinking` | 2 · everyday | Hand on chin, "?" | Alert reaction, Hmm…, Help! |
| `laptop` | 2 · everyday | Typing on an RLX laptop | Notes first!, Focus mode, Coffee time |
| `idea` | 2 · everyday | Wink, finger up, light bulb | Quick tip |
| `celebrating` | 3 · emotions | Jumping in confetti | Level-up reaction, Level up!, Party!, Friday! |
| `love` | 3 · emotions | Hugging a big heart | Love it, Hug |
| `laughing` | 3 · emotions | Laughing and pointing | LOL |
| `nervous` | 3 · emotions | Sweat drop, worried | Oops, OMG |
| `determined` | 3 · emotions | Fists up, fired up | Recovery reaction, On fire!, Let’s go! |
| `cool` | 3 · emotions | Sunglasses, thumbs up | Like a boss, Too cool |
