// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import type {Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

vi.mock('../graphics/Battlefield3D',()=>({
  default:()=> <div className="battlefield-3d" data-testid="mock-3d"/>,
}));

import App from '../App';

let root:Root;
let host:HTMLDivElement;
const buttonContaining=(text:string):HTMLButtonElement=>{
  const found=Array.from(host.querySelectorAll('button')).find(b=>b.textContent?.includes(text));
  if(!found)throw Error('Missing button: '+text);
  return found;
};

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

describe('COMBAT ALPHA V0.5.4.1 right-side turn button and central field-magic layout',()=>{
  it('has one primary turn-end button at the right midpoint, not inside the top HUD',async()=>{
    await act(async()=>root.render(<App/>));
    await act(async()=>buttonContaining('⚔ 전투').click());

    const stage=host.querySelector('.battle-field-stage')!;
    const right=stage.querySelector('.field-turn-actionbar[data-placement="right-center"]');
    expect(right).not.toBeNull();
    expect(right?.classList.contains('field-turn-actionbar-side')).toBe(true);
    expect(right?.querySelectorAll('button.field-end-turn')).toHaveLength(1);
    expect(stage.querySelectorAll('button.field-end-turn')).toHaveLength(1);
    expect(stage.querySelector('.field-top-hud .field-end-turn')).toBeNull();
    expect(host.textContent).toContain('V0.5.4.1');

    await act(async()=>{
      (right!.querySelector('button.field-end-turn') as HTMLButtonElement).click();
    });
    expect(host.textContent).toContain('ROUND 2');
    expect(stage.querySelector('[data-placement="right-center"]')).not.toBeNull();
  });

  it('has exactly one centered neutral field-magic slot plus six independent rear magic slots',async()=>{
    await act(async()=>root.render(<App/>));
    await act(async()=>buttonContaining('⚔ 전투').click());

    const stage=host.querySelector('.battle-field-stage')!;
    const shared=stage.querySelector('[data-zone="shared-field"]') as HTMLElement;
    expect(shared).not.toBeNull();
    expect(stage.querySelectorAll('[data-zone="shared-field"]')).toHaveLength(1);
    expect(shared.dataset.placement).toBe('battle-center');
    expect(shared.classList.contains('field-shared-magic-center')).toBe(true);
    expect(shared.getAttribute('aria-label')).toContain('정중앙');
    expect(shared.textContent).toContain('공용 필드마법');
    expect(shared.textContent).toContain('빈 슬롯');
    expect(shared.querySelector('button')).toBeNull();
    expect(stage.querySelectorAll('[data-zone="magic"]')).toHaveLength(6);
    expect(stage.querySelectorAll('[data-zone="unit"]')).toHaveLength(6);
    expect(stage.querySelectorAll('[data-zone="wall"]')).toHaveLength(6);
    expect(stage.querySelectorAll('.field-hand-card')).toHaveLength(5);
    expect(stage.querySelector('.field-center-mark')).toBeNull();
  });

  it('keeps the central field mark and right-side end turn in both 2D and 3D modes',async()=>{
    await act(async()=>root.render(<App/>));
    await act(async()=>buttonContaining('⚔ 전투').click());
    expect(host.querySelector('[data-testid="mock-3d"]')).not.toBeNull();

    await act(async()=>buttonContaining('3D ON').click());
    expect(host.querySelector('.field-2d-background')).not.toBeNull();
    expect(host.querySelector('[data-zone="shared-field"]')).not.toBeNull();
    expect(host.querySelector('[data-placement="right-center"]')).not.toBeNull();

    await act(async()=>buttonContaining('▤ 2D').click());
    expect(host.querySelector('[data-testid="mock-3d"]')).not.toBeNull();
    expect(host.querySelector('[data-zone="shared-field"]')).not.toBeNull();
    expect(host.querySelectorAll('button.field-end-turn')).toHaveLength(1);
  });

  it('still allows attack, hand discard and other action flow; field slot is not an enabled spell target',async()=>{
    await act(async()=>root.render(<App/>));
    await act(async()=>buttonContaining('⚔ 전투').click());
    const slot=host.querySelector('[data-zone="shared-field"]') as HTMLElement;
    const hand=host.querySelector('.field-hand-card') as HTMLButtonElement;
    expect(slot.tagName).toBe('DIV');
    expect(hand).not.toBeNull();
    await act(async()=>hand.click());
    expect(host.querySelector('[data-zone="shared-field"]')).toBe(slot);
    expect(host.querySelector('[data-zone="shared-field"]')?.classList.contains('field-zone-target')).toBe(false);
    expect(host.querySelectorAll('button.field-end-turn')).toHaveLength(1);
  });
});
