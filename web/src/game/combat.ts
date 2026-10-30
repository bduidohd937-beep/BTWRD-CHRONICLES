import type { ChronicleCard } from "../types";

export type PlayerId = 0 | 1;
export type Lane = 0 | 1 | 2;
export type CombatUnit = { id: string; cardId: string; owner: PlayerId; lane: Lane; atk: number; hp: number; maxHp: number; summonedTurn: number; attacked: boolean; charge: boolean };
export type CombatPlayer = { mana: number; maxMana: number; deck: string[]; hand: string[]; graveyard: string[]; walls: [number, number, number] };
export type CombatState = { turn: number; active: PlayerId; winner: PlayerId | null; players: [CombatPlayer, CombatPlayer]; units: CombatUnit[]; log: string[] };
export type CombatAction = { type: "summon"; player: PlayerId; card: ChronicleCard; lane: Lane } | { type: "attack"; player: PlayerId; unitId: string } | { type: "endTurn"; player: PlayerId };

const wallMax: [number, number, number] = [8, 9, 8];
export function createCombatState(deck: string[], seed = 1): CombatState {
  const shuffled = [...deck]; let s = seed >>> 0;
  for (let i = shuffled.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const draw = (d: string[], n: number) => d.splice(0, n);
  const a = { mana: 2, maxMana: 2, deck: shuffled.slice(), hand: [] as string[], graveyard: [], walls: [...wallMax] as [number, number, number] };
  const b = { mana: 2, maxMana: 2, deck: shuffled.slice(), hand: [] as string[], graveyard: [], walls: [...wallMax] as [number, number, number] };
  a.hand = draw(a.deck, 5); b.hand = draw(b.deck, 5);
  return { turn: 1, active: 0, winner: null, players: [a, b], units: [], log: ["전투 시작: 각 플레이어 손패 5장, 마나 2" ] };
}
export function validateAction(state: CombatState, action: CombatAction): string | null {
  if (state.winner !== null) return "전투가 이미 종료되었습니다.";
  if (action.player !== state.active) return "현재 플레이어의 턴이 아닙니다.";
  const p = state.players[action.player];
  if (action.type === "summon") { if (action.card.type !== "유닛") return "V0.1은 유닛만 소환할 수 있습니다."; if (p.mana < action.card.cost) return "마나가 부족합니다."; if (!p.hand.includes(action.card.id)) return "해당 카드가 손패에 없습니다."; if (p.hand.length > 7) return "턴 종료 전에 손패를 7장 이하로 정리하세요."; }
  if (action.type === "attack") { const u = state.units.find(x => x.id === action.unitId); if (!u || u.owner !== action.player) return "내 유닛만 공격할 수 있습니다."; if (u.attacked) return "이 유닛은 이번 턴 이미 공격했습니다."; if (u.summonedTurn === state.turn && !u.charge) return "소환한 턴에는 공격할 수 없습니다."; }
  return null;
}
export function applyCombatAction(state: CombatState, action: CombatAction): CombatState {
  const error = validateAction(state, action); if (error) return { ...state, log: [...state.log, `실패: ${error}`] };
  const next: CombatState = { ...state, players: state.players.map(p => ({ ...p, hand: [...p.hand], deck: [...p.deck], graveyard: [...p.graveyard], walls: [...p.walls] })) as [CombatPlayer, CombatPlayer], units: state.units.map(u => ({ ...u })), log: [...state.log] };
  const p = next.players[action.player]; const enemy = next.players[(1 - action.player) as PlayerId];
  if (action.type === "summon") { p.hand.splice(p.hand.indexOf(action.card.id), 1); p.mana -= action.card.cost; next.units.push({ id: `${action.player}-${next.units.length}`, cardId: action.card.id, owner: action.player, lane: action.lane, atk: action.card.atk ?? 0, hp: action.card.hp ?? 1, maxHp: action.card.hp ?? 1, summonedTurn: next.turn, attacked: false, charge: action.card.text.includes("소환 턴") }); next.log.push(`P${action.player + 1}이(가) ${action.card.name}을(를) ${["좌", "중앙", "우"][action.lane]} 전선에 소환`); }
  if (action.type === "attack") { const u = next.units.find(x => x.id === action.unitId)!; u.attacked = true; const target = next.units.find(x => x.owner !== action.player && x.lane === u.lane && x.hp > 0); if (target) { target.hp -= u.atk; next.log.push(`${u.cardId}가 적 유닛에 ${u.atk} 피해`); } else { enemy.walls[u.lane] = Math.max(0, enemy.walls[u.lane] - u.atk); next.log.push(`${u.cardId}가 ${["좌", "중앙", "우"][u.lane]} 성벽에 ${u.atk} 피해`); } next.units = next.units.filter(x => x.hp > 0); if (enemy.walls.every(x => x === 0)) next.winner = action.player; }
  if (action.type === "endTurn") { if (p.hand.length > 7) { next.log.push("손패 7장 초과: 초과 카드는 묘지로 보내야 합니다(간이 처리)."); while (p.hand.length > 7) p.graveyard.push(p.hand.pop()!); } next.active = (1 - action.player) as PlayerId; next.turn += action.player === 1 ? 1 : 0; const np = next.players[next.active]; np.maxMana = Math.min(10, np.maxMana + 1); np.mana = np.maxMana; next.units.filter(u => u.owner === next.active).forEach(u => u.attacked = false); if (np.deck.length) np.hand.push(np.deck.shift()!); else next.winner = (1 - next.active) as PlayerId; next.log.push(`P${next.active + 1} 턴 시작: 마나 ${np.mana}, 카드 1장 드로우`); }
  return next;
}
