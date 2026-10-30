// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import type {Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

vi.mock('../graphics/Battlefield3D',()=>({
  default:()=> <div className="battlefield-3d" data-testid="mock-3d">Three.js scene</div>,
}));

import App from '../App';

let host:HTMLDivElement;
let root:Root;

function clickButton(text:string){
  const button=Array.from(host.querySelectorAll('button')).find(
    candidate=>candidate.textContent?.includes(text),
  );
  if(!button)throw new Error('Cannot find button: '+text);
  if(button.disabled)throw new Error('Button disabled: '+text);
  button.dispatchEvent(new MouseEvent('click',{bubbles:true}));
}

beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  localStorage.clear();
  host=document.createElement('div');
  document.body.appendChild(host);
  root=createRoot(host);
});

afterEach(async()=>{
  await act(async()=>root.unmount());
  host.remove();
  localStorage.clear();
  document.body.style.overflow='';
});

describe('COMBAT ALPHA V0.5.0 full battlefield overlay',()=>{
  it('hides the global page header and nav during battle, keeping the 3D scene and hand visible',async()=>{
    await act(async()=>root.render(<App/>));
    expect(host.querySelector('.app-tabs')).not.toBeNull();
    expect(host.querySelector('.topbar')).not.toBeNull();

    await act(async()=>clickButton('⚔ 전투'));
    expect(host.querySelector('.battle-scene-root')).not.toBeNull();
    expect(host.querySelector('.app-tabs')).toBeNull();
    expect(host.querySelector('.topbar')).toBeNull();
    expect(host.querySelector('.battle-scene-side-panel')).toBeNull();
    expect(host.querySelector('.battle-field-stage')).not.toBeNull();
    expect(host.querySelector('.field-layout-overlay')).not.toBeNull();
    expect(host.querySelector('[data-testid="mock-3d"]')).not.toBeNull();
    expect(host.querySelector('.battle-field-stage .field-hand-fan')).not.toBeNull();
    expect(host.querySelectorAll('.battle-field-stage .field-hand-card')).toHaveLength(5);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('requires confirmation to leave and resumes the same match after returning from lobby',async()=>{
    await act(async()=>root.render(<App/>));
    await act(async()=>clickButton('⚔ 전투'));
    await act(async()=>clickButton('턴 종료'));
    expect(host.textContent).toContain('ROUND 2');

    await act(async()=>clickButton('로비로'));
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain('현재 전투는 그대로 보존됩니다');
    expect(host.querySelector('.battle-scene-root')).not.toBeNull();

    await act(async()=>clickButton('계속 플레이'));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(host.textContent).toContain('ROUND 2');

    await act(async()=>clickButton('로비로'));
    await act(async()=>clickButton('로비로 이동'));
    expect(host.querySelector('.battle-scene-root')).toBeNull();
    expect(host.querySelector('.app-tabs')).not.toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');

    await act(async()=>clickButton('전투 이어하기'));
    expect(host.querySelector('.battle-scene-root')).not.toBeNull();
    expect(host.textContent).toContain('ROUND 2');
  });

  it('does not reset the battle until restart is explicitly confirmed',async()=>{
    await act(async()=>root.render(<App/>));
    await act(async()=>clickButton('⚔ 전투'));
    await act(async()=>clickButton('턴 종료'));
    expect(host.textContent).toContain('ROUND 2');

    await act(async()=>clickButton('새 전투'));
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async()=>clickButton('계속 플레이'));
    expect(host.textContent).toContain('ROUND 2');

    await act(async()=>clickButton('새 전투'));
    await act(async()=>clickButton('새 전투 시작'));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(host.textContent).toContain('ROUND 1');
  });

  it('opens the log on demand without pushing it into the board or hand layout',async()=>{
    await act(async()=>root.render(<App/>));
    await act(async()=>clickButton('⚔ 전투'));
    expect(host.querySelector('.field-log-drawer')).toBeNull();
    await act(async()=>clickButton('전투 기록'));
    expect(host.querySelector('.field-log-drawer')).not.toBeNull();
    expect(host.querySelector('.field-hand-fan')).not.toBeNull();
    await act(async()=>clickButton('닫기'));
    expect(host.querySelector('.field-log-drawer')).toBeNull();
  });
  it('keeps 5 cards inside the field and has six unit, rear magic and wall slots',async()=>{
    await act(async()=>root.render(<App/>));
    await act(async()=>clickButton('⚔ 전투'));
    const stage=host.querySelector('.battle-field-stage');
    expect(stage).not.toBeNull();
    expect(stage!.querySelector('.field-hand-fan')).not.toBeNull();
    expect(stage!.querySelectorAll('.field-hand-card')).toHaveLength(5);
    expect(stage!.querySelectorAll('[data-zone="unit"]')).toHaveLength(6);
    expect(stage!.querySelectorAll('[data-zone="magic"]')).toHaveLength(6);
    expect(stage!.querySelectorAll('[data-zone="wall"]')).toHaveLength(6);
    expect(stage!.querySelector('[data-zone="shared-field"]')).not.toBeNull();
  });

  it('puts magic behind the unit for both player perspectives',async()=>{
    await act(async()=>root.render(<App/>));
    await act(async()=>clickButton('⚔ 전투'));
    const enemy=host.querySelector('.field-formation-enemy .field-formation-column')!;
    const ally=host.querySelector('.field-formation-self .field-formation-column')!;
    const order=(element:Element)=>Array.from(element.children)
      .filter(el=>el.hasAttribute('data-zone'))
      .map(el=>el.getAttribute('data-zone'));
    expect(order(enemy)).toEqual(['wall','magic','unit']);
    expect(order(ally)).toEqual(['unit','magic','wall']);
  });

  it('deploys a card through the clickable full-field unit slot without sidebar',async()=>{
    await act(async()=>root.render(<App/>));
    await act(async()=>clickButton('⚔ 전투'));
    const myZone=()=>host.querySelector('button[data-zone="unit"][data-owner="0"][data-lane="0"]') as HTMLButtonElement;
    expect(myZone().textContent).not.toContain('왕국 병사');
    const first=host.querySelector('.field-hand-card') as HTMLButtonElement;
    await act(async()=>first.dispatchEvent(new MouseEvent('click',{bubbles:true})));
    expect(myZone().disabled).toBe(false);
    expect(myZone().className).toContain('field-zone-target');
    await act(async()=>myZone().dispatchEvent(new MouseEvent('click',{bubbles:true})));
    expect(myZone().textContent).toContain('왕국 병사');
    expect(host.querySelectorAll('.field-hand-card')).toHaveLength(4);
  });

});
