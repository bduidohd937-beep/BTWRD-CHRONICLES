import { describe, expect, it } from "vitest";
import { CFG } from "./foundationCards";
import { defaultSave, parseSave, summonCards } from "./summon";

describe("developer-only unlimited summons", () => {
  it("does not permit unaffordable summons in normal mode", () => {
    const save = { ...defaultSave(), gem: 0 };
    expect(summonCards(save, 1, CFG.single)).toBeNull();
    expect(summonCards(save, CFG.multiCount, CFG.multi, false)).toBeNull();
  });

  it("allows summons in developer mode without spending or increasing saved GEM", () => {
    const save = { ...defaultSave(), gem: 0 };
    const result = summonCards(save, CFG.multiCount, CFG.multi, true);
    expect(result).not.toBeNull();
    expect(result!.results).toHaveLength(CFG.multiCount);
    expect(result!.next.gem).toBe(0);
    expect(result!.next.pulls).toBe(CFG.multiCount);
    expect(Object.values(result!.next.own).reduce((a, b) => a + b, 0))
      .toBe(CFG.multiCount);
    expect(save.own).toEqual({});
    expect(save.pulls).toBe(0);
  });

  it("keeps the original saved GEM, pull count, and owned cards compatible", () => {
    const previous = { gem: 640, pulls: 77, own: { U001: 3 } };
    expect(parseSave(previous)).toEqual(previous);
  });

  it("charges currency normally outside developer mode", () => {
    const save = { ...defaultSave(), gem: CFG.single };
    const result = summonCards(save, 1, CFG.single, false);
    expect(result).not.toBeNull();
    expect(result!.next.gem).toBeGreaterThanOrEqual(0);
    expect(result!.next.gem).toBeLessThanOrEqual(CFG.single);
    expect(result!.next.pulls).toBe(1);
  });
});
