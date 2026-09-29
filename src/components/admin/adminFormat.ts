import { findFood, findSoap } from "../../game/pantry";
import type {
  AdminAgentSummary,
  AdminEventRow,
} from "../../services/apiClient";
import { CLOSET } from "../../game/closet";

// Spanish display helpers shared by the admin console.

export const MOOD_ES: Record<string, string> = {
  Happy: "Feliz",
  Motivated: "Motivado",
  Worried: "Preocupado",
  Recovery: "Recuperándose",
};

export const STAGE_ES: Record<string, string> = {
  Baby: "Baby",
  Young: "Young",
  Advanced: "Advanced",
  Elite: "Elite",
};

export const WEEKDAY_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const EVENT_TYPE_ES: Record<string, string> = {
  CHECK_IN: "Check-in",
  QA_PASS: "QA Pass",
  DOCUMENTATION_ALERT: "Alerta de documentación",
  STREAK_MILESTONE: "Hito de racha",
  LEVEL_UP: "Subió de nivel",
  EVOLUTION: "Evolución",
  ACHIEVEMENT: "Logro",
  CORRECTION: "Corrección",
  XP_GRANT: "XP otorgado",
};

export function eventDetail(e: AdminEventRow): string {
  const p = e.payload ?? {};
  switch (e.type) {
    case "CHECK_IN":
    case "QA_PASS":
      return `+${p.xpGained ?? 0} XP · +${p.energyGained ?? 0} energía`;
    case "DOCUMENTATION_ALERT":
      return `−${p.energyLoss ?? 0} energía${p.streakBroken ? " · racha rota" : ""}`;
    case "STREAK_MILESTONE":
      return `${p.days ?? ""} días · +${p.xpGained ?? 0} XP`;
    case "LEVEL_UP":
      return `Nivel ${p.previousLevel ?? "?"} → ${p.newLevel ?? p.level ?? "?"}`;
    case "EVOLUTION":
      return `${p.previousStage ?? "?"} → ${p.newStage ?? p.stage ?? "?"}`;
    case "ACHIEVEMENT":
      return String(p.name ?? "");
    case "XP_GRANT":
      return `+${p.xp ?? 0} XP${p.reason ? ` · “${p.reason}”` : ""}${p.grantedBy ? ` · por ${p.grantedBy}` : ""}`;
    case "CORRECTION":
      return `Corregido a ${p.correctedTo === "PASS" ? "QA Pass" : "Alerta"}${p.reason ? ` · “${p.reason}”` : ""}`;
    default:
      return "";
  }
}

const dateTimeFmt = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});
const dayFmt = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
});

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateTimeFmt.format(d);
}

export function fmtDayKey(key: string): string {
  return dayFmt.format(new Date(`${key}T12:00:00`));
}

export function relativeDays(days: number | null): string {
  if (days === null) return "Nunca";
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function displayName(a: Pick<AdminAgentSummary, "id" | "name">): string {
  return a.name && a.name !== "Agent" ? a.name : a.id.split("@")[0]!;
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function agentsToCsv(agents: AdminAgentSummary[]): string {
  const header = [
    "correo",
    "nombre",
    "nivel",
    "xp",
    "energia",
    "animo",
    "etapa",
    "racha_actual",
    "mejor_racha",
    "ultimo_checkin",
    "checkins",
    "qa_pass",
    "alertas",
    "correcciones",
    "logros",
    "en_riesgo",
    "motivos_riesgo",
  ];
  const rows = agents.map((a) => [
    a.id,
    a.name,
    a.state.level,
    a.state.xp,
    a.state.energy,
    MOOD_ES[a.state.mood] ?? a.state.mood,
    a.state.evolutionStage,
    a.state.currentStreak,
    a.state.bestStreak,
    a.state.lastCheckInDate ?? "",
    a.metrics.checkIns,
    a.metrics.qaPasses,
    a.metrics.alerts,
    a.metrics.corrections,
    a.metrics.achievements,
    a.metrics.atRisk ? "si" : "no",
    a.metrics.riskReasons.join(" | "),
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

export function downloadText(
  filename: string,
  text: string,
  type = "text/csv;charset=utf-8",
): void {
  // BOM so Excel opens accented Spanish text correctly.
  const blob = new Blob(["﻿", text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Audit trail actions (backend audit_log.action) in plain Spanish.
export const AUDIT_ACTION_ES: Record<string, string> = {
  "auth.login": "Inició sesión",
  "auth.logout": "Cerró sesión",
  "auth.pin-created": "Creó su PIN",
  "auth.failed": "PIN incorrecto",
  "auth.locked": "Bloqueado por PIN incorrecto",
  "auth.locked-attempt": "Intento con cuenta bloqueada",
  "agent.onboarded": "Completó la bienvenida",
  "agent.rocky-renamed": "Renombró a Rocky",
  "pet.pet": "Acarició a Rocky",
  "pet.feed": "Le dio un premio",
  "pet.play": "Jugó con la pelota",
  "pet.bath": "Bañó a Rocky",
  "pet.buy": "Compró un accesorio",
  "pet.buyTreats": "Compró bolsa de premios",
  "pet.equip": "Cambió el look",
  "pet.quiz": "Jugó Note Check",
  "pet.buyFood": "Compró comida",
  "pet.buySoap": "Compró un jabón",
  "pet.keepy": "Mantuvo la pelota en el aire",
  "pet.litter": "Recogió basura",
  "pet.arcade": "Jugó en el Arcade",
  "chat.rules.accepted": "Aceptó las reglas del chat",
  "admin.people": "Cambió título o equipo",
  "chat.report": "Reportó un mensaje del chat",
  "chat.message.flagged": "Envió un mensaje con posible dato de cliente",
  "chat.admin.read": "Leyó una conversación (QA)",
  "chat.admin.export": "Exportó conversaciones (QA)",
  "chat.admin.hide": "Ocultó un mensaje del chat",
  "chat.admin.report": "Resolvió un reporte del chat",
  "chat.admin.mute": "Pausó el chat de un agente",
  "chat.admin.unmute": "Levantó la pausa del chat",
  "chat.retention.purge": "Borrado automático de chats (90 días)",
  "pet.readInbox": "Leyó sus mensajes",
  "social.visit": "Visitó a un amigo",
  "social.visited": "Recibió una visita",
  "admin.inventory": "Regaló comida/jabón",
  "admin.message": "Envió un mensaje",
  "admin.gift.note": "Nota de regalo",
  "admin.litter.clear": "Limpió la basura",
  "admin.games.reset": "Reinició topes de juegos",
  "admin.bulk": "Acción masiva",
  "qa.pass": "QA Pass registrado",
  "qa.alert": "Alerta registrada",
  "qa.correction": "Corrección de auditoría",
  "admin.coins": "Ajuste de coins",
  "admin.xp": "Otorgó XP",
  "admin.level": "Subió de nivel",
  "admin.evolution": "Activó una evolución",
  "admin.treats": "Ajuste de premios",
  "admin.item.grant": "Regaló un accesorio",
  "admin.item.revoke": "Quitó un accesorio",
  "admin.needs.restore": "Restauró necesidades",
  "admin.pet.reset": "Reinició la mascota",
  "admin.pin-reset": "Reseteó el PIN",
  "admin.sessions-revoked": "Cerró todas las sesiones",
  "admin.catalog": "Editó la tienda",
  "admin.collection": "Temporada abierta/cerrada",
  "admin.agent.renamed": "Renombró al agente",
  "admin.agent.reset": "Reseteó el progreso",
  "admin.agent.deleted": "Eliminó al agente",
};

export function auditLabel(action: string): string {
  if (action.endsWith(".rejected"))
    return `${AUDIT_ACTION_ES[action.replace(".rejected", "")] ?? action} (rechazado)`;
  return AUDIT_ACTION_ES[action] ?? action;
}

export const LEDGER_KIND_ES: Record<string, string> = {
  purchase: "Compra",
  "treat-bag": "Bolsa de premios",
  "admin-grant": "Otorgado por admin",
  "admin-deduct": "Descontado por admin",
  quiz: "Note Check (juego de notas)",
  game: "Minijuegos (pelota, basura)",
  social: "Visita a un amigo",
};

export const SOURCE_ES: Record<string, string> = {
  session: "sesión con PIN",
  "pilot-link": "link de Teams",
  dev: "dev",
  login: "inicio de sesión",
  admin: "admin",
};

export function auditDetail(detail: Record<string, unknown> | null): string {
  if (!detail) return "";
  const parts: string[] = [];
  if (typeof detail.itemId === "string")
    parts.push(
      CLOSET.find((i) => i.id === detail.itemId)?.name ??
        findFood(detail.itemId as string)?.name ??
        findSoap(detail.itemId as string)?.name ??
        (detail.itemId === "treat-bag"
          ? "Bolsa de premios"
          : (detail.itemId as string)),
    );
  if (typeof detail.food === "string")
    parts.push(findFood(detail.food)?.name ?? detail.food);
  if (typeof detail.soap === "string")
    parts.push(findSoap(detail.soap)?.name ?? detail.soap);
  if (typeof detail.arcade === "string")
    parts.push(`Arcade ${detail.arcade.replace(":", " → ")}`);
  if (typeof detail.touches === "number")
    parts.push(`${detail.touches} toques seguidos`);
  if (detail.reward && typeof detail.reward === "object") {
    const r = detail.reward as { coins?: number; xp?: number };
    parts.push(`premio ${r.coins ?? 0} coins${r.xp ? ` + ${r.xp} XP` : ""}`);
  }
  if (typeof detail.collection === "string")
    parts.push(detail.collection === "spooky" ? "🎃 Spooky" : "🎄 Holidays");
  if (typeof detail.from === "string" || typeof detail.until === "string")
    parts.push(`${detail.from ?? "…"} → ${detail.until ?? "…"}`);
  if (typeof detail.kind === "string") parts.push(detail.kind);
  if (typeof detail.from === "string") parts.push(`de ${detail.from}`);
  if (typeof detail.text === "string") parts.push(`“${detail.text}”`);
  if (typeof detail.agents === "number")
    parts.push(`${detail.done ?? "?"}/${detail.agents} agentes`);
  if (typeof detail.qty === "number") parts.push(`x${detail.qty}`);
  if (typeof detail.coins === "number")
    parts.push(`${detail.coins > 0 ? "+" : ""}${detail.coins} coins`);
  if (typeof detail.delta === "number")
    parts.push(`${detail.delta > 0 ? "+" : ""}${detail.delta}`);
  if (typeof detail.applied === "number" && detail.applied !== detail.delta)
    parts.push(`aplicado ${detail.applied}`);
  if (typeof detail.price === "number") parts.push(`precio ${detail.price}`);
  if (typeof detail.enabled === "boolean")
    parts.push(detail.enabled ? "disponible" : "retirado de la tienda");
  if (typeof detail.note === "string") parts.push(`“${detail.note}”`);
  if (typeof detail.reason === "string") parts.push(detail.reason);
  if (typeof detail.score === "string") parts.push(`puntaje ${detail.score}`);
  if (typeof detail.level === "number") parts.push(`nivel ${detail.level}`);
  if (typeof detail.stage === "string") parts.push(`${detail.stage} Rocky`);
  if (typeof detail.rockyName === "string") parts.push(detail.rockyName);
  if (typeof detail.name === "string") parts.push(detail.name);
  if (typeof detail.auditDate === "string") parts.push(detail.auditDate);
  if (typeof detail.correctedTo === "string")
    parts.push(`→ ${detail.correctedTo}`);
  if (typeof detail.attempt === "number")
    parts.push(`intento ${detail.attempt}`);
  if (typeof detail.sessionsRevoked === "number")
    parts.push(`${detail.sessionsRevoked} sesiones cerradas`);
  if (detail.firstLogin === true) parts.push("primer ingreso");
  if (typeof detail.device === "string") parts.push(shortDevice(detail.device));
  return parts.join(" · ");
}

/** "Chrome · Windows" from a user-agent string. */
export function shortDevice(ua: string | null): string {
  if (!ua) return "dispositivo desconocido";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Navegador";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}
