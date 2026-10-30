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

describe('COMBAT ALPHA V0.4.1 independent battle scene',()=>{
  it('hides the global page header and nav during battle, keeping the 3D scene and hand visible',async()=>{
    await act(async()=>root.render(<App/>));
    expect(host.querySelector('.app-tabs')).not.toBeNull();
    expect(host.querySelector('.topbar')).not.toBeNull();

    await act(async()=>clickButton('⚔ 전투'));
    expect(host.querySelector('.battle-scene-root')).not.toBeNull();
    expect(host.querySelector('.app-tabs')).toBeNull();
    expect(host.querySelector('.topbar')).toBeNull();
    expect(host.querySelector('.battle-scene-side-panel')).not.toBeNull();
    expect(host.querySelector('.battle-scene-board>.combat-arena')).not.toBeNull();
    expect(host.querySelector('[data-testid="mock-3d"]')).not.toBeNull();
    expect(host.querySelector('.combat-hand-v033')).not.toBeNull();
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
    expect(host.querySelector('.combat-log-drawer')).toBeNull();
    await act(async()=>clickButton('전투 기록'));
    expect(host.querySelector('.combat-log-drawer')).not.toBeNull();
    expect(host.querySelector('.combat-hand-v033')).not.toBeNull();
    await act(async()=>clickButton('닫기'));
    expect(host.querySelector('.combat-log-drawer')).toBeNull();
  });
});
