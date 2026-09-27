# Asset repair notes (rocky-assets-v2 → integrated)

`rocky-assets-v2.zip` fixed v1's two known issues (flat opaque background,
loose crop) but introduced new defects in 8 of its 22 files: yellow-green
dithered smears on limbs (`advanced/worried`, `advanced/recovery`,
`young/happy`, `young/motivated`, `young/worried`), a stray straight line
(`advanced/recovery`, `young/recovery`), and floating disconnected
fragments (`elite/worried`). The design team could not produce a v3.

Since v1's own artwork has no floating fragments or dithered smears, the
8 affected files were rebuilt from v1 instead of v2, using image
processing only (no redraw, no generative fill):

1. **Background removal** — flood-filled the flat white background from
   the four corners (verified pure RGB 255,255,255, zero compression
   noise) and cleared it to transparent, with a short feathered ramp at
   the true edge so the character's own anti-aliasing looks natural.
2. **Rescale to match v2's crop** — v1's character occupies only ~19–36%
   of the 512×512 canvas; the other 14 (already-good) files from v2
   occupy ~85–88%. Each of the 8 files was cropped to its own bounding
   box, upscaled (alpha-premultiplied to avoid edge color fringing), and
   recentered so all 22 files now share the same fill ratio — otherwise
   Rocky would visibly change size switching between mood variants of the
   same evolution stage.
3. **Stray-pixel cleanup** — a connected-component pass keeps only the
   single largest opaque blob per image, discarding any small disconnected
   speck introduced by the resize step.

**Known remaining limitation:** v1's own source has a few small,
pre-existing marks of its own (confirmed at the raw pixel level, not an
artifact of this repair) — a faint mustard-colored patch on the limb in
`advanced/worried`, `advanced/recovery`, `young/worried`, and a very
faint thin vertical line in the three `recovery` poses. All are far
smaller and subtler than v2's defects (no floating fragments, no
canvas-height smears) and read as minor shading at the sizes Rocky is
displayed in-app (44–220px), but a pixel-perfect v3 sprite sheet would
still be worth requesting from the design team when they're able.
