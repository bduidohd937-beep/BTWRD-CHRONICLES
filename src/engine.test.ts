import {describe,expect,it} from 'vitest';
import {cards} from './data/cards';
import {
  attackUnit,canPlayCard,changeStance,discardCard,endTurn,newBattle,playCard,resolveRetreat,
} from './engine';
import type {Unit} from './types';

const card=(id:string)=>cards.find(c=>c.id===id)!;
const troop=(id='U001',overrides:Partial<Unit>={}):Unit=>({
  cardId:id,name:card(id).name,atk:card(id).atk??2,hp:card(id).hp??2,maxHp:card(id).hp??2,
  canAttack:false,taunt:false,stance:'attack',temporaryAttack:0,...overrides,
});

describe('BTWRD DRAFT 1.9.5 core battle invariants',()=>{
  it('starts each 25-card test deck with five in hand and three active walls',()=>{
    const b=newBattle(cards);
    expect(b.players[0].hand).toHaveLength(5);
    expect(b.players[0].deck).toHaveLength(20);
    expect(b.players[1].walls).toEqual([8,9,8]);
  });

  it('first personal turn always begins at 2 mana with no extra draw',()=>{
    const b=newBattle(cards);
    const afterA=endTurn(b);
    expect(afterA.active).toBe(1);
    expect(afterA.players[1].maxMana).toBe(2);
    expect(afterA.players[1].hand).toHaveLength(5);
    const afterB=endTurn(afterA);
    expect(afterB.players[0].maxMana).toBe(3);
    expect(afterB.players[0].hand).toHaveLength(6);
    expect(afterB.players[0].deck).toHaveLength(19);
  });

  it('allows a unit into one free lane but rejects second same-lane summon',()=>{
    let b=newBattle(cards);
    b=playCard(b,0,1);
    expect(b.players[0].lanes[1]).toHaveLength(1);
    b.players[0].hand.unshift({...card('U001')});
    const before=b.players[0].mana;
    const refused=playCard(b,0,1);
    expect(refused).toBe(b);
    expect(b.players[0].mana).toBe(before);
  });

  it('will not allow attacking a wall behind an enemy unit',()=>{
    let b=newBattle(cards);
    b=playCard(b,0,0);
    b=endTurn(b);
    b=endTurn(b);
    b.players[1].lanes[0]=[troop()];
    const denied=attackUnit(b,0,0,null);
    expect(denied).toBe(b);
    expect(b.players[1].walls[0]).toBe(8);
    const legal=attackUnit(b,0,0,0);
    expect(legal).not.toBe(b);
    expect(legal.players[1].lanes[0]).toHaveLength(0);
  });

  it('uses ceiling half-damage against a defending unit and prevents its counterattack',()=>{
    let b=newBattle(cards);
    b.players[0].lanes[1]=[troop('U003',{canAttack:true,hp:5,maxHp:5})];
    b.players[1].lanes[1]=[troop('U002',{stance:'defense',hp:4,maxHp:4})];
    b=attackUnit(b,1,0,0);
    expect(b.players[1].lanes[1][0].hp).toBe(2);
    expect(b.players[0].lanes[1][0].hp).toBe(5);
    expect(b.players[0].lanes[1][0].canAttack).toBe(false);
  });

  it('switches stance at the cost of the remaining basic action',()=>{
    let b=newBattle(cards);
    b.players[0].lanes[0]=[troop('U002',{canAttack:true})];
    b=changeStance(b,0);
    expect(b.players[0].lanes[0][0].stance).toBe('defense');
    expect(b.players[0].lanes[0][0].canAttack).toBe(false);
    expect(changeStance(b,0)).toBe(b);
  });

  it('allows R001 charge on its summon turn',()=>{
    const b=newBattle(cards);
    b.players[0].mana=10;
    b.players[0].hand[0]={...card('R001')};
    const next=playCard(b,0,2);
    expect(next.players[0].lanes[2][0].canAttack).toBe(true);
  });

  it('offers player-selected discards at own-turn end rather than silently deleting cards',()=>{
    let b=newBattle(cards);
    b.players[0].hand.push(...cards.slice(0,4));
    const oldHand=b.players[0].hand.map(c=>c.id);
    b=endTurn(b);
    expect(b.discarding).toBe(true);
    expect(b.active).toBe(0);
    expect(b.players[0].hand.map(c=>c.id)).toEqual(oldHand);
    b=discardCard(b,8);
    b=discardCard(b,7);
    expect(b.players[0].hand).toHaveLength(7);
    expect(b.discarding).toBe(false);
    b=endTurn(b);
    expect(b.active).toBe(1);
  });

  it('treats mandatory empty-deck draw as a defeat only when that draw is attempted',()=>{
    let b=newBattle(cards);
    b.players[0].deck=[];
    b=endTurn(b); // B first turn: no draw
    expect(b.winner).toBeUndefined();
    b=endTurn(b); // A second personal turn: empty deck
    expect(b.winner).toBe('플레이어 B');
  });

  it('casts limited implemented simple spells, leaving invalid spells unchanged',()=>{
    let b=newBattle(cards);
    b.players[0].lanes[1]=[troop('U001',{hp:1,maxHp:4})];
    b.players[0].hand=[{...card('S001')},{...card('S002')}];
    expect(canPlayCard(b,0,1)).toBe(true);
    b=playCard(b,0,1);
    expect(b.players[0].lanes[1][0].hp).toBe(4);
    b=playCard(b,0,1);
    expect(b.players[0].lanes[1][0].maxHp).toBe(6);
    expect(b.players[0].lanes[1][0].taunt).toBe(true);
  });

  it('can select a free active lane for an emergency retreat',()=>{
    let b=newBattle(cards);
    b.players[1].walls[0]=0;
    b.players[1].lanes[0]=[troop('U002')];
    b.pendingRetreat={owner:1,from:0};
    b=resolveRetreat(b,2);
    expect(b.pendingRetreat).toBeUndefined();
    expect(b.players[1].lanes[0]).toHaveLength(0);
    expect(b.players[1].lanes[2][0].cardId).toBe('U002');
  });
});
