export type CardType = '유닛' | '마법';
export type Stance = 'attack' | 'defense';

export interface Card {
  id:string;
  name:string;
  rarity:string;
  type:CardType;
  cost:number;
  atk?:number;
  hp?:number;
  text:string;
  temp?:boolean;
}

export interface Unit {
  cardId:string;
  name:string;
  atk:number;
  hp:number;
  maxHp:number;
  canAttack:boolean;
  taunt:boolean;
  stance:Stance;
  temporaryAttack:number;
  /** Center-lane taunt may guard one chosen adjacent side. */
  guardSide?:0|2;
  /** Number of this unit's own turns to skip because of disable effects. */
  stunnedTurns?:number;
}

export interface InstalledSpell {
  cardId:string;
  name:string;
  kind:'continuous'|'equipment';
  equippedUnitCardId?:string;
}
export interface PendingEffect {
  owner:number;
  sourceCardId:string;
  type:'enemy-damage'|'ally-heal'|'enemy-disable';
  amount:number;
}
export interface Player {
  name:string;
  // Kept for compatibility with legacy prototype state; only wall HP determines combat victory.
  hp:number;
  mana:number;
  maxMana:number;
  turnsTaken:number;
  deck:Card[];
  hand:Card[];
  grave:Card[];
  /** One installed magic slot per active lane; currently only reserved, not activated. */
  spellZones:(InstalledSpell|null)[];
  lanes:Unit[][];
  walls:number[];
}

export interface BattleState {
  turn:number;
  active:number;
  players:[Player,Player];
  log:string[];
  winner?:string;
  discarding?:boolean;
  pendingRetreat?:{owner:number;from:number};
  pendingEffect?:PendingEffect;
}
