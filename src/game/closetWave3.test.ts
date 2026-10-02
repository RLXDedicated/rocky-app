import { describe, expect, it } from "vitest";
import { CLOSET, findItem, itemsFor, STAFF_ITEMS } from "./closet";

describe("third-wave closet", () => {
  it("adds about fifty new shop items with unique ids", () => {
    const ids = CLOSET.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const wave = ["glasses-visor", "hat-knight", "neck-gem", "decor-piano", "scene-forest"];
    for (const id of wave) expect(findItem(id)?.price).toBeGreaterThan(0);
  });

  it("keeps the testers' wings out of the shop until an admin gifts them", () => {
    expect(itemsFor("back").some((i) => i.id === "back-tester-wings")).toBe(false);
    expect(itemsFor("back", CLOSET, ["back-tester-wings"]).some((i) => i.id === "back-tester-wings")).toBe(true);
    expect(findItem("back-tester-wings")?.isUnlocked({ level: 99, stage: "legend" as never, bestStreak: 99, checkIns: 99, qaPasses: 99, badgeIds: [] })).toBe(false);
  });

  it("makes the Nova wings a Rocky-admin item", () => {
    expect(STAFF_ITEMS).toContain("back-nova-wings");
    expect(findItem("back-nova-wings")?.staff).toBe(true);
  });
});
