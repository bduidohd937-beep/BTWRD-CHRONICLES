import {describe,expect,it} from 'vitest';
import {cards} from './data/cards';
import {
  activatePendingEffect,eligibleEffectLanes,isPendingEffectAwaitingChoice,
  isPendingEffectOptional,newBattle,playCard,resolvePendingEffect,skipPendingEffect,
} from './engine';
import type {Card,Unit} from './types';

const enemyUnit=():Unit=>({
  cardId:'U001',name:'왕국 병사',atk:2,hp:1,maxHp:1,
  canAttack:true,taunt:false,stance:'attack',temporaryAttack:0,
});

function summoned(printOptional=false){
  const deck:Card[]=cards.map(c=>c.id==='U003'&&printOptional?
    {...c,text:'소환 시 적 유닛 하나에 피해 1을 줄 수 있다'}:c);
  const state=newBattle(deck);
  state.players[0].maxMana=3;
  state.players[0].mana=3;
  state.players[1].lanes[1]=[enemyUnit()];
  return playCard(state,2,0,'attack');
}

describe('V0.5.4 prototype: optional on-summon effect decisions',()=>{
  it('offers activate/skip even when original printed U003 effect text is imperative',()=>{
    const state=summoned();
    expect(state.pendingEffect?.sourceCardId).toBe('U003');
    expect(isPendingEffectOptional(state)).toBe(true);
    expect(isPendingEffectAwaitingChoice(state)).toBe(true);
    expect(eligibleEffectLanes(state)).toEqual([]);
    expect(resolvePendingEffect(state,1)).toBe(state);
    expect(state.players[1].lanes[1]).toHaveLength(1);
  });

  it('activates once, then resolves target and damage once, without additional mana',()=>{
    const state=summoned();
    const active=activatePendingEffect(state);
    expect(active).not.toBe(state);
    expect(active.pendingEffect?.awaitingChoice).toBe(false);
    expect(isPendingEffectAwaitingChoice(active)).toBe(false);
    expect(eligibleEffectLanes(active)).toEqual([1]);
    expect(activatePendingEffect(active)).toBe(active);
    expect(active.players[0].mana).toBe(0);
    const result=resolvePendingEffect(active,1);
    expect(result.pendingEffect).toBeUndefined();
    expect(result.players[1].lanes[1]).toHaveLength(0);
    expect(result.players[0].mana).toBe(0);
    expect(resolvePendingEffect(result,1)).toBe(result);
    expect(state.pendingEffect?.awaitingChoice).toBe(true);
  });

  it('skips printed mandatory-style text without refunding summon cost',()=>{
    const state=summoned();
    const skipped=skipPendingEffect(state);
    expect(skipped.pendingEffect).toBeUndefined();
    expect(skipped.players[0].mana).toBe(0);
    expect(skipped.players[1].lanes[1]).toHaveLength(1);
    expect(skipped.log[0]).toContain('발동하지 않음');
    expect(skipPendingEffect(skipped)).toBe(skipped);
  });

  it('can cancel even after choosing activation but before selecting target',()=>{
    const active=activatePendingEffect(summoned());
    const skipped=skipPendingEffect(active);
    expect(skipped.pendingEffect).toBeUndefined();
    expect(skipped.players[1].lanes[1]).toHaveLength(1);
  });

  it('honors a future explicitly mandatory effect exception',()=>{
    const state=summoned(true);
    state.pendingEffect!.mandatory=true;
    expect(isPendingEffectOptional(state)).toBe(false);
    expect(skipPendingEffect(state)).toBe(state);
    const active=activatePendingEffect(state);
    const resolved=resolvePendingEffect(active,1);
    expect(resolved.players[1].lanes[1]).toHaveLength(0);
  });

  it('does not create effect choice when the relevant target is absent',()=>{
    const state=newBattle(cards);
    state.players[0].maxMana=3;
    state.players[0].mana=3;
    const summoned=playCard(state,2,0,'attack');
    expect(summoned.pendingEffect).toBeUndefined();
    expect(isPendingEffectOptional(summoned)).toBe(false);
  });
});
