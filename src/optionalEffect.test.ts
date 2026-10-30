import {describe,expect,it} from 'vitest';
import {cards} from './data/cards';
import {
  eligibleEffectLanes,isPendingEffectOptional,newBattle,playCard,
  resolvePendingEffect,skipPendingEffect,
} from './engine';
import type {Card,Unit} from './types';

const troop=():Unit=>({
  cardId:'U001',name:'왕국 병사',atk:2,hp:1,maxHp:1,
  canAttack:true,taunt:false,stance:'attack',temporaryAttack:0,
});

function triggered(optional:boolean){
  const chosen:Card[]=cards.map(c=>c.id==='U003'?{
    ...c,text:optional?'소환 시 적 유닛 하나에 피해 1을 줄 수 있다':
      '소환 시 적 유닛 하나에 피해 1',
  }:c);
  const initial=newBattle(chosen);
  initial.players[0].mana=3;
  initial.players[0].maxMana=3;
  initial.players[1].lanes[1]=[troop()];
  return playCard(initial,2,0,'attack'); // initial hand index 2 is U003
}

describe('V0.5.3 summon effect optionality follows printed card text',()=>{
  it('requires resolving mandatory on-summon damage; cannot skip',()=>{
    const s=triggered(false);
    expect(s.pendingEffect?.sourceCardId).toBe('U003');
    expect(isPendingEffectOptional(s)).toBe(false);
    expect(skipPendingEffect(s)).toBe(s);
    expect(eligibleEffectLanes(s)).toEqual([1]);
    const resolved=resolvePendingEffect(s,1);
    expect(resolved.pendingEffect).toBeUndefined();
    expect(resolved.players[1].lanes[1]).toHaveLength(0);
  });

  it('allows declining only textually optional summon effects with no further resource loss',()=>{
    const s=triggered(true);
    expect(s.players[0].mana).toBe(0);
    expect(s.pendingEffect?.sourceCardId).toBe('U003');
    expect(isPendingEffectOptional(s)).toBe(true);
    const next=skipPendingEffect(s);
    expect(next).not.toBe(s);
    expect(next.pendingEffect).toBeUndefined();
    expect(next.players[0].mana).toBe(0);
    expect(next.players[1].lanes[1]).toHaveLength(1);
    expect(next.log[0]).toContain('발동하지 않음');
    expect(s.pendingEffect).toBeDefined();
    expect(skipPendingEffect(next)).toBe(next);
  });

  it('does not treat fixed summon triggers as optional merely because a player could prefer skipping',()=>{
    const s=triggered(false);
    expect(isPendingEffectOptional(s)).toBe(false);
  });
});
