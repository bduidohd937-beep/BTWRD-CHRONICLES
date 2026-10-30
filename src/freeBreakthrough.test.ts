import {describe,expect,it} from 'vitest';
import {cards} from './data/cards';
import {attackUnit,endTurn,legalAttackTargets,newBattle,resolveRetreat} from './engine';
import type {BattleState,Unit} from './types';

const card=(id:string)=>cards.find(c=>c.id===id)!;
const troop=(id='U001',patch:Partial<Unit>={}):Unit=>({
  cardId:id,name:card(id).name,atk:card(id).atk??2,
  hp:card(id).hp??2,maxHp:card(id).hp??2,
  canAttack:true,taunt:false,stance:'attack',temporaryAttack:0,
  ...patch,
});
const battle=(lane=0):BattleState=>{
  const b=newBattle(cards);
  b.players[0].lanes[lane]=[troop('L001',{atk:4,hp:8,maxHp:8})];
  return b;
};

describe('COMBAT V0.5.2 — adopted siege rule A: free breakthrough',()=>{
  it('preserves ordinary same-lane attack before the opposite wall falls',()=>{
    const b=battle(0);
    expect(legalAttackTargets(b,0)).toEqual({unitLanes:[],wallLane:0});
    expect(attackUnit(b,0,0,null,1)).toBe(b);
    expect(b.players[1].walls).toEqual([8,9,8]);
  });

  it('opens both remaining walls when the opposing wall is destroyed',()=>{
    const b=battle(0);
    b.players[1].walls[0]=0;
    expect(legalAttackTargets(b,0)).toEqual({
      unitLanes:[],wallLane:null,wallLanes:[1,2],
    });
  });

  it('lets a left-side unit attack the far right wall for full damage and no extra mana',()=>{
    const b=battle(0);
    b.players[1].walls[0]=0;
    b.players[0].mana=3;
    const next=attackUnit(b,0,0,null,2);
    expect(next).not.toBe(b);
    expect(next.players[1].walls).toEqual([0,9,4]);
    expect(next.players[0].mana).toBe(3);
    expect(next.players[0].lanes[0][0].canAttack).toBe(false);
    expect(next.log[0]).toContain('자유 돌파 공성');
    expect(next.log[0]).toContain('좌 → 우');
    expect(attackUnit(next,0,0,null,1)).toBe(next);
    expect(b.players[1].walls).toEqual([0,9,8]);
  });

  it('does not bypass a defender standing in the destination lane',()=>{
    const b=battle(0);
    b.players[1].walls[0]=0;
    b.players[1].lanes[1]=[troop('U002',{taunt:false,hp:4,maxHp:4})];
    expect(legalAttackTargets(b,0)).toEqual({
      unitLanes:[1],wallLane:null,wallLanes:[2],
    });
    expect(attackUnit(b,0,0,null,1)).toBe(b);
    const attacked=attackUnit(b,0,0,0,1);
    expect(attacked).not.toBe(b);
    expect(attacked.players[1].lanes[1]).toHaveLength(0);
    expect(attacked.players[1].walls[1]).toBe(9);
    expect(attackUnit(b,0,0,null,2)).not.toBe(b);
  });

  it('preserves taunt interception in another wall lane during breakthrough',()=>{
    const b=battle(0);
    b.players[1].walls[0]=0;
    b.players[1].lanes[1]=[
      troop('U002',{taunt:true,guardSide:2,hp:4,maxHp:4}),
    ];
    // Center taunt blocks its own wall and the right wall, but not the left.
    expect(legalAttackTargets(b,0)).toEqual({
      unitLanes:[1],wallLane:null,wallLanes:[],
    });
    expect(attackUnit(b,0,0,null,2)).toBe(b);
    expect(attackUnit(b,0,0,0,1)).not.toBe(b);
  });

  it('preserves the original same-lane defender priority even after wall collapse',()=>{
    const b=battle(0);
    b.players[1].walls[0]=0;
    b.players[1].lanes[0]=[troop('U001')];
    expect(legalAttackTargets(b,0)).toEqual({unitLanes:[0],wallLane:null});
    expect(attackUnit(b,0,0,null,1)).toBe(b);
  });

  it('works symmetrically for player B on its own turn',()=>{
    let b=battle(0);
    b.players[1].lanes[2]=[troop('U003',{atk:3})];
    b.players[0].walls[2]=0;
    b=endTurn(b);
    expect(b.active).toBe(1);
    expect(legalAttackTargets(b,2)).toEqual({
      unitLanes:[],wallLane:null,wallLanes:[0,1],
    });
    const next=attackUnit(b,2,0,null,0);
    expect(next.players[0].walls).toEqual([5,9,0]);
    expect(next.players[1].mana).toBe(b.players[1].mana);
  });

  it('destroys the last active wall to win without a penalty',()=>{
    const b=battle(0);
    b.players[1].walls=[0,0,3];
    const next=attackUnit(b,0,0,null,2);
    expect(next.players[1].walls).toEqual([0,0,0]);
    expect(next.winner).toBe('플레이어 A');
    expect(attackUnit(next,0,0,null,2)).toBe(next);
  });

  it('does not open attacks when the unit is exhausted or in defense stance',()=>{
    const b=battle(0);
    b.players[1].walls[0]=0;
    b.players[0].lanes[0][0].canAttack=false;
    expect(legalAttackTargets(b,0).wallLanes).toBeUndefined();
    expect(attackUnit(b,0,0,null,2)).toBe(b);
    b.players[0].lanes[0][0].canAttack=true;
    b.players[0].lanes[0][0].stance='defense';
    expect(legalAttackTargets(b,0).wallLanes).toBeUndefined();
    expect(attackUnit(b,0,0,null,2)).toBe(b);
  });

  it('retreat from an allied broken wall does not consume the relocated unit action',()=>{
    const b=battle(0);
    b.players[0].walls[0]=0;
    b.players[0].lanes[0][0].canAttack=true;
    b.pendingRetreat={owner:0,from:0};
    expect(attackUnit(b,0,0,null,1)).toBe(b);
    const next=resolveRetreat(b,1);
    expect(next.pendingRetreat).toBeUndefined();
    expect(next.players[0].lanes[0]).toHaveLength(0);
    expect(next.players[0].lanes[1][0].canAttack).toBe(true);
    expect(next.players[0].walls[0]).toBe(0);
  });

  it('disallows attacking a zero-HP wall or taking an additional turn after the win',()=>{
    const b=battle(0);
    b.players[1].walls=[0,0,0];
    expect(legalAttackTargets(b,0)).toEqual({
      unitLanes:[],wallLane:null,wallLanes:[],
    });
    expect(attackUnit(b,0,0,null,0)).toBe(b);
    expect(attackUnit(b,0,0,null,1)).toBe(b);
  });
});
