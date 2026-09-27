# Rocky 2.5D Assets v1

These PNG assets were extracted from the approved Rocky 2.5D asset sheet.

## Structure

rocky/
  baby/
    happy.png
    motivated.png
    worried.png
    recovery.png
  young/
    happy.png
    motivated.png
    worried.png
    recovery.png
  advanced/
    happy.png
    motivated.png
    worried.png
    recovery.png
  elite/
    happy.png
    motivated.png
    worried.png
    recovery.png
  reactions/
    check-in.png
    qa-pass.png
    alert.png
    level-up.png
    evolution.png
    recovery.png

## Integration rule

Use evolution + mood to select the primary Rocky asset:

- baby: happy | motivated | worried | recovery
- young: happy | motivated | worried | recovery
- advanced: happy | motivated | worried | recovery
- elite: happy | motivated | worried | recovery

Reaction assets are universal and can be used for transient event animations.

Do not generate a replacement Rocky in CSS/SVG/emoji. These assets are the visual source of truth for the local MVP.

Note: the assets are extracted crops from the approved sheet, so the next visual pass should preserve their proportions and identity rather than redraw them.
