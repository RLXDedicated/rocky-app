import { useEffect, useState } from "react";
import styles from "./App.module.css";
import { Achievements } from "./components/Achievements";
import { AdminConsole } from "./components/admin/AdminConsole";
import { DevControls } from "./components/DevControls";
import { Home } from "./components/Home";
import { NavIcon, type NavIconName } from "./components/NavIcon";
import { Friends } from "./components/Friends";
import { Arcade } from "./components/Arcade";
import { Chat } from "./components/chat/Chat";
import { NameBadges } from "./components/TitleBadge";
import { MyTeam } from "./components/MyTeam";
import { refreshMyRole, useMyRole } from "./services/myRole";
import { getAgentRole } from "./services/identityService";
import { startChatBadge, useChatUnread } from "./components/chat/chatState";
import { live, useLiveEvent } from "./services/liveClient";
import { Leaderboard } from "./components/Leaderboard";
import { Onboarding } from "./components/Onboarding";
import { Progress } from "./components/Progress";
import { NotesGame } from "./components/NotesGame";
import { QASimulator } from "./components/QASimulator";
import { ReminderHost } from "./components/ReminderHost";
import { TeamLeaderboard } from "./components/TeamLeaderboard";
import { TeamPage } from "./components/TeamPage";
import {
  apiClient,
  isBackendConfigured,
  isRemoteModeEnabled,
} from "./services/apiClient";
import { Login } from "./components/Login";
import {
  endSession,
  getAgentEmail,
  getSessionToken,
} from "./services/identityService";
import { isLoginRequired } from "./services/remoteSync";
import { repository } from "./repository/localStorageRepository";
import { isQaModeEnabled, setQaModeEnabled } from "./services/appModeService";
import { isQaStaff } from "./services/identityService";
import { hasCompletedOnboarding } from "./services/onboardingService";

type View =
  | "home"
  | "progress"
  | "notes"
  | "arcade"
  | "chat"
  | "my-team"
  | "friends"
  | "qa-simulator"
  | "admin"
  | "achievements"
  | "leaderboard"
  | "team"
  | "team-leaderboard"
  | "dev-controls";

// Agent Mode (the everyday experience) vs QA Mode (Phase 8 §23-24): QA
// Simulator is an internal testing tool, not part of what an agent normally
// sees, so it's opt-in and clearly labeled rather than sitting in the main
// nav by default. Developer Controls stay additionally gated to dev builds
// regardless of this toggle.
//
// The toggle itself is only offered to QA staff — agents whose address the
// backend lists in ROCKY_ADMIN_EMAILS (see identityService.isQaStaff) — or
// in a dev build. A regular pilot agent never sees QA Tools, even if an old
// browser still has the toggle switched on in localStorage.
function App() {
  const [view, setView] = useState<View>("home");
  // With a backend, every agent signs in (email + PIN) so their Rocky loads
  // from the server on any device — never a fresh local-only Rocky.
  const [needsLogin, setNeedsLogin] = useState(
    () => isBackendConfigured() && (!getAgentEmail() || isLoginRequired()),
  );
  const [loginNotice, setLoginNotice] = useState<string | undefined>(() =>
    isLoginRequired()
      ? "Please sign in to keep your progress in sync."
      : undefined,
  );
  const [onboarded, setOnboarded] = useState(() => hasCompletedOnboarding());
  const [staff] = useState(() => isQaStaff());
  const canUseQaTools = staff || import.meta.env.DEV;
  const canUseAdmin = staff && isRemoteModeEnabled();
  const [qaModeSetting, setQaMode] = useState(() => isQaModeEnabled());
  const qaMode = qaModeSetting && canUseQaTools;
  const [chatWith, setChatWith] = useState<string | null>(null);
  const [arrival, setArrival] = useState<string | null>(null);
  const unread = useChatUnread();
  const myRole = useMyRole();
  const [visitId, setVisitId] = useState<string | null>(null);

  // My title (QA / leader) and, for leaders, the team's spirit.
  useEffect(() => {
    if (!isRemoteModeEnabled() || needsLogin) return;
    void refreshMyRole();
    const t = window.setInterval(() => void refreshMyRole(), 5 * 60_000);
    return () => window.clearInterval(t);
  }, [needsLogin]);

  // The live channel (presence, live visits, chat) runs while signed in.
  useEffect(() => {
    if (!isRemoteModeEnabled() || needsLogin) return;
    live.start();
    startChatBadge();
    return () => live.stop();
  }, [needsLogin]);

  useLiveEvent((e) => {
    if (e.t === "visit.arrived") {
      const name = (e.from as { name: string }).name;
      setArrival(name);
      window.setTimeout(() => setArrival((a) => (a === name ? null : a)), 9000);
    }
  });

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Rocky` : "Rocky";
  }, [unread]);

  useEffect(() => {
    if (!qaMode && view === "qa-simulator") setView("home");
  }, [qaMode, view]);

  // Any API call that comes back 401 (session expired, PIN reset by QA)
  // sends the agent to the sign-in screen.
  useEffect(() => {
    const onAuth = (e: Event) => {
      setLoginNotice(
        (e as CustomEvent<string>).detail ||
          "Your session ended. Please sign in again.",
      );
      setNeedsLogin(true);
    };
    window.addEventListener("rocky:auth-required", onAuth);
    return () => window.removeEventListener("rocky:auth-required", onAuth);
  }, []);

  if (needsLogin) {
    return (
      <Login
        initialEmail={getAgentEmail() ?? ""}
        notice={loginNotice}
        onSignedIn={() => window.location.reload()}
      />
    );
  }

  if (!onboarded) {
    return <Onboarding onComplete={() => setOnboarded(true)} />;
  }

  async function signOut() {
    if (getSessionToken()) await apiClient.logout().catch(() => {});
    // Shared PCs: nothing of this agent stays in the browser after signing out.
    endSession();
    repository.resetAll();
    window.localStorage.removeItem("rocky.onboarding.completed");
    window.location.assign(window.location.pathname);
  }

  function toggleQaMode() {
    const next = !qaMode;
    setQaModeEnabled(next);
    setQaMode(next);
  }

  const navItems: {
    view: View;
    label: string;
    icon: NavIconName;
    internal?: boolean;
  }[] = [
    { view: "home", label: "Rocky", icon: "home" },
    { view: "notes", label: "Note Check", icon: "note" },
    { view: "arcade", label: "Games", icon: "games" },
    ...(isRemoteModeEnabled()
      ? [{ view: "chat" as View, label: "Chat", icon: "chat" as NavIconName }]
      : []),
    ...(myRole?.title === "leader"
      ? [{ view: "my-team" as View, label: "My team", icon: "team" as NavIconName }]
      : []),
    { view: "progress", label: "Progress", icon: "chart" },
    { view: "friends", label: "Friends", icon: "friends" },
    { view: "achievements", label: "Badges", icon: "medal" },
    { view: "leaderboard", label: "Ranking", icon: "podium" },
    // Teams are still a demo roster (no real team assignments yet), so they
    // are only shown offline — never presented to pilot agents as real.
    ...(isRemoteModeEnabled()
      ? []
      : [
          {
            view: "team" as View,
            label: "My team",
            icon: "team" as NavIconName,
          },
          {
            view: "team-leaderboard" as View,
            label: "Teams",
            icon: "teams" as NavIconName,
          },
        ]),
    ...(canUseAdmin
      ? [
          {
            view: "admin" as View,
            label: "Admin",
            icon: "admin" as NavIconName,
            internal: true,
          },
        ]
      : []),
    ...(qaMode
      ? [
          {
            view: "qa-simulator" as View,
            label: "QA sim",
            icon: "flask" as NavIconName,
            internal: true,
          },
        ]
      : []),
    ...(import.meta.env.DEV
      ? [
          {
            view: "dev-controls" as View,
            label: "Dev",
            icon: "wrench" as NavIconName,
            internal: true,
          },
        ]
      : []),
  ];

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            R
          </span>
          <span className={styles.brandName}>Rocky</span>
          <span className={styles.brandBy}>by RLX</span>
        </div>
        <nav className={styles.nav} aria-label="Main">
          {navItems.map((item) => (
            <button
              key={item.view}
              className={`${styles.navButton} ${item.internal ? styles.navButtonQa : ""} ${view === item.view ? styles.navButtonActive : ""}`}
              aria-current={view === item.view ? "page" : undefined}
              onClick={() => setView(item.view)}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
              {item.view === 'chat' && unread > 0 && <b className={styles.navBadge}>{unread > 99 ? '99+' : unread}</b>}
            </button>
          ))}
        </nav>
        {isBackendConfigured() && getAgentEmail() && (
          <div className={styles.account}>
            <NameBadges staff={getAgentRole() === "ADMIN"} title={myRole?.title} />
            <span className={styles.accountEmail} title={getAgentEmail() ?? ""}>
              {getAgentEmail()}
            </span>
            <button
              type="button"
              className={styles.signOut}
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      {view === "home" && (
        <Home
          onOpenTeam={() => setView("my-team")}
          onOpenProgress={() => setView("progress")}
          onOpenNotes={() => setView("notes")}
        />
      )}
      {view === "progress" && <Progress />}
      {view === "friends" && (
        <Friends
          openVisit={visitId}
          onVisitOpened={() => setVisitId(null)}
          onChat={(id) => {
            setChatWith(id);
            setView("chat");
          }}
        />
      )}
      {view === "my-team" && (
        <MyTeam
          onVisit={(id) => {
            setVisitId(id);
            setView("friends");
          }}
        />
      )}
      {view === "chat" && (
        <Chat openWith={chatWith} onOpened={() => setChatWith(null)} />
      )}
      {view === "arcade" && <Arcade onOpenNotes={() => setView("notes")} />}
      {view === "notes" && <NotesGame />}
      {view === "qa-simulator" && qaMode && <QASimulator />}
      {view === "admin" && canUseAdmin && <AdminConsole />}
      {view === "achievements" && <Achievements />}
      {view === "leaderboard" && <Leaderboard />}
      {view === "team" && <TeamPage />}
      {view === "team-leaderboard" && <TeamLeaderboard />}
      {view === "dev-controls" && import.meta.env.DEV && <DevControls />}

      <ReminderHost />

      {arrival && view !== 'home' && (
        <div className={styles.arrival} role="status">
          <span>👋 {arrival} is visiting your Rocky right now!</span>
          <button
            type="button"
            onClick={() => {
              setArrival(null)
              setView('home')
            }}
          >
            Go home
          </button>
        </div>
      )}

      {/* Unobtrusive corner toggle — not part of the agent's normal
          attention path, but always reachable for testers. */}
      {canUseQaTools && (
        <button className={styles.qaModeToggle} onClick={toggleQaMode}>
          {qaMode ? "✓ QA Tools On" : "QA Tools"}
        </button>
      )}
    </div>
  );
}

export default App;
