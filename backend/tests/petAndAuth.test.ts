import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config/env";
import {
  buildMemoryPersistence,
  buildSqlitePersistence,
  tempSqlitePath,
} from "./testApp";
import { fixedClock } from "../../src/engine/clock";
import type { PersistenceContext } from "../src/infrastructure/persistenceContext";

const ADMIN = "qa.lead@rlx.us";
const AGENT = "agent.one@rlx.us";
const as = (email: string) => ({ "X-Agent-Email": email });
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

function build(
  extra: Record<string, string> = {},
  persistence: PersistenceContext = buildMemoryPersistence(),
) {
  const config = loadConfig({
    NODE_ENV: "production",
    ROCKY_PERSISTENCE_DRIVER: "sqlite",
    ROCKY_DB_PATH: "/tmp/rocky-pet-test.db",
    ROCKY_AUTH_MODE: "pilot-header",
    ROCKY_ADMIN_EMAILS: ADMIN,
    ...extra,
  });
  return createApp({
    config,
    persistence,
    clock: fixedClock("2026-09-08T12:00:00.000Z"),
  });
}

describe("PIN sign-in", () => {
  it("creates the PIN on first sign-in, then requires it, and the session works on any device", async () => {
    const app = build();
    expect(
      (await request(app).post("/api/auth/status").send({ email: AGENT })).body
        .hasPin,
    ).toBe(false);

    const first = await request(app)
      .post("/api/auth/login")
      .send({ email: "Agent.One@RLX.us ", pin: "1234" });
    expect(first.status).toBe(200);
    expect(first.body.firstLogin).toBe(true);
    expect(first.body.agent.id).toBe(AGENT);

    const wrong = await request(app)
      .post("/api/auth/login")
      .send({ email: AGENT, pin: "9999" });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.message).toMatch(/Wrong PIN/);

    const second = await request(app)
      .post("/api/auth/login")
      .send({ email: AGENT, pin: "1234" });
    expect(second.status).toBe(200);
    expect(second.body.firstLogin).toBe(false);

    // Progress made on "device A" is visible on "device B".
    await request(app)
      .post("/api/events/check-in")
      .set(bearer(first.body.token))
      .send({});
    const state = await request(app)
      .get("/api/game-state")
      .set(bearer(second.body.token));
    expect(state.body.xp).toBeGreaterThan(0);
    const me = await request(app)
      .get("/api/agent/me")
      .set(bearer(second.body.token));
    expect(me.body.via).toBe("session");
  });

  it("rejects bad input, locks after repeated wrong PINs and records it all", async () => {
    const app = build();
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: "nope", pin: "1234" })
      ).status,
    ).toBe(422);
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: AGENT, pin: "12" })
      ).status,
    ).toBe(422);
    await request(app)
      .post("/api/auth/login")
      .send({ email: AGENT, pin: "1234" });
    for (let i = 0; i < 5; i++)
      await request(app)
        .post("/api/auth/login")
        .send({ email: AGENT, pin: "0000" });
    const locked = await request(app)
      .post("/api/auth/login")
      .send({ email: AGENT, pin: "1234" });
    expect(locked.status).toBe(429);

    const detail = await request(app)
      .get(`/api/admin/agents/${AGENT}/pet`)
      .set(as(ADMIN));
    const actions = detail.body.audit.map((a: { action: string }) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "auth.pin-created",
        "auth.failed",
        "auth.locked",
        "auth.locked-attempt",
      ]),
    );
  });

  it("an unknown or revoked session gets 401, never another identity", async () => {
    const app = build();
    expect(
      (await request(app).get("/api/game-state").set(bearer("made-up"))).status,
    ).toBe(401);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: AGENT, pin: "1234" });
    await request(app)
      .post("/api/auth/logout")
      .set(bearer(login.body.token))
      .send({});
    expect(
      (await request(app).get("/api/game-state").set(bearer(login.body.token)))
        .status,
    ).toBe(401);
  });

  it("ROCKY_REQUIRE_LOGIN turns off the bare Teams-link header", async () => {
    const app = build({ ROCKY_REQUIRE_LOGIN: "true" });
    expect(
      (await request(app).get("/api/game-state").set(as(AGENT))).status,
    ).toBe(401);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: AGENT, pin: "1234" });
    expect(
      (await request(app).get("/api/game-state").set(bearer(login.body.token)))
        .status,
    ).toBe(200);
  });

  it("ROCKY_LOGIN_DOMAINS limits who can sign in", async () => {
    const app = build({ ROCKY_LOGIN_DOMAINS: "rlx.us" });
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: "someone@gmail.com", pin: "1234" })
      ).status,
    ).toBe(422);
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: AGENT, pin: "1234" })
      ).status,
    ).toBe(200);
  });

  it("admins can reset a PIN, which signs the agent out everywhere", async () => {
    const app = build();
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: AGENT, pin: "1234" });
    const reset = await request(app)
      .post(`/api/admin/agents/${AGENT}/pin-reset`)
      .set(as(ADMIN))
      .send({});
    expect(reset.body.sessionsRevoked).toBe(1);
    expect(
      (await request(app).get("/api/game-state").set(bearer(login.body.token)))
        .status,
    ).toBe(401);
    const again = await request(app)
      .post("/api/auth/login")
      .send({ email: AGENT, pin: "5555" });
    expect(again.body.firstLogin).toBe(true);
  });
});

describe("Rocky the pet on the server", () => {
  it("starts healthy, keeps care actions, and rejects feeding without treats", async () => {
    const app = build();
    const pet = await request(app).get("/api/pet").set(as(AGENT));
    expect(pet.body.state.needs.health).toBe(100);
    expect(pet.body.coins).toBe(0);

    const feed = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "feed" });
    expect(feed.body.ok).toBe(false);
    expect(feed.body.reason).toBe("no-treats");

    await request(app).post("/api/events/check-in").set(as(AGENT)).send({});
    const fed = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "feed" });
    expect(fed.body.ok).toBe(true);
    expect(fed.body.treats).toBe(0);

    const played = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "play" });
    expect(played.body.state.needs.dirt).toBeGreaterThan(
      pet.body.state.needs.dirt,
    );
    const bathed = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "bath" });
    expect(bathed.body.state.needs.dirt).toBe(0);
  });

  it("never trusts client-authored economy fields", async () => {
    const app = build();
    const res = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "pet", xp: 999 });
    expect(res.status).toBe(422);
    const bogus = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "give-me-coins" });
    expect(bogus.status).toBe(422);
  });

  it("buys with coins, records the ledger, and equips only usable items", async () => {
    const app = build();
    await request(app).post("/api/events/check-in").set(as(AGENT)).send({});
    // 10 (check-in) + 40 (First Step badge) = 50 coins; an admin tops up 100.
    const granted = await request(app)
      .post(`/api/admin/agents/${AGENT}/coins`)
      .set(as(ADMIN))
      .send({ delta: 100, note: "Pilot welcome bonus" });
    expect(granted.body.coins).toBe(150);

    const locked = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "buy", itemId: "hat-crown" });
    expect(locked.body.reason).toBe("locked");
    const bought = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "buy", itemId: "hat-headset" });
    expect(bought.body.ok).toBe(true);
    expect(bought.body.coins).toBe(90);

    const equip = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({
        type: "equip",
        outfit: {
          hat: "hat-headset",
          scene: "scene-night",
          decor: ["decor-boxes"],
          fx: null,
        },
      });
    expect(equip.body.state.outfit.hat).toBe("hat-headset");
    expect(equip.body.state.outfit.scene).toBe("scene-route"); // not owned → falls back

    // Placed items keep where the agent put them, across devices.
    const placed = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({
        type: "equip",
        outfit: {
          ...equip.body.state.outfit,
          decor: ["decor-boxes", "decor-bowl"],
          spots: { "decor-bowl": 71.26, "decor-boxes": -40 },
        },
      });
    expect(placed.body.state.outfit.spots).toEqual({
      "decor-bowl": 71.3,
      "decor-boxes": 3,
    });
    expect(
      (await request(app).get("/api/pet").set(as(AGENT))).body.state.outfit
        .spots,
    ).toEqual({ "decor-bowl": 71.3, "decor-boxes": 3 });

    const detail = await request(app)
      .get(`/api/admin/agents/${AGENT}/pet`)
      .set(as(ADMIN));
    expect(
      detail.body.ledger.map((l: { kind: string; delta: number }) => [
        l.kind,
        l.delta,
      ]),
    ).toEqual([
      ["purchase", -60],
      ["admin-grant", 100],
    ]);
    expect(detail.body.ledger[0].balanceAfter).toBe(90);
    expect(detail.body.audit.map((a: { action: string }) => a.action)).toEqual(
      expect.arrayContaining(["pet.buy", "pet.equip", "admin.coins"]),
    );
  });

  it("admins can deduct (never below zero), gift items, restore needs, edit the shop", async () => {
    const app = build();
    await request(app).get("/api/pet").set(as(AGENT));
    const deducted = await request(app)
      .post(`/api/admin/agents/${AGENT}/coins`)
      .set(as(ADMIN))
      .send({ delta: -500, note: "Test" });
    expect(deducted.body.coins).toBe(0);

    const gift = await request(app)
      .post(`/api/admin/agents/${AGENT}/items`)
      .set(as(ADMIN))
      .send({ itemId: "hat-crown", action: "grant" });
    expect(gift.body.state.granted).toContain("hat-crown");
    const worn = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({
        type: "equip",
        outfit: { hat: "hat-crown", scene: "scene-route", decor: [], fx: null },
      });
    expect(worn.body.state.outfit.hat).toBe("hat-crown");
    const revoked = await request(app)
      .post(`/api/admin/agents/${AGENT}/items`)
      .set(as(ADMIN))
      .send({ itemId: "hat-crown", action: "revoke" });
    expect(revoked.body.state.outfit.hat).toBeNull();

    const restored = await request(app)
      .post(`/api/admin/agents/${AGENT}/needs/restore`)
      .set(as(ADMIN))
      .send({});
    expect(restored.body.state.needs).toMatchObject({
      health: 100,
      happiness: 100,
      dirt: 0,
    });

    const priced = await request(app)
      .patch("/api/admin/catalog/hat-headset")
      .set(as(ADMIN))
      .send({ price: 5, enabled: true });
    expect(
      priced.body.items.find((i: { id: string }) => i.id === "hat-headset")
        .price,
    ).toBe(5);
    const hidden = await request(app)
      .patch("/api/admin/catalog/hat-party")
      .set(as(ADMIN))
      .send({ enabled: false });
    expect(hidden.body.overrides["hat-party"]).toEqual({ enabled: false });
    expect(
      (
        await request(app)
          .patch("/api/admin/catalog/nope")
          .set(as(ADMIN))
          .send({ price: 1 })
      ).status,
    ).toBe(422);

    for (const path of [
      `/api/admin/agents/${AGENT}/coins`,
      `/api/admin/agents/${AGENT}/items`,
      "/api/admin/economy",
      "/api/admin/audit",
    ]) {
      const res = await request(app).post(path).set(as(AGENT)).send({});
      expect([403, 404]).toContain(res.status);
    }
    expect(
      (await request(app).get("/api/admin/economy").set(as(AGENT))).status,
    ).toBe(403);
    const economy = await request(app).get("/api/admin/economy").set(as(ADMIN));
    expect(economy.body.totals.adjustments).toBe(0);
  });

  it("keeps the Rocky name and the intro flag on the server", async () => {
    const app = build();
    const renamed = await request(app)
      .patch("/api/agent/me")
      .set(as(AGENT))
      .send({ rockyName: "Bolt" });
    expect(renamed.body.rockyName).toBe("Bolt");
    expect(
      (await request(app).get("/api/agent/me").set(as(AGENT))).body.rockyName,
    ).toBe("Bolt");
    const onboarded = await request(app)
      .post("/api/agent/onboarded")
      .set(as(AGENT))
      .send({});
    expect(onboarded.body.state.onboardedAt).toBeTruthy();
    const events = await request(app).get("/api/events").set(as(AGENT));
    expect(Array.isArray(events.body.events)).toBe(true);
  });

  it("survives a restart (SQLite) with pet, ledger, audit and sessions intact", async () => {
    const { path, cleanup } = tempSqlitePath();
    try {
      const first = buildSqlitePersistence(path);
      const app1 = build({}, first);
      const login = await request(app1)
        .post("/api/auth/login")
        .send({ email: AGENT, pin: "2468" });
      await request(app1)
        .post(`/api/admin/agents/${AGENT}/coins`)
        .set(as(ADMIN))
        .send({ delta: 70, note: "Restart test" });
      await request(app1)
        .post("/api/pet/actions")
        .set(bearer(login.body.token))
        .send({ type: "buy", itemId: "fx-leaves" })
        .expect(200);
      first.close();

      const second = buildSqlitePersistence(path);
      const app2 = build({}, second);
      const pet = await request(app2)
        .get("/api/pet")
        .set(bearer(login.body.token));
      expect(pet.status).toBe(200);
      expect(pet.body.coins).toBe(70);
      expect(pet.body.state.owned).toEqual([]);
      const detail = await request(app2)
        .get(`/api/admin/agents/${AGENT}/pet`)
        .set(as(ADMIN));
      expect(detail.body.hasPin).toBe(true);
      expect(detail.body.sessions).toHaveLength(1);
      second.close();
    } finally {
      cleanup();
    }
  });

  it("reset and delete clean up the pet and sign-in data", async () => {
    const app = build();
    await request(app)
      .post("/api/auth/login")
      .send({ email: AGENT, pin: "1234" });
    await request(app)
      .post(`/api/admin/agents/${AGENT}/coins`)
      .set(as(ADMIN))
      .send({ delta: 50, note: "x" });
    await request(app)
      .post(`/api/admin/agents/${AGENT}/reset`)
      .set(as(ADMIN))
      .send({});
    expect((await request(app).get("/api/pet").set(as(AGENT))).body.coins).toBe(
      0,
    );
    await request(app).delete(`/api/admin/agents/${AGENT}`).set(as(ADMIN));
    expect(
      (await request(app).post("/api/auth/status").send({ email: AGENT })).body
        .hasPin,
    ).toBe(false);
    const audit = await request(app).get("/api/admin/audit").set(as(ADMIN));
    expect(
      audit.body.entries.map((e: { action: string }) => e.action),
    ).toContain("admin.agent.deleted");
  });
});

describe("Pilot leaderboard", () => {
  it("ranks the real agents (no demo roster) without exposing emails", async () => {
    const app = build();
    await request(app)
      .post("/api/events/check-in")
      .set(as("maria.lopez@rlx.us"))
      .send({});
    await request(app).get("/api/agent/me").set(as(AGENT));
    const res = await request(app).get("/api/leaderboard").set(as(AGENT));
    expect(res.body.entries.map((e: { agentId: string }) => e.agentId)).toEqual(
      ["peer-1", AGENT],
    );
    expect(JSON.stringify(res.body)).not.toContain("maria.lopez@");
    expect(res.body.entries[0].name).toBe("Maria Lopez");
    expect(res.body.currentUser.agentId).toBe(AGENT);
    expect(res.body.currentUser.rank).toBe(2);
  });
});

describe("Admin progress controls", () => {
  it("grants XP, raises levels and unlocks evolutions through replayable events", async () => {
    const app = build();
    await request(app).get("/api/agent/me").set(as(AGENT));
    const xp = await request(app)
      .post(`/api/admin/agents/${AGENT}/xp`)
      .set(as(ADMIN))
      .send({ xp: 120, reason: "Great notes this week" });
    expect(xp.status).toBe(200);
    expect(xp.body.state.level).toBe(2);

    const lvl = await request(app)
      .post(`/api/admin/agents/${AGENT}/level`)
      .set(as(ADMIN))
      .send({ level: 4 });
    expect(lvl.body.state.level).toBe(4);
    const evo = await request(app)
      .post(`/api/admin/agents/${AGENT}/level`)
      .set(as(ADMIN))
      .send({ stage: "Advanced" });
    expect(evo.body.state.evolutionStage).toBe("Advanced");
    expect(evo.body.state.level).toBe(10);

    // Never backwards, never negative.
    expect(
      (
        await request(app)
          .post(`/api/admin/agents/${AGENT}/level`)
          .set(as(ADMIN))
          .send({ stage: "Young" })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .post(`/api/admin/agents/${AGENT}/xp`)
          .set(as(ADMIN))
          .send({ xp: -50, reason: "x" })
      ).status,
    ).toBe(422);
    expect(
      (
        await request(app)
          .post(`/api/admin/agents/${AGENT}/xp`)
          .set(as(AGENT))
          .send({ xp: 50, reason: "x" })
      ).status,
    ).toBe(403);

    // The agent sees it; the history carries it; coins follow the new levels.
    const state = await request(app).get("/api/game-state").set(as(AGENT));
    expect(state.body.evolutionStage).toBe("Advanced");
    const events = await request(app).get("/api/events").set(as(AGENT));
    expect(
      events.body.events.filter((e: { type: string }) => e.type === "XP_GRANT"),
    ).toHaveLength(3);
    const pet = await request(app).get("/api/pet").set(as(AGENT));
    expect(pet.body.earned.levels).toBe(9 * 30);
    const detail = await request(app)
      .get(`/api/admin/agents/${AGENT}/pet`)
      .set(as(ADMIN));
    expect(detail.body.audit.map((a: { action: string }) => a.action)).toEqual(
      expect.arrayContaining(["admin.xp", "admin.level", "admin.evolution"]),
    );
  });
});

describe("Note Check on the server", () => {
  it("scores answers itself and pays out once a day, into the ledger", async () => {
    const { dailyQuestions } = await import("../../src/game/notesQuiz");
    const app = build();
    const round = dailyQuestions(new Date("2026-09-08T12:00:00.000Z"));
    const perfect = Object.fromEntries(round.map((q) => [q.id, q.answer]));
    const first = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "quiz", answers: perfect });
    expect(first.body.ok).toBe(true);
    expect(first.body.coins).toBe(30);
    const second = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "quiz", answers: perfect });
    expect(second.body.coins).toBe(30);
    // Made-up question ids score nothing.
    const bogus = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "quiz", answers: { fake: 0 } });
    expect(bogus.body.state.quiz.lastScore).toBe(0);
    expect(
      (
        await request(app)
          .post("/api/pet/actions")
          .set(as(AGENT))
          .send({ type: "quiz" })
      ).status,
    ).toBe(422);
    const detail = await request(app)
      .get(`/api/admin/agents/${AGENT}/pet`)
      .set(as(ADMIN));
    expect(
      detail.body.ledger.filter((l: { kind: string }) => l.kind === "quiz"),
    ).toHaveLength(1);
  });
});

describe("Mini-games, inventory and litter", () => {
  function buildAt(start: string) {
    let now = new Date(start);
    const config = loadConfig({
      NODE_ENV: "production",
      ROCKY_PERSISTENCE_DRIVER: "sqlite",
      ROCKY_DB_PATH: "/tmp/rocky-pet-test.db",
      ROCKY_AUTH_MODE: "pilot-header",
      ROCKY_ADMIN_EMAILS: ADMIN,
    });
    const app = createApp({
      config,
      persistence: buildMemoryPersistence(),
      clock: { now: () => new Date(now) },
    });
    return {
      app,
      advance: (hours: number) =>
        (now = new Date(now.getTime() + hours * 3_600_000)),
    };
  }

  it("pays keep-it-up streaks in coins and XP (as XP_GRANT events), within the daily caps", async () => {
    const app = build();
    const r = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "keepy", touches: 12 });
    expect(r.body.ok).toBe(true);
    expect(r.body.reward).toEqual({ coins: 7, xp: 2 });
    expect(r.body.coins).toBe(7);
    const events = await request(app).get("/api/events").set(as(AGENT));
    const grant = events.body.events.find(
      (e: { type: string }) => e.type === "XP_GRANT",
    );
    expect(grant.payload).toMatchObject({ xp: 2, grantedBy: "rocky-games" });
    expect(
      (await request(app).get("/api/game-state").set(as(AGENT))).body.xp,
    ).toBe(2);
    // Absurd streaks are clamped, and the caps hold for the rest of the day.
    for (let i = 0; i < 6; i++)
      await request(app)
        .post("/api/pet/actions")
        .set(as(AGENT))
        .send({ type: "keepy", touches: 10_000 });
    const pet = await request(app).get("/api/pet").set(as(AGENT));
    expect(pet.body.state.games).toMatchObject({
      coins: 60,
      xp: 12,
      bestKeepy: 80,
    });
    expect(
      (await request(app).get("/api/game-state").set(as(AGENT))).body.xp,
    ).toBe(12);
    expect(
      (
        await request(app)
          .post("/api/pet/actions")
          .set(as(AGENT))
          .send({ type: "keepy", touches: "lots" })
      ).status,
    ).toBe(422);
  });

  it("buys food, feeds it by id and bathes with owned soaps only", async () => {
    const app = build();
    await request(app).get("/api/agent/me").set(as(AGENT));
    await request(app)
      .post(`/api/admin/agents/${AGENT}/coins`)
      .set(as(ADMIN))
      .send({ delta: 100, note: "test" });
    const pet0 = await request(app).get("/api/pet").set(as(AGENT));
    expect(pet0.body.state.inventory).toEqual({
      "soap-basic": 1,
      "food-apple": 2,
    });
    const bought = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "buyFood", foodId: "food-cake", qty: 2 });
    expect(bought.body.coins).toBe(52);
    expect(bought.body.state.inventory["food-cake"]).toBe(2);
    const fed = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "feed", food: "food-cake" });
    expect(fed.body.state.inventory["food-cake"]).toBe(1);
    const noFood = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "feed", food: "food-cocoa" });
    expect(noFood.body.reason).toBe("no-food");
    expect(
      (
        await request(app)
          .post("/api/pet/actions")
          .set(as(AGENT))
          .send({ type: "bath", soap: "soap-lavender" })
      ).body.reason,
    ).toBe("no-soap");
    await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "buySoap", soapId: "soap-bubble" });
    expect(
      (
        await request(app)
          .post("/api/pet/actions")
          .set(as(AGENT))
          .send({ type: "bath", soap: "soap-bubble" })
      ).body.ok,
    ).toBe(true);
  });

  it("drops litter over time; picking it up pays once, and gone pieces are rejected", async () => {
    const { app, advance } = buildAt("2026-09-08T12:00:00.000Z");
    expect(
      (await request(app).get("/api/pet").set(as(AGENT))).body.state.litter
        .items,
    ).toHaveLength(0);
    advance(7);
    const pet = await request(app).get("/api/pet").set(as(AGENT));
    const items = pet.body.state.litter.items;
    expect(items.length).toBe(3); // the first one after 30 min, then one every 3 h
    const first = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "litter", id: items[0].id });
    expect(first.body.ok).toBe(true);
    expect(first.body.reward.coins).toBeGreaterThan(0);
    expect(first.body.state.litter.items).toHaveLength(2);
    const again = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "litter", id: items[0].id });
    expect(again.body.reason).toBe("gone");
    advance(100);
    expect(
      (await request(app).get("/api/pet").set(as(AGENT))).body.state.litter
        .items.length,
    ).toBe(4);
  });
});

describe("Friends and visits", () => {
  it("lists every other agent without emails; a visit pays the visitor once a day and cheers the host up", async () => {
    const app = build();
    const FRIEND = "maria.lopez@rlx.us";
    await request(app).get("/api/agent/me").set(as(FRIEND));
    await request(app).post("/api/events/check-in").set(as(AGENT)).send({});
    const list = await request(app).get("/api/friends").set(as(AGENT));
    expect(list.body.friends).toHaveLength(1);
    expect(JSON.stringify(list.body)).not.toContain("@");
    const key = list.body.friends[0].id;
    expect(list.body.friends[0].name).toBe("Maria Lopez");

    const detail = await request(app).get(`/api/friends/${key}`).set(as(AGENT));
    expect(detail.body.outfit.scene).toBe("scene-route");
    expect(JSON.stringify(detail.body)).not.toContain("@");

    const visit = await request(app)
      .post(`/api/friends/${key}/visit`)
      .set(as(AGENT))
      .send({ kind: "treat" });
    expect(visit.body.ok).toBe(true);
    expect(visit.body.reward.coins).toBe(2);
    const again = await request(app)
      .post(`/api/friends/${key}/visit`)
      .set(as(AGENT))
      .send({ kind: "pet" });
    expect(again.body.reward.coins).toBe(0);

    const host = await request(app).get("/api/pet").set(as(FRIEND));
    expect(host.body.state.inbox[0].kind).toBe("visit");
    expect(host.body.state.inbox[0].text).toContain("Agent One");
    expect(host.body.treats).toBe(1);
    // Unknown keys and yourself are not friends.
    expect(
      (await request(app).get("/api/friends/f-nope").set(as(AGENT))).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post(`/api/friends/${key}/visit`)
          .set(as(AGENT))
          .send({ kind: "hug" })
      ).status,
    ).toBe(422);
  });
});

describe("Admin superpowers", () => {
  it("runs bulk coins, XP, gifts, pantry items and messages, recording each agent", async () => {
    const app = build();
    const OTHER = "maria.lopez@rlx.us";
    await request(app).get("/api/agent/me").set(as(AGENT));
    await request(app).get("/api/agent/me").set(as(OTHER));
    const coins = await request(app)
      .post("/api/admin/bulk")
      .set(as(ADMIN))
      .send({
        agentIds: [AGENT, OTHER],
        op: { kind: "coins", delta: 25, note: "Great week" },
      });
    expect(coins.body).toMatchObject({ done: 2, total: 2 });
    const xp = await request(app)
      .post("/api/admin/bulk")
      .set(as(ADMIN))
      .send({
        agentIds: "all",
        op: { kind: "xp", xp: 120, reason: "Pilot kickoff" },
      });
    expect(xp.body.done).toBe(xp.body.total);
    await request(app)
      .post("/api/admin/bulk")
      .set(as(ADMIN))
      .send({
        agentIds: [AGENT],
        op: { kind: "inventory", itemId: "food-pumpkin-pie", qty: 3 },
      });
    await request(app)
      .post("/api/admin/bulk")
      .set(as(ADMIN))
      .send({ agentIds: [AGENT], op: { kind: "item", itemId: "hat-crown" } });
    await request(app)
      .post("/api/admin/bulk")
      .set(as(ADMIN))
      .send({
        agentIds: [AGENT],
        op: { kind: "message", text: "Happy Halloween, team!" },
      });
    const pet = await request(app).get("/api/pet").set(as(AGENT));
    expect(pet.body.coins).toBe(25 + 30);
    expect(pet.body.state.inventory["food-pumpkin-pie"]).toBe(3);
    expect(pet.body.state.granted).toContain("hat-crown");
    expect(pet.body.state.inbox.map((e: { kind: string }) => e.kind)).toEqual([
      "message",
      "gift",
      "gift",
    ]);
    expect(
      (await request(app).get("/api/game-state").set(as(OTHER))).body.level,
    ).toBe(2);
    // Validation and access.
    expect(
      (
        await request(app)
          .post("/api/admin/bulk")
          .set(as(ADMIN))
          .send({ agentIds: ["nobody@rlx.us"], op: { kind: "needs" } })
      ).status,
    ).toBe(422);
    expect(
      (
        await request(app)
          .post("/api/admin/bulk")
          .set(as(AGENT))
          .send({ agentIds: "all", op: { kind: "needs" } })
      ).status,
    ).toBe(403);
    const audit = await request(app).get("/api/admin/audit").set(as(ADMIN));
    expect(audit.body.entries.map((a: { action: string }) => a.action)).toEqual(
      expect.arrayContaining([
        "admin.bulk",
        "admin.inventory",
        "admin.message",
      ]),
    );
  });
});

describe("Limited collections", () => {
  it("are closed by default; an admin opens them (optionally for a window) and bought items stay after closing", async () => {
    const app = build();
    await request(app).get("/api/agent/me").set(as(AGENT));
    await request(app)
      .post(`/api/admin/agents/${AGENT}/coins`)
      .set(as(ADMIN))
      .send({ delta: 500, note: "test" });
    const buy = (itemId: string) =>
      request(app)
        .post("/api/pet/actions")
        .set(as(AGENT))
        .send({ type: "buy", itemId });
    expect((await buy("hat-witch")).body.reason).toBe("unavailable");
    expect(
      (
        await request(app)
          .post("/api/pet/actions")
          .set(as(AGENT))
          .send({ type: "buyFood", foodId: "food-candy-corn" })
      ).body.reason,
    ).toBe("unavailable");

    // A window that hasn't started yet keeps it closed (the test clock is 2026-09-08).
    await request(app)
      .patch("/api/admin/collections/spooky")
      .set(as(ADMIN))
      .send({ enabled: true, from: "2026-10-01", until: "2026-11-02" });
    expect((await buy("hat-witch")).body.reason).toBe("unavailable");
    const opened = await request(app)
      .patch("/api/admin/collections/spooky")
      .set(as(ADMIN))
      .send({ enabled: true, from: "2026-09-01", until: "2026-11-02" });
    expect(
      opened.body.collections.find((c: { id: string }) => c.id === "spooky"),
    ).toMatchObject({ enabled: true, open: true });
    expect((await buy("hat-witch")).body.ok).toBe(true);
    expect((await buy("hat-crown")).body.reason).not.toBe("unavailable"); // regular items unaffected

    await request(app)
      .patch("/api/admin/collections/spooky")
      .set(as(ADMIN))
      .send({ enabled: false });
    expect((await buy("hat-pumpkin")).body.reason).toBe("unavailable");
    const equip = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({
        type: "equip",
        outfit: { hat: "hat-witch", scene: "scene-route", decor: [], fx: null },
      });
    expect(equip.body.state.outfit.hat).toBe("hat-witch"); // exclusives bought while open are kept

    expect(
      (
        await request(app)
          .patch("/api/admin/collections/spooky")
          .set(as(AGENT))
          .send({ enabled: true })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .patch("/api/admin/collections/nope")
          .set(as(ADMIN))
          .send({ enabled: true })
      ).status,
    ).toBe(422);
    expect(
      (
        await request(app)
          .patch("/api/admin/collections/spooky")
          .set(as(ADMIN))
          .send({ enabled: true, from: "10/01" })
      ).status,
    ).toBe(422);
    const audit = await request(app).get("/api/admin/audit").set(as(ADMIN));
    expect(
      audit.body.entries.map((a: { action: string }) => a.action),
    ).toContain("admin.collection");
  });
});

describe("Arcade", () => {
  it("pays coins (no XP) for arcade rounds and records them", async () => {
    const app = build();
    const r = await request(app)
      .post("/api/pet/actions")
      .set(as(AGENT))
      .send({ type: "arcade", game: "simon", score: 6 });
    expect(r.body.ok).toBe(true);
    expect(r.body.reward).toEqual({ coins: 6, xp: 0 });
    expect(
      (await request(app).get("/api/game-state").set(as(AGENT))).body.xp,
    ).toBe(0);
    expect(
      (
        await request(app)
          .post("/api/pet/actions")
          .set(as(AGENT))
          .send({ type: "arcade", game: "poker", score: 6 })
      ).status,
    ).toBe(422);
    const detail = await request(app)
      .get(`/api/admin/agents/${AGENT}/pet`)
      .set(as(ADMIN));
    expect(detail.body.ledger[0]).toMatchObject({ kind: "game", delta: 6 });
  });

  it("lets an admin switch games on and off for everyone", async () => {
    const app = build();
    const typo = () =>
      request(app).post("/api/pet/actions").set(as(AGENT)).send({ type: "arcade", game: "typo", score: 3 });
    expect((await typo()).body).toMatchObject({ ok: false, reason: "unavailable" });
    const games = await request(app).get("/api/admin/games").set(as(ADMIN));
    expect(games.body.games.find((g: { id: string }) => g.id === "typo")).toMatchObject({ enabled: false });
    await request(app).put("/api/admin/games/typo").set(as(ADMIN)).send({ enabled: true }).expect(200);
    expect((await typo()).body).toMatchObject({ ok: true });
    await request(app).put("/api/admin/games/catch").set(as(ADMIN)).send({ enabled: false }).expect(200);
    expect(
      (await request(app).post("/api/pet/actions").set(as(AGENT)).send({ type: "arcade", game: "catch", score: 3 })).body,
    ).toMatchObject({ ok: false, reason: "unavailable" });
    expect((await request(app).put("/api/admin/games/typo").set(as(AGENT)).send({ enabled: false })).status).toBe(403);
  });
});

describe("Shop unlocks", () => {
  it("unlocks an item, a section or the whole shop to BUY, and gifts a whole section", async () => {
    const app = build();
    const buy = (itemId: string) =>
      request(app).post("/api/pet/actions").set(as(AGENT)).send({ type: "buy", itemId });
    await request(app).get("/api/pet").set(as(AGENT)).expect(200);
    await request(app).post(`/api/admin/agents/${AGENT}/coins`).set(as(ADMIN)).send({ delta: 5000, note: "test" }).expect(200);
    expect((await buy("hat-knight")).body).toMatchObject({ ok: false, reason: "locked" });
    await request(app).post(`/api/admin/agents/${AGENT}/items`).set(as(ADMIN)).send({ itemId: "hat-knight", action: "unlock" }).expect(200);
    const bought = await buy("hat-knight");
    expect(bought.body.ok).toBe(true);
    expect(bought.body.state.owned).toContain("hat-knight");
    // A whole section, then the whole shop.
    expect((await buy("glasses-diamond")).body.reason).toBe("locked");
    await request(app).post("/api/admin/bulk").set(as(ADMIN)).send({ agentIds: [AGENT], op: { kind: "item", itemId: "slot:glasses", mode: "unlock" } }).expect(200);
    expect((await buy("glasses-diamond")).body.ok).toBe(true);
    expect((await buy("scene-space")).body.reason).toBe("locked");
    await request(app).post(`/api/admin/agents/${AGENT}/items`).set(as(ADMIN)).send({ itemId: "*", action: "unlock" }).expect(200);
    expect((await buy("scene-space")).body.ok).toBe(true);
    // Gift-only and admin-only items can't be unlocked for purchase.
    expect((await request(app).post(`/api/admin/agents/${AGENT}/items`).set(as(ADMIN)).send({ itemId: "back-tester-wings", action: "unlock" })).status).toBe(422);
    // Gifting a whole section.
    const gifted = await request(app).post(`/api/admin/agents/${AGENT}/items`).set(as(ADMIN)).send({ itemId: "slot:decor", action: "grant" });
    expect(gifted.body.state.granted).toContain("decor-piano");
    expect(gifted.body.state.granted).not.toContain("back-nova-wings");
  });
});
