import type { GameSave, Rarity, SummonOutcome } from "../types";
import { CARDS, CARD_MAP, CFG, RARITIES, rarityIndex, rarityOf } from "../data/cards";

export const defaultSave = (): GameSave => ({
  gem: CFG.startGem,
  own: {},
  pulls: 0,
});

/** Also validates manual imports and shields the app from malformed local storage. */
export function parseSave(value: unknown): GameSave | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<GameSave>;
  if (typeof raw.gem !== "number" || !Number.isSafeInteger(raw.gem) || raw.gem < 0) return null;
  if (typeof raw.pulls !== "number" || !Number.isSafeInteger(raw.pulls) || raw.pulls < 0) return null;
  if (!raw.own || typeof raw.own !== "object" || Array.isArray(raw.own)) return null;
  const own: Record<string, number> = {};
  for (const [id, count] of Object.entries(raw.own)) {
    if (!CARD_MAP.has(id)) continue;
    if (!Number.isSafeInteger(count) || count < 0) return null;
    if (count > 0) own[id] = count;
  }
  return { gem: raw.gem, pulls: raw.pulls, own };
}

export function loadSave(): GameSave {
  try {
    const text = localStorage.getItem(CFG.saveKey);
    if (!text) return defaultSave();
    return parseSave(JSON.parse(text)) ?? defaultSave();
  } catch {
    return defaultSave();
  }
}

export function persistSave(save: GameSave): void {
  try {
    localStorage.setItem(CFG.saveKey, JSON.stringify(save));
  } catch (error) {
    console.error("BTWRD CHRONICLES 저장 실패:", error);
  }
}

export function rollRarity(minName?: Rarity): Rarity {
  // Matches V0.1: exclude unavailable rarities; conditional 11th draw is
  // re-normalized among eligible rarities.
  const min = minName ? rarityIndex(minName) : 0;
  const pool = RARITIES.filter((r, i) =>
    i >= min && r.rate > 0 && CARDS.some(card => card.rarity === r.name));
  const total = pool.reduce((sum, rarity) => sum + rarity.rate, 0);
  let roll = Math.random() * total;
  for (const rarity of pool) {
    roll -= rarity.rate;
    if (roll < 0) return rarity.name;
  }
  return pool[pool.length - 1].name;
}

export function summonCards(game: GameSave, count: number, price: number): SummonOutcome | null {
  if (!Number.isSafeInteger(count) || count < 1 || game.gem < price) return null;
  const own = { ...game.own };
  const results: SummonOutcome["results"] = [];
  let refund = 0;

  for (let i = 0; i < count; i++) {
    const isBonus = count === CFG.multiCount && i === count - 1;
    const rarity = rollRarity(isBonus ? CFG.bonusMinRarity : undefined);
    const pool = CARDS.filter(card => card.rarity === rarity);
    const card = pool[Math.floor(Math.random() * pool.length)];
    const first = !own[card.id];

    if (!first) refund += rarityOf(card.rarity).refund;
    own[card.id] = (own[card.id] ?? 0) + 1;
    results.push({ card, first });
  }

  return {
    next: {
      gem: game.gem - price + refund,
      pulls: game.pulls + count,
      own,
    },
    results,
    refund,
  };
}

export function collectionStats(game: GameSave) {
  const owned = CARDS.filter(card => (game.own[card.id] ?? 0) > 0).length;
  const duplicates = Object.values(game.own).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  return { owned, duplicates, total: CARDS.length };
}
