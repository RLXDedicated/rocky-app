# Claude Code — Rocky 2.5D Asset Integration

## Objective

Replace the current placeholder/generic Rocky visuals in the local MVP with the approved Rocky 2.5D assets contained in this package.

## Non-negotiable rules

1. These assets are the visual source of truth. Do NOT redraw Rocky.
2. Do NOT replace Rocky with CSS illustrations, SVG approximations, emoji, icons, or generated placeholders.
3. Do NOT change the Game Engine business rules.
4. Preserve XP, Energy, Streak, Mood, Level, Evolution, Achievements, Reminders, Leaderboards and Team Rocky behavior exactly as implemented.
5. Rocky must remain a friendly, happy-looking bison even in Worried, Recovery, Level 10 and Level 20 states.
6. Preserve the RLX green vest and the established 2.5D identity.
7. Evolution and Mood are separate dimensions.

## Asset mapping

Primary Rocky visual:
    /rocky/{evolution}/{mood}.png

Evolutions:
    baby
    young
    advanced
    elite

Moods:
    happy
    motivated
    worried
    recovery

Universal reactions:
    /rocky/reactions/check-in.png
    /rocky/reactions/qa-pass.png
    /rocky/reactions/alert.png
    /rocky/reactions/level-up.png
    /rocky/reactions/evolution.png
    /rocky/reactions/recovery.png

## Required behavior

Resolve the primary asset from:
    currentEvolutionStage + currentMood

Examples:
    advanced + happy -> rocky/advanced/happy.png
    advanced + worried -> rocky/advanced/worried.png
    elite + recovery -> rocky/elite/recovery.png

Use reaction assets only for transient event/reaction presentation.

## UI requirements

Rocky should be visually prominent on Home.

Review:
- Home
- Onboarding
- QA Simulator
- Leaderboard
- Team
- Team Leaderboard
- Reminder/toast
- Level-up presentation
- Evolution presentation
- Recovery presentation

Do not perform a broad visual redesign. Improve only what is necessary to make the approved Rocky assets feel native and intentional in the existing UI.

## Technical requirements

- Keep the existing visual asset abstraction if it already exists.
- Replace asset keys/paths through configuration rather than scattering paths throughout components.
- Keep the system easy to migrate later to production hosting/CDN.
- Preserve accessibility labels.
- Preserve reduced-motion behavior.
- Avoid layout shift when Rocky changes state.
- Keep assets responsive and visually centered.
- Do not store duplicate copies of the same asset under different names unless technically necessary.

## Validation

After integration:

1. Run all tests.
2. Run type-check.
3. Run production build.
4. Verify all 16 evolution/mood combinations.
5. Verify all 6 reaction assets.
6. Verify Level 1, 5, 10 and 20.
7. Verify Happy, Motivated, Worried and Recovery.
8. Verify Check-in, QA Pass, Alert, Level Up, Evolution and Recovery reactions.
9. Verify refresh persistence.
10. Verify no horizontal overflow at 375, 700, 1024, 1280 and 1440 px.
11. Verify prefers-reduced-motion.
12. Confirm no generic/placeholder Rocky remains anywhere in the application.

## Completion report

Report:
- files changed
- asset mapping implemented
- screens reviewed
- tests before/after
- type-check
- build
- any visual limitations caused by the source crops
- confirmation that game mechanics were not changed
