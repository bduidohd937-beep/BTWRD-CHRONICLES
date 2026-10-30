// @vitest-environment jsdom
import {useState} from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import type {Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import BattleApp from './BattleApp';
import {newBattle,playCard} from '../engine';
import {cards} from '../data/cards';
import type {BattleState,Card,Unit} from '../types';

vi.mock('../graphics/Battlefield3D',()=>({
  default:()=> <div className="battlefield-3d" data-testid="mock-3d"/>,
}));

let host:HTMLDivElement,root:Root,latest:BattleState;
const opponent:Unit={
  cardId:'U001',name:'왕국 병사',atk:2,hp:1,maxHp:1,
  canAttack:false,taunt:false,stance:'attack',temporaryAttack:0,
};
function AppHarness({optional=false}:{optional?:boolean}){
  const [battle,setBattle]=useState<BattleState>(()=>{
    const deck:Card[]=cards.map(card=>card.id==='U003'&&optional?
      {...card,text:'소환 시 적 유닛 하나에게 피해 1을 줄 수 있다'}:card);
    const game=newBattle(deck);
    game.players[0].mana=3;
    game.players[0].maxMana=3;
    game.players[1].lanes[1]=[{...opponent}];
    const played=playCard(game,2,0,'attack');
    latest=played;
    return played;
  });
  const update=(next:BattleState)=>{latest=next;setBattle(next);};
  return <BattleApp battle={battle} setBattle={update}/>;
}
beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  host=document.createElement('div');
  document.body.appendChild(host);
  root=createRoot(host);
});
afterEach(async()=>{
  await act(async()=>root.unmount());
  host.remove();
});

describe('V0.5.4 elective on-summon flow and compact target prompts',()=>{
  it('shows activate and skip, keeps enemy target disabled until activation, and resolves after click',async()=>{
    await act(async()=>root.render(<AppHarness/>));
    const prompt=host.querySelector('.field-effect-pending')!;
    expect(prompt).not.toBeNull();
    expect(prompt.textContent).toContain('왕국 궁수');
    expect(prompt.textContent).toContain('효과 발동');
    expect(prompt.textContent).toContain('넘기기');
    const target=()=>host.querySelector('button[data-zone="unit"][data-owner="1"][data-lane="1"]') as HTMLButtonElement;
    expect(target().className).not.toContain('field-zone-target');
    expect(target().disabled).toBe(false); // Still inspectable, not a legal effect target.
    await act(async()=>Array.from(prompt.querySelectorAll('button')).find(b=>b.textContent?.includes('효과 발동'))!.click());
    expect(latest.pendingEffect?.awaitingChoice).toBe(false);
    expect(target().className).toContain('field-zone-target');
    expect(host.querySelector('.field-effect-pending')?.textContent).toContain('발동 취소');
    await act(async()=>target().click());
    expect(latest.pendingEffect).toBeUndefined();
    expect(host.querySelector('.field-effect-pending')).toBeNull();
    expect(host.querySelector('.field-effect-caption')?.textContent).toContain('왕국 궁수 소환 효과');
    expect(latest.players[1].lanes[1]).toHaveLength(0);
    expect(latest.players[0].mana).toBe(0);
  });

  it('lets player skip original on-summon effects without refunding spent mana',async()=>{
    await act(async()=>root.render(<AppHarness/>));
    const skip=host.querySelector('.field-effect-decline') as HTMLButtonElement;
    expect(skip).not.toBeNull();
    expect(skip.textContent).toContain('넘기기');
    await act(async()=>skip.click());
    expect(latest.pendingEffect).toBeUndefined();
    expect(latest.players[1].lanes[1]).toHaveLength(1);
    expect(latest.players[0].mana).toBe(0);
    expect(host.querySelector('.field-effect-pending')).toBeNull();
  });

  it('lets player cancel targeting after choosing activation',async()=>{
    await act(async()=>root.render(<AppHarness optional/>));
    const accept=Array.from(host.querySelectorAll('.field-effect-pending button'))
      .find(el=>el.textContent?.includes('효과 발동')) as HTMLButtonElement;
    await act(async()=>accept.click());
    expect(latest.pendingEffect?.awaitingChoice).toBe(false);
    const cancel=host.querySelector('.field-effect-decline') as HTMLButtonElement;
    await act(async()=>cancel.click());
    expect(latest.pendingEffect).toBeUndefined();
    expect(latest.players[1].lanes[1]).toHaveLength(1);
  });
});
