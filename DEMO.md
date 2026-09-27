# Demo Script — Rocky Local MVP

A deterministic, ~5–10 minute walkthrough for RLX stakeholders. Every step
produces the same result every time it's run from a clean state — nothing
here depends on random chance (message wording may vary within a category,
but every number does not).

## Before you start

1. Open the app. If it isn't a brand-new browser, go to **Dev Controls**
   (visible once **QA Tools** is turned on, bottom-left corner) and click
   **Reset All Data** to guarantee a true first-run state, or **Reset Demo**
   if you just want fresh gameplay progress without redoing onboarding.
2. Turn on **QA Tools** (bottom-left corner button) — this reveals the **QA
   Simulator** and **Dev Controls** tabs used later in the script. These are
   internal tools, clearly separated from the agent's normal navigation
   (dashed amber border) — call that out to stakeholders as you reveal it.

## Script

### 1. New Agent → Meet Rocky (30 seconds)

- Land on the onboarding screen: Rocky, a one-line pitch, **MEET ROCKY**.
- Click it → **Choose Rocky's name** (defaults to "Rocky"). Accept the
  default or type a name, then **LET'S GO**.
- **Talking point:** the whole first-run experience is two taps, under 30
  seconds — this is deliberately not a long onboarding funnel.

### 2. Check-in (Home)

- Click **CHECK IN WITH ROCKY**.
- **Show:** XP goes to 35 (10 base + 25 "First Step" achievement — the
  agent's very first Check-in also unlocks an achievement), Energy 75
  ("Good"), Current Streak 1, Best Streak 1, and an activity feed entry.
- **Talking point:** streaks, XP, and achievements are all driven by one
  Game Engine — nothing here is faked for the demo.

### 3. Simulate QA Pass (QA Simulator tab)

- Click **Simulate QA Pass**.
- **Show:** +25 XP (base) + 25 XP ("Getting Started" achievement, first QA
  Pass) = XP now 85. Energy +10 → 85.
- **Talking point:** QA Simulator is explicitly labeled as an internal
  tool ("not part of the agent experience") — in the real product this
  audit result would come from the actual documentation QA pipeline, not a
  button.

### 4. Progress to Level 5 (Dev Controls tab)

- Click **Trigger Level 5**.
- **Show:** Level jumps 1 → 5 in one step (a single LEVEL_UP event can span
  multiple thresholds; this dev control sets XP to at least Level 5's
  700-XP floor, so XP jumps 85 → 700), Rocky evolves **Baby → Young Rocky**,
  both a Level Up and an Evolution activity entry appear.
- **Talking point:** Evolution is milestone-based (Level 1/5/10/20 → Baby/
  Young/Advanced/Elite) and is permanent — it never regresses, even later
  when we trigger an Alert.

### 5. Individual Leaderboard

- Open the **Leaderboard** tab.
- **Show:** the agent's own row highlighted ("YOU"), ranked among 4
  fictitious teammates by Level → XP → Streak → Best Streak, with "You're
  N XP away from #—" framing.
- **Talking point:** no QA failure counts or punitive data ever appear
  here — ranking is entirely about progress and consistency.

### 6. Team Rocky

- Open the **Team** tab.
- **Show:** Team Alpha's own Team Rocky, Team Score, and the 5 normalized
  metrics (Participation / Average Streak / QA Pass Performance /
  Improvement / Engagement) — never a raw sum of members' XP.
- **Talking point:** a smaller team isn't penalized for having fewer
  people — Team Charlie (visible on the Team Leaderboard) has one member
  and can still rank #1 on the strength of that member's consistency.

### 7. Team Leaderboard

- Open **Team Leaderboard** to show all three fictitious teams ranked by
  the same normalized Team Score.

### 8. Documentation Alert (QA Simulator tab)

- Click **Simulate Documentation Alert**.
- **Show:** XP unchanged (still 700), Level unchanged (still 5), Evolution
  unchanged (still Young Rocky), Energy -20, Current Streak resets to 0,
  Best Streak untouched.
- **Talking point:** this is the core design principle — a Documentation
  Alert costs Energy and breaks the current streak, but it never erases
  progress. Rocky's reaction is "let's tackle it together," never blame.

### 9. Recovery

- Still in QA Simulator, click **Simulate QA Pass** again (any positive
  action after an Alert triggers Recovery).
- **Show:** Mood changes **Worried → Recovery** in the diff panel. Go to
  **Home** to show Rocky's Recovery visual (a small green sparkle, soft
  determined expression) and the "Good comeback" messaging.

### 10. Reminder

- Open **Dev Controls** → click any **Trigger \_\_\_ Reminder** button
  (Streak or Documentation reads best after the above sequence).
- **Show:** the compact toast in the corner with Rocky, a category badge,
  a contextual message, and (for actionable categories) a **CHECK IN WITH
  ROCKY** button that calls the exact same Check-in flow as Home — a
  reminder never grants XP by itself.

### 11. Reset Demo → clean Home

- Open **Dev Controls** → click **Reset Demo**.
- **Show:** back on Home, Baby Rocky, Level 1, 0 XP, no streak — a clean
  slate, with Rocky's chosen name and QA Tools setting both still intact.
- **Close on Home** — the agent's actual day-to-day screen.

## What NOT to show live

- Dev Controls' Level/Evolution/reminder triggers are clearly narrated as
  "standing in for weeks of real usage," not part of what an agent sees.
- Don't leave **QA Tools** on when handing the browser to a stakeholder to
  click around themselves — turn it back off so they see exactly the Agent
  Mode experience (Home / Achievements / Leaderboard / Team / Team
  Leaderboard, nothing else).
