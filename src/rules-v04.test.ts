import {describe,expect,it} from 'vitest';
import {cards} from './data/cards';
import {
  attackUnit,canPlayCard,endTurn,eligibleEffectLanes,guardCovers,
  legalAttackTargets,newBattle,playCard,resolvePendingEffect,
} from './engine';
import type {Unit} from './types';

const card=(id:string)=>cards.find(c=>c.id===id)!;
const troop=(id='U001',extra:Partial<Unit>={}):Unit=>({
  cardId:id,name:card(id).name,atk:card(id).atk??2,
  hp:card(id).hp??2,maxHp:card(id).hp??2,
  canAttack:false,taunt:false,stance:'attack',temporaryAttack:0,
  ...extra,
});

describe('COMBAT V0.4 — directional taunt',()=>{
  it('requires center taunt summon to select left or right guard',()=>{
    const b=newBattle(cards);
    b.players[0].mana=10;
    b.players[0].hand[0]={...card('U002')};
    expect(playCard(b,0,1)).toBe(b);
    const next=playCard(b,0,1,'attack',0);
    expect(next.players[0].lanes[1][0].guardSide).toBe(0);
  });

  it('left taunt intercepts center wall attack and can be attacked in its own lane',()=>{
    let b=newBattle(cards);
    b.players[0].lanes[1]=[troop('U003',{canAttack:true,hp:5,maxHp:5})];
    b.players[1].lanes[0]=[troop('U002',{taunt:true,hp:4,maxHp:4})];
    expect(guardCovers(b.players[1].lanes[0][0],0,1)).toBe(true);
    expect(legalAttackTargets(b,1)).toEqual({unitLanes:[0],wallLane:null});
    expect(attackUnit(b,1,0,null)).toBe(b);
    b=attackUnit(b,1,0,0,0);
    expect(b.players[1].lanes[0][0].hp).toBe(1);
    expect(b.players[0].lanes[1][0].canAttack).toBe(false);
    expect(b.players[1].walls[1]).toBe(9);
  });

  it('same-lane defender has priority over adjacent taunt',()=>{
    const b=newBattle(cards);
    b.players[0].lanes[1]=[troop('U003',{canAttack:true})];
    b.players[1].lanes[0]=[troop('U002',{taunt:true})];
    b.players[1].lanes[1]=[troop('U001')];
    expect(legalAttackTargets(b,1)).toEqual({unitLanes:[1],wallLane:null});
    expect(attackUnit(b,1,0,0,0)).toBe(b);
  });

  it('center guard protects only chosen flank and not the other',()=>{
    const b=newBattle(cards);
    b.players[0].lanes[0]=[troop('U003',{canAttack:true})];
    b.players[0].lanes[2]=[troop('U003',{canAttack:true})];
    b.players[1].lanes[1]=[troop('U002',{taunt:true,guardSide:0})];
    expect(legalAttackTargets(b,0)).toEqual({unitLanes:[1],wallLane:null});
    expect(legalAttackTargets(b,2)).toEqual({unitLanes:[],wallLane:2});
  });

  it('spell-granted center taunt requires selected guard direction too',()=>{
    const b=newBattle(cards);
    b.players[0].hand=[{...card('S002')}];
    b.players[0].lanes[1]=[troop('U001')];
    expect(canPlayCard(b,0,1)).toBe(true);
    expect(playCard(b,0,1)).toBe(b);
    const next=playCard(b,0,1,'attack',2);
    expect(next.players[0].lanes[1][0].taunt).toBe(true);
    expect(next.players[0].lanes[1][0].guardSide).toBe(2);
  });
});

describe('COMBAT V0.4 — on-summon target selection',()=>{
  it('archer targets one enemy unit, resolves its effect, and moves the victim to grave',()=>{
    let b=newBattle(cards);
    b.players[0].mana=10;
    b.players[0].hand[0]={...card('U003')};
    b.players[1].lanes[2]=[troop('U001',{hp:1,maxHp:1})];
    b=playCard(b,0,0);
    expect(b.pendingEffect).toMatchObject({type:'enemy-damage',amount:1,owner:0});
    expect(eligibleEffectLanes(b)).toEqual([2]);
    expect(endTurn(b)).toBe(b);
    expect(resolvePendingEffect(b,0)).toBe(b);
    b=resolvePendingEffect(b,2);
    expect(b.pendingEffect).toBeUndefined();
    expect(b.players[1].lanes[2]).toHaveLength(0);
    expect(b.players[1].grave[b.players[1].grave.length-1]?.id).toBe('U001');
  });

  it('priest selects a wounded allied unit; an unwounded battlefield does not block play',()=>{
    let b=newBattle(cards);
    b.players[0].mana=10;
    b.players[0].hand[0]={...card('U004')};
    b.players[0].lanes[2]=[troop('U002',{hp:1,maxHp:4})];
    b=playCard(b,0,1);
    expect(eligibleEffectLanes(b)).toEqual([2]);
    b=resolvePendingEffect(b,2);
    expect(b.players[0].lanes[2][0].hp).toBe(3);
    expect(b.pendingEffect).toBeUndefined();
  });

  it('scout card still draws when summoned and failed mandatory draw loses',()=>{
    let b=newBattle(cards);
    b.players[0].mana=10;
    b.players[0].hand[0]={...card('U006')};
    b.players[0].deck=[];
    b=playCard(b,0,2);
    expect(b.winner).toBe('플레이어 B');
  });

  it('Serentia disables its chosen enemy for exactly one own-turn refresh (test assumption)',()=>{
    let b=newBattle(cards);
    b.players[0].mana=10;
    b.players[0].hand[0]={...card('M001')};
    b.players[1].lanes[2]=[troop('U001',{canAttack:true})];
    b=playCard(b,0,1);
    expect(b.pendingEffect?.type).toBe('enemy-disable');
    b=resolvePendingEffect(b,2);
    b=endTurn(b);
    expect(b.players[1].lanes[2][0].canAttack).toBe(false);
    expect(b.players[1].lanes[2][0].stunnedTurns).toBe(0);
    b=endTurn(b);
    b=endTurn(b);
    expect(b.players[1].lanes[2][0].canAttack).toBe(true);
  });
});

describe('COMBAT V0.4 — magic slot foundation',()=>{
  it('starts with exactly three empty magic slots on each side',()=>{
    const b=newBattle(cards);
    expect(b.players[0].spellZones).toEqual([null,null,null]);
    expect(b.players[1].spellZones).toEqual([null,null,null]);
  });

  it('sends an installed spell from a collapsed wall lane to the defending grave',()=>{
    let b=newBattle(cards);
    b.players[0].lanes[0]=[troop('U001',{canAttack:true})];
    b.players[1].walls[0]=1;
    b.players[1].spellZones[0]={cardId:'S001',name:card('S001').name,kind:'continuous'};
    b=attackUnit(b,0,0,null);
    expect(b.players[1].walls[0]).toBe(0);
    expect(b.players[1].spellZones[0]).toBeNull();
    expect(b.players[1].grave.map(c=>c.id)).toContain('S001');
    expect(b.players[0].lanes[0][0].canAttack).toBe(false);
  });
});
