import { describe, expect, it } from "vitest";
import { applyCombatAction, createCombatState } from "./combat";
import { CARDS } from "../data/cards";
const unit = CARDS.find(c => c.type === "유닛")!;
const deck = Array.from({ length: 25 }, () => unit.id);
describe("combat alpha", () => {
  it("starts with three walls and five cards", () => { const s = createCombatState(deck); expect(s.players[0].walls).toEqual([8,9,8]); expect(s.players[0].hand).toHaveLength(5); });
  it("summons, ends turn, and refills mana", () => { let s = createCombatState(deck); s = applyCombatAction(s, { type: "summon", player: 0, card: unit, lane: 1 }); expect(s.players[0].mana).toBe(2 - unit.cost); s = applyCombatAction(s, { type: "endTurn", player: 0 }); expect(s.active).toBe(1); expect(s.players[1].mana).toBe(3); });
});
