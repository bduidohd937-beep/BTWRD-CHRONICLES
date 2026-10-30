export type CardType = '유닛' | '마법';
export interface Card { id:string; name:string; rarity:string; type:CardType; cost:number; atk?:number; hp?:number; text:string; temp?:boolean }
export interface Unit { cardId:string; name:string; atk:number; hp:number; maxHp:number; canAttack:boolean; taunt:boolean }
export interface Player { name:string; hp:number; mana:number; maxMana:number; deck:Card[]; hand:Card[]; grave:Card[]; lanes:Unit[][]; walls:number[] }
export interface BattleState { turn:number; active:number; players:[Player,Player]; log:string[]; winner?:string }
