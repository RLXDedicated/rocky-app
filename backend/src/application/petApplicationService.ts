// Application Service for Rocky the pet (needs, care, shop, coins) and the
// admin tools that manage it. The rules live in src/game/pet.ts — shared
// with the browser — so this file only loads, applies, stores and records:
// every change is saved together with its coin-ledger entry and audit-trail
// entry in one transaction.
import { ApiError } from "../api/errors";
import { withStaffPerks } from "../../../src/game/closet";
import type { PersistenceContext } from "../infrastructure/persistenceContext";
import type {
  AuditRow,
  LedgerRow,
} from "../infrastructure/accounts/AccountStore";
import { GameService, systemClock, type Clock } from "../domain/rockyEngine";
import { GAME_XP_SOURCE, processXpGrant } from "../../../src/engine/gameEngine";
import {
  CLOSET,
  findItem,
  resolveCatalog,
  type CatalogOverrides,
  type ProgressFacts,
} from "../../../src/game/closet";
import { coinBreakdown, type CoinBreakdown } from "../../../src/game/economy";
import {
  findFood,
  findSoap,
  FOODS,
  hash,
  SOAPS,
} from "../../../src/game/pantry";
import {
  collectionKey,
  collectionOpen,
  COLLECTIONS,
  sanitizeOutfit,
  type Collection,
} from "../../../src/game/closet";
import { publicName } from "./leaderboardApplicationService";
import {
  adminAdjustCoins,
  adminAdjustTreats,
  adminClearLitter,
  adminGiveInventory,
  adminMessage,
  adminResetGameCaps,
  hostSide,
  needsSummary,
  visitorSide,
  type VisitKind,
  adminGrantItem,
  adminRestoreNeeds,
  adminRevokeItem,
  applyPetAction,
  coinBalance,
  factsFrom,
  initialPetState,
  normalizePetState,
  refreshPetState,
  treatsAvailable,
  type LedgerEntry,
  type PetAction,
  type PetFailure,
  type PetState,
} from "../../../src/game/pet";

export interface PetView {
  state: PetState;
  coins: number;
  treats: number;
  earned: CoinBreakdown;
  facts: ProgressFacts;
  catalog: CatalogOverrides;
  revision: number;
  serverTime: string;
}

export interface PetActionResponse extends PetView {
  ok: boolean;
  reason: PetFailure | null;
  /** What a mini-game paid (after the daily caps). */
  reward?: { coins: number; xp: number } | null;
  /** Set when the action granted XP (the agent's game state changed too). */
  leveledUp?: boolean;
}

export interface Actor {
  id: string;
  via?: string;
}

export interface PetApplicationServiceDeps {
  persistence: PersistenceContext;
  clock?: Clock;
  /** Rocky admins (ROCKY_ADMIN_EMAILS): they get the VIP badge and the staff-only items. */
  isStaff?: (agentId: string) => boolean;
}

/** A stable, opaque id for a friend (never the email). */
export function friendKey(agentId: string): string {
  return `f-${hash(`rocky-friend:${agentId}`).toString(36)}${hash(`rocky-friend2:${agentId}`).toString(36).slice(0, 3)}`;
}

/** Operations an admin can run on many agents at once. */
export type BulkOp =
  | { kind: "coins"; delta: number; note: string }
  | { kind: "treats"; delta: number }
  | { kind: "item"; itemId: string }
  | { kind: "inventory"; itemId: string; qty: number }
  | { kind: "needs" }
  | { kind: "message"; text: string }
  | { kind: "litter" }
  | { kind: "games" };

export const PANTRY_IDS = [
  ...FOODS.map((f) => f.id),
  ...SOAPS.map((s) => s.id),
];

const LEDGER_LIMIT = 200;
const AUDIT_LIMIT = 300;

export function createPetApplicationService({
  persistence,
  clock = systemClock,
  isStaff = () => false,
}: PetApplicationServiceDeps) {
  const accounts = persistence.accounts;

  function facts(agentId: string): ProgressFacts {
    const service = new GameService(
      persistence.repoStore.forAgent(agentId),
      clock,
    );
    return factsFrom(
      service.getSnapshot().gameState,
      service.getAchievementProgress(),
    );
  }

  function load(
    agentId: string,
    now: Date,
  ): { state: PetState; revision: number } {
    const record = accounts.getPetProfile(agentId);
    const state = record
      ? normalizePetState(record.state, now)
      : initialPetState(now);
    return {
      state: withStaffPerks(refreshPetState(state, now), isStaff(agentId)),
      revision: record?.revision ?? 0,
    };
  }

  function view(
    state: PetState,
    f: ProgressFacts,
    revision: number,
    now: Date,
    overrides = accounts.getCatalogOverrides(),
  ): PetView {
    return {
      state,
      coins: coinBalance(state, f),
      treats: treatsAvailable(state, f),
      earned: coinBreakdown(f),
      facts: f,
      catalog: overrides,
      revision,
      serverTime: now.toISOString(),
    };
  }

  function audit(
    agentId: string | null,
    actor: Actor,
    action: string,
    detail: Record<string, unknown> | null,
    now: Date,
  ) {
    accounts.addAudit({
      agentId,
      actor: actor.id,
      action,
      detail,
      source: actor.via ?? null,
      createdAt: now.toISOString(),
    });
  }

  function ledger(
    agentId: string,
    actor: Actor,
    entry: LedgerEntry,
    balanceAfter: number,
    now: Date,
  ) {
    accounts.addLedger({
      agentId,
      delta: entry.delta,
      kind: entry.kind,
      itemId: entry.itemId ?? null,
      note: entry.note ?? null,
      actor: actor.id,
      balanceAfter,
      createdAt: now.toISOString(),
    });
  }

  function save(agentId: string, state: PetState, now: Date): number {
    return accounts.savePetProfile(agentId, state, now.toISOString()).revision;
  }

  /** Admin changes all follow the same shape: load → change → save → ledger/audit → view. */
  function adminChange(
    agentId: string,
    actor: Actor,
    action: string,
    detail: Record<string, unknown>,
    change: (
      state: PetState,
      f: ProgressFacts,
      now: Date,
    ) => { state: PetState; ledger?: LedgerEntry },
  ): PetView {
    if (!persistence.repoStore.hasAgent(agentId))
      throw ApiError.notFound(`Agent "${agentId}" does not exist.`);
    return persistence.withTransaction(() => {
      const now = clock.now();
      const f = facts(agentId);
      const { state } = load(agentId, now);
      const result = change(state, f, now);
      const revision = save(agentId, result.state, now);
      const coins = coinBalance(result.state, f);
      if (result.ledger && result.ledger.delta !== 0)
        ledger(agentId, actor, result.ledger, coins, now);
      audit(
        agentId,
        actor,
        action,
        {
          ...detail,
          ...(result.ledger ? { applied: result.ledger.delta } : {}),
        },
        now,
      );
      return view(result.state, f, revision, now);
    });
  }

  return {
    getPet(agentId: string): PetView {
      const now = clock.now();
      const f = facts(agentId);
      const { state, revision } = load(agentId, now);
      // The first look creates Rocky's record, so his world's clock (litter) starts now.
      if (revision === 0 && !accounts.getPetProfile(agentId))
        return view(state, f, save(agentId, state, now), now);
      return view(state, f, revision, now);
    },

    act(agentId: string, action: PetAction, actor: Actor): PetActionResponse {
      return persistence.withTransaction(() => {
        const now = clock.now();
        const f = facts(agentId);
        const overrides = accounts.getCatalogOverrides();
        const { state, revision } = load(agentId, now);
        const result = applyPetAction(state, action, {
          facts: f,
          now,
          catalog: resolveCatalog(overrides, now),
          overrides,
        });
        if (!result.ok) {
          audit(
            agentId,
            actor,
            `pet.${action.type}.rejected`,
            {
              reason: result.reason,
              ...("itemId" in action ? { itemId: action.itemId } : {}),
            },
            now,
          );
          return {
            ...view(state, f, revision, now, overrides),
            ok: false,
            reason: result.reason,
          };
        }
        const nextRevision = save(agentId, result.state, now);
        let leveledUp = false;
        let after = f;
        if (result.xp && result.xp.xp > 0) {
          // Mini-game XP goes through the event log like any other XP.
          const repo = persistence.repoStore.forAgent(agentId);
          const granted = processXpGrant(
            repo.getGameState(),
            result.xp.xp,
            now,
            agentId,
            { reason: result.xp.reason, grantedBy: GAME_XP_SOURCE },
          );
          repo.saveGameState(granted.state);
          for (const e of granted.events) repo.saveEvent(e);
          leveledUp = granted.leveledUp;
          after = facts(agentId);
        }
        const coins = coinBalance(result.state, after);
        if (result.ledger) ledger(agentId, actor, result.ledger, coins, now);
        const detail: Record<string, unknown> = {
          needs: {
            h: result.state.needs.health,
            j: result.state.needs.happiness,
            d: result.state.needs.dirt,
          },
        };
        if ("itemId" in action) detail.itemId = action.itemId;
        if (action.type === "equip") detail.outfit = result.state.outfit;
        if (result.ledger) detail.coins = result.ledger.delta;
        if (action.type === "quiz")
          detail.score = `${result.state.quiz.lastScore}/${result.state.quiz.lastTotal}`;
        if ("food" in action && action.food) detail.food = action.food;
        if ("soap" in action && action.soap) detail.soap = action.soap;
        if ("foodId" in action) detail.itemId = action.foodId;
        if ("soapId" in action) detail.itemId = action.soapId;
        if (action.type === "keepy") detail.touches = action.touches;
        if (action.type === "arcade")
          detail.arcade = `${action.game}:${action.score}`;
        if (result.reward) detail.reward = result.reward;
        audit(agentId, actor, `pet.${action.type}`, detail, now);
        return {
          ...view(result.state, after, nextRevision, now, overrides),
          ok: true,
          reason: null,
          reward: result.reward ?? null,
          leveledUp,
        };
      });
    },

    markOnboarded(agentId: string, actor: Actor): PetView {
      return persistence.withTransaction(() => {
        const now = clock.now();
        const f = facts(agentId);
        const { state } = load(agentId, now);
        const next = state.onboardedAt
          ? state
          : { ...state, onboardedAt: now.toISOString() };
        const revision = save(agentId, next, now);
        if (!state.onboardedAt)
          audit(agentId, actor, "agent.onboarded", null, now);
        return view(next, f, revision, now);
      });
    },

    // ----------------------------------------------------------------- admin
    getAdminPet(agentId: string) {
      if (!persistence.repoStore.hasAgent(agentId))
        throw ApiError.notFound(`Agent "${agentId}" does not exist.`);
      const pet = this.getPet(agentId);
      return {
        pet,
        ledger: accounts.listLedger(agentId, LEDGER_LIMIT) as LedgerRow[],
        audit: accounts.listAudit(agentId, AUDIT_LIMIT) as AuditRow[],
        sessions: accounts.listSessions(agentId).map((s) => ({
          createdAt: s.createdAt,
          lastSeenAt: s.lastSeenAt,
          expiresAt: s.expiresAt,
          userAgent: s.userAgent,
          revokedAt: s.revokedAt,
          active: !s.revokedAt && s.expiresAt > clock.now().toISOString(),
        })),
        hasPin: accounts.getCredential(agentId) !== null,
      };
    },

    adjustCoins(
      agentId: string,
      delta: number,
      note: string,
      actor: Actor,
    ): PetView {
      return adminChange(
        agentId,
        actor,
        "admin.coins",
        { delta, note },
        (state, f) => adminAdjustCoins(state, delta, f, note),
      );
    },

    adjustTreats(agentId: string, delta: number, actor: Actor): PetView {
      return adminChange(
        agentId,
        actor,
        "admin.treats",
        { delta },
        (state) => ({ state: adminAdjustTreats(state, delta) }),
      );
    },

    grantItem(agentId: string, itemId: string, actor: Actor): PetView {
      if (!findItem(itemId))
        throw ApiError.validation(`Unknown item "${itemId}".`);
      return adminChange(
        agentId,
        actor,
        "admin.item.grant",
        { itemId },
        (state) => ({ state: adminGrantItem(state, itemId) }),
      );
    },

    revokeItem(agentId: string, itemId: string, actor: Actor): PetView {
      if (!findItem(itemId))
        throw ApiError.validation(`Unknown item "${itemId}".`);
      return adminChange(
        agentId,
        actor,
        "admin.item.revoke",
        { itemId },
        (state, f) => ({
          state: adminRevokeItem(
            state,
            itemId,
            f,
            resolveCatalog(accounts.getCatalogOverrides()),
          ),
        }),
      );
    },

    restoreNeeds(agentId: string, actor: Actor): PetView {
      return adminChange(
        agentId,
        actor,
        "admin.needs.restore",
        {},
        (state, _f, now) => ({ state: adminRestoreNeeds(state, now) }),
      );
    },

    resetPet(agentId: string, actor: Actor): PetView {
      return adminChange(
        agentId,
        actor,
        "admin.pet.reset",
        {},
        (state, _f, now) => ({
          state: { ...initialPetState(now), onboardedAt: state.onboardedAt },
        }),
      );
    },

    getCatalog() {
      const overrides = accounts.getCatalogOverrides();
      const now = clock.now();
      return {
        overrides,
        collections: COLLECTIONS.map((c) => {
          const o = overrides[collectionKey(c.id)] ?? {};
          return {
            ...c,
            enabled: o.enabled === true,
            from: o.from ?? null,
            until: o.until ?? null,
            open: collectionOpen(overrides, c.id, now),
          };
        }),
        items: resolveCatalog(overrides, now)
          .map((i) => {
            const base = CLOSET.find((c) => c.id === i.id)!;
            return {
              id: i.id,
              slot: i.slot,
              name: i.name,
              requirement: i.requirement,
              price: i.price,
              basePrice: base.price,
              // The item's own switch; a closed collection is reported separately.
              enabled: overrides[i.id]?.enabled !== false,
              collection: i.season ?? null,
            };
          })
          .concat(
            [
              ...FOODS.map((x) => ({ ...x, slot: "food" as const })),
              ...SOAPS.map((x) => ({ ...x, slot: "soap" as const })),
            ].map((x) => {
              const o = overrides[x.id];
              return {
                id: x.id,
                slot: x.slot as never,
                name: x.name,
                requirement: x.season
                  ? `${COLLECTIONS.find((c) => c.id === x.season)?.name} exclusive`
                  : "Always available",
                price: typeof o?.price === "number" ? o.price : x.price,
                basePrice: x.price,
                enabled: o?.enabled !== false,
                collection: x.season ?? null,
              };
            }),
          ),
      };
    },

    /** Opens or closes a limited collection, optionally for a date window (YYYY-MM-DD, inclusive). */
    setCollection(
      id: Collection,
      value: { enabled: boolean; from: string | null; until: string | null },
      actor: Actor,
    ) {
      if (!COLLECTIONS.some((c) => c.id === id))
        throw ApiError.validation(`Unknown collection "${id}".`);
      if (value.from && value.until && value.from > value.until)
        throw ApiError.validation('"from" must be on or before "until".');
      return persistence.withTransaction(() => {
        const now = clock.now();
        accounts.setCatalogOverride(
          collectionKey(id),
          {
            price: null,
            enabled: value.enabled ? true : null,
            from: value.from,
            until: value.until,
          },
          actor.id,
          now.toISOString(),
        );
        audit(
          null,
          actor,
          "admin.collection",
          {
            collection: id,
            enabled: value.enabled,
            from: value.from,
            until: value.until,
          },
          now,
        );
        return this.getCatalog();
      });
    },

    setCatalogItem(
      itemId: string,
      value: { price: number | null; enabled: boolean | null },
      actor: Actor,
    ) {
      const base = findItem(itemId) ?? findFood(itemId) ?? findSoap(itemId);
      if (!base) throw ApiError.validation(`Unknown item "${itemId}".`);
      return persistence.withTransaction(() => {
        const now = clock.now();
        // Storing the default price/availability is the same as "no override".
        const price =
          value.price === null || value.price === base.price
            ? null
            : value.price;
        const enabled =
          value.enabled === null || value.enabled === true ? null : false;
        accounts.setCatalogOverride(
          itemId,
          { price, enabled },
          actor.id,
          now.toISOString(),
        );
        audit(
          null,
          actor,
          "admin.catalog",
          { itemId, price: value.price, enabled: value.enabled },
          now,
        );
        return this.getCatalog();
      });
    },

    listLedger(limit = 200) {
      return accounts.listLedger(null, limit);
    },

    listAudit(limit = 300) {
      return accounts.listAudit(null, limit);
    },

    /** Economy totals for the admin overview. */
    economySummary() {
      const now = clock.now();
      const rows = persistence.repoStore.listAgentIds().map((agentId) => {
        const f = facts(agentId);
        const { state } = load(agentId, now);
        return {
          agentId,
          earned: coinBreakdown(f).total,
          spent: state.coinsSpent,
          adjust: state.coinsAdjust,
          balance: coinBalance(state, f),
          needs: state.needs,
          items: state.owned.length + state.granted.length,
        };
      });
      const sum = (k: "earned" | "spent" | "adjust" | "balance") =>
        rows.reduce((a, r) => a + r[k], 0);
      const avg = (k: "health" | "happiness" | "dirt") =>
        rows.length
          ? Math.round(rows.reduce((a, r) => a + r.needs[k], 0) / rows.length)
          : 0;
      return {
        totals: {
          earned: sum("earned"),
          spent: sum("spent"),
          adjustments: sum("adjust"),
          balance: sum("balance"),
        },
        needs: {
          health: avg("health"),
          happiness: avg("happiness"),
          dirt: avg("dirt"),
        },
        agents: rows.sort((a, b) => b.balance - a.balance),
      };
    },

    // --------------------------------------------------------------- friends
    /** Everyone in the pilot is Rocky's friend. Emails never leave the server. */
    listFriends(viewerId: string) {
      const now = clock.now();
      const store = persistence.repoStore;
      const me = load(viewerId, now).state;
      return store
        .listAgentIds()
        .filter((id) => id !== viewerId)
        .map((id) => {
          const repo = store.forAgent(id);
          const agent = repo.getAgent();
          const game = repo.getGameState();
          const { state } = load(id, now);
          const key = friendKey(id);
          return {
            id: key,
            name: publicName(id, agent.name),
            rockyName: agent.rockyName,
            staff: isStaff(id),
            level: game.level,
            stage: game.evolutionStage,
            mood: game.mood,
            streak: game.currentStreak,
            feeling: needsSummary(state.needs),
            scene: state.outfit.scene,
            lastActiveAt: game.lastActivityAt,
            visitedToday:
              me.social.date === state.social.date
                ? me.social.visited.includes(key)
                : false,
          };
        })
        .sort(
          (a, b) =>
            (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? "") ||
            a.name.localeCompare(b.name),
        );
    },

    /** Resolves a friend key to the agent (null for unknown keys or yourself). */
    resolveFriend(viewerId: string, key: string): string | null {
      const id = persistence.repoStore
        .listAgentIds()
        .find((a) => friendKey(a) === key);
      return id && id !== viewerId ? id : null;
    },

    /** What a visitor sees of a friend's Rocky. */
    getFriend(viewerId: string, key: string) {
      const agentId = this.resolveFriend(viewerId, key);
      if (!agentId) throw ApiError.notFound("That friend could not be found.");
      return this.publicProfile(agentId);
    },

    /** An agent's Rocky as others see it (visits, live rooms). Never includes the email. */
    publicProfile(agentId: string) {
      const key = friendKey(agentId);
      const now = clock.now();
      const repo = persistence.repoStore.forAgent(agentId);
      const agent = repo.getAgent();
      const game = repo.getGameState();
      const f = facts(agentId);
      const { state } = load(agentId, now);
      const catalog = resolveCatalog(accounts.getCatalogOverrides(), now);
      return {
        id: key,
        name: publicName(agentId, agent.name),
        rockyName: agent.rockyName,
        staff: isStaff(agentId),
        level: game.level,
        stage: game.evolutionStage,
        mood: game.mood,
        streak: game.currentStreak,
        badges: repo.getAchievements().length,
        needs: state.needs,
        outfit: sanitizeOutfit(
          state.outfit,
          f,
          state.owned,
          state.granted,
          catalog,
        ),
        visitors: state.inbox
          .filter((e) => e.kind === "visit")
          .slice(0, 5)
          .map((e) => ({ text: e.text, at: e.at })),
      };
    },

    /** A visit: the visitor may earn a few coins, the host's Rocky cheers up and gets a note (and a treat, if given). */
    visitFriend(viewerId: string, key: string, kind: VisitKind, actor: Actor) {
      const hostId = this.resolveFriend(viewerId, key);
      if (!hostId) throw ApiError.notFound("That friend could not be found.");
      return persistence.withTransaction(() => {
        const now = clock.now();
        const fv = facts(viewerId);
        const mine = load(viewerId, now);
        const result = visitorSide(mine.state, key, kind, fv, now);
        if (!result.ok) {
          audit(
            viewerId,
            actor,
            "social.visit.rejected",
            { friend: key, kind, reason: result.reason },
            now,
          );
          return {
            ...view(mine.state, fv, mine.revision, now),
            ok: false,
            reason: result.reason,
            reward: null,
          };
        }
        const revision = save(viewerId, result.state, now);
        const coins = coinBalance(result.state, fv);
        if (result.ledger) ledger(viewerId, actor, result.ledger, coins, now);
        const visitorName = publicName(
          viewerId,
          persistence.repoStore.forAgent(viewerId).getAgent().name,
        );
        const host = load(hostId, now);
        save(hostId, hostSide(host.state, visitorName, kind, now), now);
        audit(
          viewerId,
          actor,
          "social.visit",
          { friend: key, kind, reward: result.reward },
          now,
        );
        audit(
          hostId,
          { id: viewerId, via: "visit" },
          "social.visited",
          { from: visitorName, kind },
          now,
        );
        return {
          ...view(result.state, fv, revision, now),
          ok: true,
          reason: null,
          reward: result.reward ?? null,
        };
      });
    },

    // ----------------------------------------------------------------- admin
    giveInventory(
      agentId: string,
      itemId: string,
      qty: number,
      actor: Actor,
    ): PetView {
      if (!findFood(itemId) && !findSoap(itemId))
        throw ApiError.validation(`Unknown food or soap "${itemId}".`);
      return adminChange(
        agentId,
        actor,
        "admin.inventory",
        { itemId, qty },
        (state, _f, now) => {
          const given = adminGiveInventory(state, itemId, qty);
          const name =
            findFood(itemId)?.name ?? findSoap(itemId)?.name ?? itemId;
          return {
            state:
              qty > 0
                ? adminMessage(
                    given,
                    {
                      kind: "gift",
                      from: "QA team",
                      text: `A gift for Rocky: ${qty > 1 ? `${qty} × ` : ""}${name}!`,
                      at: now.toISOString(),
                    },
                    `g-${now.getTime()}`,
                  )
                : given,
          };
        },
      );
    },

    sendMessage(agentId: string, text: string, actor: Actor): PetView {
      return adminChange(
        agentId,
        actor,
        "admin.message",
        { text },
        (state, _f, now) => ({
          state: adminMessage(
            state,
            { kind: "message", from: "QA team", text, at: now.toISOString() },
            `m-${now.getTime()}`,
          ),
        }),
      );
    },

    clearLitter(agentId: string, actor: Actor): PetView {
      return adminChange(
        agentId,
        actor,
        "admin.litter.clear",
        {},
        (state, _f, now) => ({ state: adminClearLitter(state, now) }),
      );
    },

    resetGameCaps(agentId: string, actor: Actor): PetView {
      return adminChange(
        agentId,
        actor,
        "admin.games.reset",
        {},
        (state, _f, now) => ({ state: adminResetGameCaps(state, now) }),
      );
    },

    /** Runs one pet operation for each agent; each agent gets its own ledger/audit entries. */
    bulk(agentIds: string[], op: BulkOp, actor: Actor) {
      const results: Array<{ agentId: string; ok: boolean; error?: string }> =
        [];
      for (const agentId of agentIds) {
        try {
          if (op.kind === "coins")
            this.adjustCoins(agentId, op.delta, op.note, actor);
          else if (op.kind === "treats")
            this.adjustTreats(agentId, op.delta, actor);
          else if (op.kind === "item") {
            this.grantItem(agentId, op.itemId, actor);
            const item = findItem(op.itemId);
            if (item)
              this.sendGiftNote(
                agentId,
                `QA gave Rocky a new ${item.name}!`,
                actor,
              );
          } else if (op.kind === "inventory")
            this.giveInventory(agentId, op.itemId, op.qty, actor);
          else if (op.kind === "needs") this.restoreNeeds(agentId, actor);
          else if (op.kind === "message")
            this.sendMessage(agentId, op.text, actor);
          else if (op.kind === "litter") this.clearLitter(agentId, actor);
          else if (op.kind === "games") this.resetGameCaps(agentId, actor);
          results.push({ agentId, ok: true });
        } catch (err) {
          results.push({
            agentId,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      return {
        done: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok),
        total: agentIds.length,
      };
    },

    sendGiftNote(agentId: string, text: string, actor: Actor): PetView {
      return adminChange(
        agentId,
        actor,
        "admin.gift.note",
        { text },
        (state, _f, now) => ({
          state: adminMessage(
            state,
            { kind: "gift", from: "QA team", text, at: now.toISOString() },
            `g-${now.getTime()}`,
          ),
        }),
      );
    },

    audit,
  };
}

export type PetApplicationService = ReturnType<
  typeof createPetApplicationService
>;
