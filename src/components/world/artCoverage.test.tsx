import { describe, expect, it } from "vitest";
import { CLOSET } from "../../game/closet";
import { FOODS, SOAPS } from "../../game/pantry";
import { DECOR_ART, FX_ART, HAT_ART } from "./art";
import { fxPreview } from "./FxLayer";
import { FOOD_ART, SOAP_ART } from "./items";
import { WEAR_ART } from "./wearables";

// Every item sold in the shop must have its drawing; a missing one shows as
// an empty card and an invisible item on Rocky.
describe("shop art coverage", () => {
  it("draws every closet item", () => {
    const missing = CLOSET.filter((item) => {
      switch (item.slot) {
        case "hat":
          return !HAT_ART[item.id];
        case "decor":
          return !DECOR_ART[item.id];
        case "fx":
          return !FX_ART[item.id] && !fxPreview(item.id);
        case "glasses":
        case "neck":
        case "back":
        case "body":
          return !WEAR_ART[item.slot][item.id];
        default:
          return false;
      }
    }).map((item) => item.id);
    expect(missing).toEqual([]);
  });

  it("draws every food and soap", () => {
    expect(FOODS.filter((f) => !FOOD_ART[f.id]).map((f) => f.id)).toEqual([]);
    expect(SOAPS.filter((s) => !SOAP_ART[s.id]).map((s) => s.id)).toEqual([]);
  });
});
