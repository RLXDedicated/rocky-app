from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, Preformatted
)

ROOT = Path(r"C:\Users\Asus\Desktop\rocky-local")
OUTPUT = ROOT / "output" / "pdf" / "Rocky_Project_Handoff_and_Teams_Pilot.pdf"

GREEN = colors.HexColor("#0F5132")
LIGHT_GREEN = colors.HexColor("#EAF4EE")
GOLD = colors.HexColor("#B87900")
INK = colors.HexColor("#1F2937")
MUTED = colors.HexColor("#5B6470")
LINE = colors.HexColor("#D9E1E5")
PALE = colors.HexColor("#F7F9FA")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="RockyTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=25, leading=30, textColor=GREEN, alignment=TA_LEFT, spaceAfter=14,
))
styles.add(ParagraphStyle(
    name="RockySubtitle", parent=styles["Normal"], fontName="Helvetica",
    fontSize=12, leading=17, textColor=MUTED, spaceAfter=16,
))
styles.add(ParagraphStyle(
    name="H1Rocky", parent=styles["Heading1"], fontName="Helvetica-Bold",
    fontSize=16, leading=20, textColor=GREEN, spaceBefore=10, spaceAfter=9,
))
styles.add(ParagraphStyle(
    name="H2Rocky", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=12, leading=15, textColor=INK, spaceBefore=9, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="BodyRocky", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.5, leading=14, textColor=INK, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="SmallRocky", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=8.2, leading=11, textColor=INK, spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="CalloutRocky", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=10, leading=14, textColor=GREEN, backColor=LIGHT_GREEN,
    borderColor=colors.HexColor("#CBE4D5"), borderWidth=0.6,
    borderPadding=9, spaceBefore=5, spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="CodeRocky", fontName="Courier", fontSize=7.6, leading=10,
    textColor=INK, backColor=PALE, borderColor=LINE, borderWidth=0.5,
    borderPadding=7, spaceAfter=8,
))

def p(text, style="BodyRocky"):
    return Paragraph(text, styles[style])

def bullet(text):
    return Paragraph(f"- {text}", styles["BodyRocky"])

def code(text):
    return Preformatted(text.strip(), styles["CodeRocky"])

def table(headers, rows, widths=None, small=True):
    style = styles["SmallRocky"] if small else styles["BodyRocky"]
    data = [[p(h, "SmallRocky") for h in headers]]
    data += [[p(str(cell), style.name) for cell in row] for row in rows]
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(doc.leftMargin, 0.52 * inch, LETTER[0] - doc.rightMargin, 0.52 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(doc.leftMargin, 0.34 * inch, "Rocky - Project Handoff and Teams Reminder Pilot")
    canvas.drawRightString(LETTER[0] - doc.rightMargin, 0.34 * inch, f"Page {doc.page}")
    canvas.restoreState()

story = []

# Cover
story += [Spacer(1, 0.55 * inch), p("ROCKY", "RockyTitle"),
          p("Project Handoff and Teams Reminder Pilot", "RockyTitle"),
          p("A practical continuation guide for another AI, developer, or product owner.", "RockySubtitle"),
          Spacer(1, 0.16 * inch),
          p("Current position: local product complete, backend persistence foundation complete, Teams notification pilot prepared but not yet connected.", "CalloutRocky"),
          p("Purpose", "H2Rocky"),
          p("This document records what exists, what is intentionally absent, which rules are non-negotiable, and the exact safe next steps. It is written so a new technical collaborator can continue without reinterpreting Rocky's product logic."),
          Spacer(1, 0.14 * inch),
          table(["Area", "Last validated state"], [
              ["Local MVP", "DEMO READY"],
              ["Architecture blueprint", "ARCHITECTURE READY"],
              ["Backend API", "BACKEND FOUNDATION READY"],
              ["Durable local persistence", "PERSISTENCE FOUNDATION READY"],
              ["Teams reminder pilot", "List prepared; no live flow or messages"],
          ], [2.1 * inch, 4.65 * inch]),
          Spacer(1, 0.22 * inch),
          p("Important safety note", "H2Rocky"),
          p("This PDF intentionally contains no corporate email addresses, no private SharePoint link, no credentials, and no real employee data."),
          PageBreak()]

# Executive brief
story += [p("1. Executive brief", "H1Rocky"),
          p("Rocky is a friendly RLX documentation companion. It encourages a consistent documentation habit using check-ins, QA feedback, recovery messaging, progression, and contextual reminders. Rocky is a friendly 2.5D bison with green RLX clothing. He must never become aggressive, threatening, sad, or punitive."),
          p("The product was built locally first. The local frontend remains fully operational with localStorage. A separate Node.js backend now exposes the same Game Engine through a clean API boundary and durable local SQLite persistence. The frontend has not been migrated to the backend."),
          p("The current business priority has shifted: Teams reminders are considered the core value proposition. Visual polish, leaderboard expansion, and broad enterprise integration are secondary to proving whether individualized, contextual Teams reminders improve the documentation habit."),
          p("The next implementation should be a conservative Power Automate pilot. It must begin in test mode, must target no active users, and must not duplicate Game Engine rules in Power Automate."),
          p("What is already proven", "H2Rocky"),
          table(["Capability", "Status"], [
              ["Game mechanics", "Implemented, tested, deterministic, replayable, and idempotent."],
              ["Rocky assets", "Approved evolution x mood assets and reactions integrated."],
              ["Frontend", "Local React MVP works without external services."],
              ["Backend", "Express API with DTO validation, dev-only identity, durable SQLite option."],
              ["Pilot roster", "Private Microsoft List prepared with 57 test agents, all inactive."],
          ], [2.0 * inch, 4.75 * inch]),
          PageBreak()]

# Scope and project timeline
story += [p("2. Project scope and delivery history", "H1Rocky"),
          table(["Phase", "Delivered outcome"], [
              ["1-4", "Local Rocky experience, check-in, QA feedback, mood/recovery, achievements, levels, evolution."],
              ["5-8", "Individual leaderboard, Team Rocky, reminders simulator, onboarding, polish, accessibility, demo/reset flows."],
              ["9-10", "Deterministic engine hardening, replay, idempotency, localStorage recovery, full QA and demo readiness review."],
              ["11", "Production architecture blueprint, ownership, API, security, and migration documentation."],
              ["12", "Express backend foundation exposing the existing Game Engine through DTOs and application services."],
              ["13", "Durable local SQLite persistence, migrations, transactions, persistent idempotency, multi-agent tests."],
              ["Current", "Teams notification pilot preparation using a private Microsoft List. No live notification flow is confirmed."],
          ], [0.8 * inch, 5.95 * inch]),
          p("Explicitly not implemented", "H2Rocky"),
          bullet("Azure, Azure Functions, App Service, Static Web Apps, Microsoft Graph, Teams SDK, Entra ID, authentication, production database, deployment pipeline, or real QA integration."),
          bullet("Frontend migration from localStorage to the backend API."),
          bullet("A live Power Automate flow that sends Teams messages."),
          bullet("Any mechanism that gives Power Automate authority over XP, Energy, streak, mood, level, evolution, or achievements."),
          p("Core product principle", "H2Rocky"),
          code("LOCAL MVP = product validation\nGAME ENGINE = business truth\nROCKY WEB APP = user experience\nAPI = application boundary\nREPOSITORY = data boundary\nQA = event producer\nPOWER AUTOMATE = orchestration\nTEAMS = delivery / entry point"),
          PageBreak()]

# Repository map
story += [p("3. Repository map", "H1Rocky"),
          p("Workspace root: C:\\Users\\Asus\\Desktop\\rocky-local"),
          code("rocky-local/\n  src/                       React local MVP\n    engine/                  Pure game rules and configuration\n    services/                Frontend application services\n    repository/              localStorage repository and sanitization\n    components/              Home, RockyAvatar, QA, leaderboard, team, reminders\n    assets/rocky/            Approved Rocky images\n  backend/                   Express API and durable local persistence\n    src/api/                 Routes, DTOs, middleware\n    src/application/         Orchestration services\n    src/domain/              Engine integration boundary\n    src/infrastructure/      SQLite, repositories, idempotency\n    tests/                   Backend API and persistence tests\n  docs/                      Architecture and migration documentation\n  ARCHITECTURE.md            Current layered architecture\n  DOMAIN_RULES.md            Authoritative business rules\n  DATA_MODEL.md              Domain and persistence model\n  README.md                  Setup and project overview"),
          p("Most important files to read first", "H2Rocky"),
          table(["File", "Why it matters"], [
              ["DOMAIN_RULES.md", "Approved XP, Energy, mood, streak, level, evolution, achievement, and reminder rules."],
              ["ARCHITECTURE.md", "UI -> services -> engine -> repository boundaries."],
              ["DATA_MODEL.md", "Agent, GameState, GameEvent, achievements, reminders, teams."],
              ["docs/PERSISTENCE_FOUNDATION.md", "SQLite design, transactions, idempotency, replay, limitations."],
              ["docs/BACKEND_FOUNDATION.md", "API structure, DTOs, development identity, endpoints, tests."],
              ["docs/PRODUCTION_ARCHITECTURE.md", "Target architecture and non-negotiable Microsoft 365 boundaries."],
              ["docs/MIGRATION_PLAN.md", "Staged direction and known dependencies."],
          ], [2.15 * inch, 4.6 * inch]),
          PageBreak()]

# Architecture
story += [p("4. Current architecture", "H1Rocky"),
          p("The same platform-independent Game Engine is used by the local frontend and the backend. No controller, repository, or Teams surface should calculate game rules."),
          code("LOCAL FRONTEND\nReact UI\n  ↓\nFrontend application services\n  ↓\nPure Game Engine\n  ↓\nRepository interface\n  ↓\nlocalStorage\n\nLOCAL BACKEND\nExpress routes / DTOs\n  ↓\nApplication services\n  ↓\nSame Game Engine\n  ↓\nRepositoryStore + IdempotencyPort\n  ↓\nSQLite local durable store (or in-memory test store)"),
          p("Required boundary rules", "H2Rocky"),
          bullet("React components render state and call services. They do not implement XP, mood, streak, level, or reminder eligibility."),
          bullet("The Game Engine is pure. It must not depend on React, browser APIs, localStorage, SQLite, Teams, SharePoint, or Power Automate."),
          bullet("Repositories persist and retrieve data. They do not calculate game outcomes."),
          bullet("QA creates domain events. QA never directly edits XP, Energy, Level, Streak, Mood, Evolution, or Achievements."),
          bullet("Power Automate may schedule, call an approved boundary, and deliver a result. It must not become a second Game Engine."),
          p("Clock and configuration", "H2Rocky"),
          p("Time is abstracted through a Clock so tests can be deterministic. Approved values are centralized in GAME_CONFIG. Do not duplicate thresholds in UI, flows, controllers, or repositories."),
          PageBreak()]

# Game rules
story += [p("5. Non-negotiable game rules", "H1Rocky"),
          p("Use DOMAIN_RULES.md as the authoritative source. The following is the required condensed reference."),
          table(["Action", "Effect"], [
              ["Check-in", "+10 XP, +5 Energy. One valid reward per calendar day."],
              ["QA Pass", "+25 XP, +10 Energy. Does not require a Check-in first."],
              ["Documentation Alert", "-20 Energy, capped at -40 total per calendar day. Breaks Current Streak."],
              ["Alert protections", "Never reduces XP, Level, achievements, evolution, or Best Streak."],
              ["Streak milestone", "XP only. No Energy reward."],
              ["First Check-in achievement", "+25 XP, one time."],
              ["First QA Pass / Getting Started", "One achievement, +25 XP, one time. Never create a duplicate second achievement."],
          ], [2.1 * inch, 4.65 * inch]),
          p("Mood", "H2Rocky"),
          table(["State", "Approved rule"], [
              ["Happy", "Energy >= 70 and Current Streak >= 7."],
              ["Motivated", "Energy >= 40 and Current Streak >= 3."],
              ["Worried", "Energy < 40 or Current Streak = 0. Streak 1-2 remains Worried while the habit forms."],
              ["Recovery", "A Documentation Alert occurred and a later Check-in or QA Pass is positive. It fades through the existing recovery window."],
          ], [1.45 * inch, 5.3 * inch]),
          p("Levels and evolution", "H2Rocky"),
          p("Level thresholds are permanent. Level 1 begins at 0 XP. Level 10 begins at 2,700 XP. Level 20 begins at 10,450 XP. Evolution is Baby at Level 1, Young at Level 5, Advanced at Level 10, and Elite at Level 20. Evolution never moves backward."),
          PageBreak()]

# events
story += [p("6. Events, replay, corrections, and idempotency", "H1Rocky"),
          p("Events are the progression source of truth. Derived state can be reconstructed by replaying ordered events. Persisted GameState is a useful cache, not permission to alter history."),
          code("GameEvent\n  id\n  type\n  agentId\n  occurredAt / timestamp\n  payload\n  metadata / version when required\n\nEvent types\n  CHECK_IN\n  QA_PASS\n  DOCUMENTATION_ALERT\n  STREAK_MILESTONE\n  LEVEL_UP\n  EVOLUTION\n  ACHIEVEMENT\n  CORRECTION"),
          p("Correction rule", "H2Rocky"),
          p("Never edit a historical event. A correction creates a new CORRECTION event referencing the original event. Replay produces the corrected state. This supports both PASS -> ALERT and ALERT -> PASS scenarios."),
          p("Idempotency protections", "H2Rocky"),
          bullet("Repeated Check-in on the same day is a no-op."),
          bullet("Repository saves dedupe event, achievement, and reminder IDs."),
          bullet("Replay dedupes by stable event ID and preserves creation order when timestamps tie."),
          bullet("Backend QA endpoints honor Idempotency-Key. Same key with a different payload returns conflict instead of mutating state."),
          bullet("SQLite persists idempotency records, so retries after backend restart stay safe."),
          PageBreak()]

# UI/asset
story += [p("7. Frontend experience and Rocky visual contract", "H1Rocky"),
          p("The frontend remains a local MVP. It launches independently and persists its own local state in browser localStorage. Do not connect it to the API unless a new approved phase explicitly authorizes that migration."),
          table(["Screen", "Purpose"], [
              ["Home", "Rocky is visually dominant; Level, XP, Energy, Current/Best Streak, Check-in, activity."],
              ["Achievements", "Unlocked and locked progress with requirements."],
              ["Leaderboard", "Positive individual comparison. No public QA failures."],
              ["Team / Team Leaderboard", "Aggregated, normalized team performance. Individual alerts do not directly punish Team Rocky."],
              ["QA Simulator", "QA/dev tool, not normal agent mode."],
              ["Developer Controls", "Development only. Never expose in production agent mode."],
              ["RockyReminder", "Compact local reminder UI and action flow."],
          ], [1.75 * inch, 5.0 * inch]),
          p("Rocky asset contract", "H2Rocky"),
          bullet("Approved image resolver uses independent evolutionStage + mood dimensions."),
          bullet("There are 16 primary combinations: Baby/Young/Advanced/Elite x Happy/Motivated/Worried/Recovery."),
          bullet("Temporary reactions exist for Check-in, QA Pass, Alert, Level Up, Evolution, and Recovery. Reactions never permanently replace the calculated state asset."),
          bullet("Rocky stays friendly, happy-looking, approachable, green RLX-branded, and workplace appropriate in every state."),
          PageBreak()]

# Backend
story += [p("8. Backend and durable local persistence", "H1Rocky"),
          p("The backend is intentionally small: Node.js, TypeScript, Express, DTO validation, application services, existing Game Engine, repository contracts, and durable local SQLite. It is not deployed and does not authenticate real users."),
          p("API surface", "H2Rocky"),
          code("GET  /health\nGET  /api/agent/me\nGET  /api/game-state\nPOST /api/events/check-in\nPOST /api/events/qa-pass\nPOST /api/events/documentation-alert\nPOST /api/events/correction\nGET  /api/achievements\nGET  /api/leaderboard\nGET  /api/team\nGET  /api/team-leaderboard\nGET  /api/reminders\nPOST /api/reminders/:id/opened\nPOST /api/reminders/:id/acted\nPOST /api/reminders/:id/dismissed"),
          p("SQLite foundation", "H2Rocky"),
          bullet("Uses Node's built-in node:sqlite, with a local configurable database path."),
          bullet("Schema includes agents, game state, immutable events, achievements, reminders, teams, idempotency records, and schema migrations."),
          bullet("Critical writes use local transactions. A Check-in, QA Pass, Alert, or Correction cannot silently persist only half its event/state changes."),
          bullet("Production guards reject unsafe combinations such as production plus in-memory persistence or development identity."),
          p("Known backend limitation", "H2Rocky"),
          p("Some legacy leaderboard/team display bookkeeping still uses a server-side localStorage-shaped shim because those frontend services have not yet been fully ported. This does not replace the authoritative GameState/event persistence, but it should be addressed before a real multi-user production rollout."),
          PageBreak()]

# Tests
story += [p("9. Validation and run commands", "H1Rocky"),
          table(["Area", "Last confirmed result"], [
              ["Frontend tests", "262/262 passing."],
              ["Backend tests", "78/78 passing."],
              ["Frontend type-check", "Clean."],
              ["Backend type-check", "Clean."],
              ["Frontend build", "Successful."],
              ["Backend build", "Successful."],
          ], [2.0 * inch, 4.75 * inch]),
          p("Commands", "H2Rocky"),
          code("# From C:\\Users\\Asus\\Desktop\\rocky-local\nnpm test\nnpx tsc -b\nnpm run build\n\n# Backend\ncd backend\nnpm test\nnpm run build\nnpm run dev"),
          p("Test coverage includes", "H2Rocky"),
          bullet("XP, Energy boundaries, streaks, mood, recovery, evolution, achievements, milestones, reminders, leaderboard, Team Rocky, reset flows, and local persistence."),
          bullet("Replay, corrections, corrupted storage protection, duplicate events, StrictMode-like duplicate invocation, and deterministic demo behavior."),
          bullet("Backend API validation, incorrect client-controlled state attempts, persistence after restart, transactions, failures, concurrency, multi-agent isolation, and idempotency conflicts."),
          PageBreak()]

# Teams pilot
story += [p("10. Teams reminder pilot - current state", "H1Rocky"),
          p("The business decision is to prioritize individual Teams reminders. The intended recipient is each agent's private Teams chat, identified by their corporate email. A Team channel or group is not required for personal reminders."),
          p("Private pilot list", "H2Rocky"),
          table(["Item", "Current state"], [
              ["List", "A private Microsoft List named Rocky Teams Reminder Pilot exists."],
              ["Roster", "57 valid corporate email records were loaded from the supplied roster. Do not commit the roster or import files to Git."],
              ["Active", "All records are explicitly No."],
              ["PilotStatus", "All records are Test."],
              ["Counters", "RemindersToday and IgnoredReminderCount are 0."],
              ["Dates", "LastReminderAt and LastInteractionAt are empty."],
              ["Live messages", "None sent."],
              ["Power Automate flow", "No completed/configured flow has been confirmed."],
          ], [1.85 * inch, 4.9 * inch]),
          p("List columns", "H2Rocky"),
          code("AgentName\nTeamsEmail\nActive\nPilotStatus\nLastReminderAt\nRemindersToday\nLastInteractionAt\nIgnoredReminderCount\n\nTitle is the default Microsoft Lists column. It is unused and may be hidden from the view."),
          p("Do not populate the date columns manually", "CalloutRocky"),
          p("Empty dates mean that no reminder was sent and no interaction occurred. Setting arbitrary historical dates destroys that distinction."),
          PageBreak()]

# Pilot next steps
story += [p("11. Safe continuation: Power Automate test flow", "H1Rocky"),
          p("Build incrementally. Do not add a Teams send action until the selection and logging behavior is verified with no active agents."),
          p("Step 1 - create the evaluator", "H2Rocky"),
          bullet("Create a Scheduled cloud flow named Rocky - Reminder Evaluator (Test)."),
          bullet("Run every 30 minutes. Confirm the timezone that matches the pilot population before enabling any delivery."),
          bullet("Read the private Microsoft List."),
          bullet("Filter eligibility to Active = Yes and PilotStatus = Test."),
          bullet("With the current list this must return zero recipients."),
          p("Step 2 - add safe eligibility gates", "H2Rocky"),
          table(["Rule", "Pilot behavior"], [
              ["Working window", "Monday-Friday, 08:00-18:00 in the approved pilot timezone."],
              ["Daily frequency", "Maximum four reminder opportunities per agent per working day."],
              ["Cooldown", "No reminder within 90 minutes of LastReminderAt."],
              ["Positive interaction", "Suppress shortly after LastInteractionAt."],
              ["Ignored reminders", "After three ignored reminders, use a longer cooldown."],
              ["Test mode", "Do not send while Active is No. Start with one explicitly approved agent only."],
          ], [1.7 * inch, 5.05 * inch]),
          p("Step 3 - delivery validation", "H2Rocky"),
          bullet("Activate exactly one approved pilot agent only after the evaluator's no-send behavior is confirmed."),
          bullet("Use a compact individual Teams card with a neutral test message first."),
          bullet("Record LastReminderAt and increment RemindersToday only after a confirmed delivery action."),
          bullet("Do not use a group/chat channel for personal reminders."),
          PageBreak()]

# Do / don't + migration
story += [p("12. Guardrails for the next AI or developer", "H1Rocky"),
          p("Do", "H2Rocky"),
          bullet("Read DOMAIN_RULES.md, ARCHITECTURE.md, DATA_MODEL.md, and the backend/persistence documentation before changing code."),
          bullet("Keep Game Engine rules pure and centralized in GAME_CONFIG."),
          bullet("Use the existing repository and API boundaries; add tests for every discovered behavior gap."),
          bullet("Treat Microsoft List as a pilot control and delivery log, not automatically as the permanent GameState repository."),
          bullet("Keep Teams delivery individual, contextual, concise, optional, and non-punitive."),
          bullet("Keep roster files, corporate emails, private SharePoint links, credentials, and connection tokens outside Git."),
          p("Do not", "H2Rocky"),
          bullet("Do not change XP, Energy, streak, mood, level, evolution, achievements, reminder priorities, leaderboard rules, or Team Score without explicit product approval."),
          bullet("Do not move game calculations into React, Express routes, SQLite, SharePoint formulas, or Power Automate expressions."),
          bullet("Do not send reminders to all 57 people at once. Validate with one opted-in test agent."),
          bullet("Do not expose QA failures, alert counts, or punitive information in Teams or leaderboard surfaces."),
          bullet("Do not introduce Azure, Graph, Teams SDK, authentication, real QA data, or production deployment without an approved phase."),
          p("Recommended migration order", "H2Rocky"),
          code("1. Power Automate evaluator in test mode\n2. One-agent individual Teams delivery test\n3. Validate cooldown, frequency, and logging\n4. Decide how Power Automate requests contextual state from the backend\n5. Add authenticated identity mapping only after pilot evidence supports it\n6. Migrate the frontend repository only in a separately approved phase"),
          PageBreak()]

# Final checklist
story += [p("13. Continuation checklist", "H1Rocky"),
          table(["Before proceeding", "Required confirmation"], [
              ["Timezone", "Which working timezone governs the pilot agents?"],
              ["Flow ownership", "Who owns the Power Automate connection and can maintain it?"],
              ["One-agent test", "Which opted-in test agent may receive the first private message?"],
              ["Message method", "Which Teams action is available in the tenant for an individual chat/card?"],
              ["Logging", "Where will delivery/open/acted/dismissed results be stored in the pilot list?"],
              ["Escalation", "Who pauses the flow if delivery behavior is incorrect?"],
          ], [2.1 * inch, 4.65 * inch]),
          p("Final status", "H2Rocky"),
          p("Rocky is ready to continue as a controlled Teams-notification pilot. The core product and backend foundations are in place. The next work is orchestration and pilot validation, not a rewrite of the Game Engine or a broad production deployment.", "CalloutRocky"),
          p("Handoff note", "H2Rocky"),
          p("If a new AI takes over, provide this PDF plus access to the workspace. Ask it to begin with the documents listed in Section 3, inspect the actual repository before editing, and preserve the guardrails in Section 12.")]

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(
    str(OUTPUT), pagesize=LETTER,
    rightMargin=0.65 * inch, leftMargin=0.65 * inch,
    topMargin=0.65 * inch, bottomMargin=0.72 * inch,
    title="Rocky Project Handoff and Teams Reminder Pilot",
    author="Rocky project team",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
