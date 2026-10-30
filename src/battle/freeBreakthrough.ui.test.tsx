// @vitest-environment jsdom
import {useState} from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import type {Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import BattleApp from './BattleApp';
import {newBattle} from '../engine';
import {cards} from '../data/cards';
import type {BattleState,Unit} from '../types';

vi.mock('../graphics/Battlefield3D',()=>({
  default:()=> <div className="battlefield-3d" data-testid="mock-3d"/>,
}));

let root:Root;
let container:HTMLDivElement;
let latest:BattleState;
const troop=(id='L001',patch:Partial<Unit>={}):Unit=>{
  const card=cards.find(c=>c.id===id)!;
  return {
    cardId:card.id,name:card.name,atk:card.atk??4,hp:card.hp??8,
    maxHp:card.hp??8,taunt:false,stance:'attack',
    canAttack:true,temporaryAttack:0,...patch,
  };
};
function setup(withDefender=false){
  const initial=newBattle(cards);
  initial.players[0].lanes[0]=[troop()];
  initial.players[1].walls[0]=0;
  if(withDefender)initial.players[1].lanes[1]=[troop('U001',{atk:2,hp:2,maxHp:2})];
  latest=initial;
  return function Harness(){
    const [battle,setBattle]=useState(initial);
    const update=(next:BattleState)=>{latest=next;setBattle(next);};
    return <BattleApp battle={battle} setBattle={update}/>;
  };
}
const field=(zone:'unit'|'wall',owner:number,lane:number)=>
  container.querySelector('button[data-zone="'+zone+'"][data-owner="'+owner+'"][data-lane="'+lane+'"]') as HTMLButtonElement;

beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  container=document.createElement('div');
  document.body.appendChild(container);
  root=createRoot(container);
});
afterEach(async()=>{
  await act(async()=>root.unmount());
  container.remove();
});
describe('V0.5.2 free-breakthrough field interactions',()=>{
  it('shows two clickable glowing enemy walls and deals full damage to a cross-lane target',async()=>{
    const Harness=setup();
    await act(async()=>root.render(<Harness/>));
    expect(field('wall',1,1).disabled).toBe(true);
    await act(async()=>field('unit',0,0).click());
    for(const lane of [1,2]){
      const wall=field('wall',1,lane);
      expect(wall.disabled).toBe(false);
      expect(wall.dataset.breakthrough).toBe('true');
      expect(wall.className).toContain('field-wall-breakthrough');
      expect(wall.getAttribute('aria-label')).toContain('자유 돌파');
    }
    expect(field('wall',1,0).disabled).toBe(true);
    await act(async()=>field('wall',1,2).click());
    expect(latest.players[1].walls).toEqual([0,9,4]);
    expect(latest.players[0].mana).toBe(2);
    expect(latest.players[0].lanes[0][0].canAttack).toBe(false);
    expect(container.textContent).toContain('자유 돌파');
  });
  it('keeps a guarded destination wall disabled but lets the player attack the guard',async()=>{
    const Harness=setup(true);
    await act(async()=>root.render(<Harness/>));
    await act(async()=>field('unit',0,0).click());
    expect(field('wall',1,1).disabled).toBe(true);
    expect(field('unit',1,1).disabled).toBe(false);
    expect(field('wall',1,2).disabled).toBe(false);
    await act(async()=>field('unit',1,1).click());
    expect(latest.players[1].lanes[1]).toHaveLength(0);
    expect(latest.players[1].walls[1]).toBe(9);
  });
});
