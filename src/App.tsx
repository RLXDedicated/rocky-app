import { useCallback, useEffect, useState } from "react";
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
import { loadPetCache } from "./game/petClient";
import { gameEnabled } from "./game/pantry";
import { ReminderHost } from "./components/ReminderHost";
import { NotificationHost } from "./components/extras/NotificationHost";
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
  | "qa-desk"
  | "admin"
  | "achievements"
  | "leaderboard"
  | "team"
  | "team-leaderboard"
  | "dev-controls";

// Staff tools (Admin, QA desk) live in their own pinned menu, never in the
// agents' main nav. Developer Controls are dev-build only.
/** A Teams card can land on a screen: "Practice notes", a kudos card or a team lead's summary. */
function landingView(): View {
  const go = new URLSearchParams(window.location.search).get("go");
  if (go === "notes") return gameEnabled(loadPetCache().overrides, "notes") ? "notes" : "home";
  if (go === "kudos") return "friends";
  if (go === "team") return "my-team";
  return "home";
}

function App() {
  const [view, setView] = useState<View>(landingView);
  const [focusKudos, setFocusKudos] = useState(() => new URLSearchParams(window.location.search).get("go") === "kudos");
  useEffect(() => {
    if (!focusKudos) return;
    const t = window.setTimeout(() => setFocusKudos(false), 12_000);
    return () => window.clearTimeout(t);
  }, [focusKudos]);
  const openKudos = useCallback(() => {
    setFocusKudos(true);
    setView("friends");
  }, []);
  const openChat = useCallback(() => setView("chat"), []);
  const openHome = useCallback(() => setView("home"), []);
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
  const canUseAdmin = staff && isRemoteModeEnabled();
  const [chatWith, setChatWith] = useState<string | null>(null);
  const [arrival, setArrival] = useState<string | null>(null);
  // Arrived from a Rocky card in Teams (the backend already recorded the answer).
  const [teamsNote, setTeamsNote] = useState<string | null>(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("from") !== "teams") return null;
    return p.get("teams") === "done"
      ? "✅ Thanks for confirming your notes — Rocky is proud of you!"
      : "🐂 Rocky saw you coming from Teams and is happy to see you!";
  });
  useEffect(() => {
    if (!teamsNote) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("from");
    url.searchParams.delete("teams");
    url.searchParams.delete("go");
    window.history.replaceState(null, "", url.toString());
    const t = window.setTimeout(() => setTeamsNote(null), 8000);
    return () => window.clearTimeout(t);
  }, [teamsNote]);
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

  const navItems: {
    view: View;
    label: string;
    icon: NavIconName;
    internal?: boolean;
  }[] = [
    { view: "home", label: "Rocky", icon: "home" },
    // Admins can switch the notes quiz off (Admin → Minijuegos).
    ...(gameEnabled(loadPetCache().overrides, "notes")
      ? [{ view: "notes" as View, label: "Note Check", icon: "note" as NavIconName }]
      : []),
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
    // QA desk: opens its own light page (/qa/) — auditing never loads the game.
    ...(isRemoteModeEnabled() && (canUseAdmin || myRole?.title === "qa")
      ? [
          {
            view: "qa-desk" as View,
            label: "QA desk",
            icon: "clipboard" as NavIconName,
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
          {navItems.filter((item) => !item.internal).map((item) => (
            <button
              key={item.view}
              className={`${styles.navButton} ${item.internal ? styles.navButtonQa : ""} ${view === item.view ? styles.navButtonActive : ""}`}
              aria-current={view === item.view ? "page" : undefined}
              onClick={() => (item.view === "qa-desk" ? window.open("/qa/", "_blank", "noopener") : setView(item.view))}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
              {item.view === 'chat' && unread > 0 && <b className={styles.navBadge}>{unread > 99 ? '99+' : unread}</b>}
            </button>
          ))}
        </nav>
        {/* Admin tools stay pinned in view: the main menu may scroll on a laptop screen, these never hide. */}
        {navItems.some((item) => item.internal) && (
          <nav className={styles.navPinned} aria-label="Admin tools">
            {navItems
              .filter((item) => item.internal)
              .map((item) => (
                <button
                  key={item.view}
                  className={`${styles.navButton} ${styles.navButtonQa} ${view === item.view ? styles.navButtonActive : ""}`}
                  aria-current={view === item.view ? "page" : undefined}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => (item.view === "qa-desk" ? window.open("/qa/", "_blank", "noopener") : setView(item.view))}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              ))}
          </nav>
        )}
        {isBackendConfigured() && getAgentEmail() && (
          <div className={styles.account}>
            <span className={styles.accountBadges}>
              <NameBadges staff={getAgentRole() === "ADMIN"} title={myRole?.title} tester={myRole?.tester} honors={myRole?.honors} />
            </span>
            <span className={styles.accountEmail} title={getAgentEmail() ?? ""}>
              {getAgentEmail()}
            </span>
            <button
              type="button"
              className={styles.signOut}
              title={`Signed in as ${getAgentEmail() ?? ""}`}
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
          onOpenNotes={gameEnabled(loadPetCache().overrides, "notes") ? () => setView("notes") : undefined}
        />
      )}
      {view === "progress" && <Progress />}
      {view === "friends" && (
        <Friends
          focusKudos={focusKudos}
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
      {view === "admin" && canUseAdmin && <AdminConsole />}
      {view === "achievements" && <Achievements />}
      {view === "leaderboard" && <Leaderboard />}
      {view === "team" && <TeamPage />}
      {view === "team-leaderboard" && <TeamLeaderboard />}
      {view === "dev-controls" && import.meta.env.DEV && <DevControls />}

      <ReminderHost />
      {isRemoteModeEnabled() && <NotificationHost onOpenChat={openChat} onOpenHome={openHome} onOpenKudos={openKudos} />}

      {teamsNote && (
        <div className={styles.arrival} role="status">
          <span>{teamsNote}</span>
          <button type="button" onClick={() => setTeamsNote(null)}>
            OK
          </button>
        </div>
      )}

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

    </div>
  );
}

export default App;
