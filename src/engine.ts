import type {BattleState,Card,PendingEffect,Player,Stance,Unit} from './types';

const WALL_NAMES=['좌','중앙','우'] as const;
const MAX_HAND=7;
const MAX_MANA=10;
export const SUPPORTED_SPELLS=new Set(['S001','S002','S003','R004','H004']);
let cardsRef:Card[]=[];
export const configureCards=(cards:Card[])=>{cardsRef=cards;};
const cardById=(id:string)=>cardsRef.find(card=>card.id===id);
const isLane=(lane:number)=>Number.isInteger(lane)&&lane>=0&&lane<3;

export const makePlayer=(name:string):Player=>{
  // Stable 25-card prototype deck, not yet connected to a collection/deck builder.
  const deck=Array.from({length:25},(_,i)=>({...cardsRef[i%cardsRef.length]}));
  return {
    name,hp:20,mana:2,maxMana:2,turnsTaken:0,
    deck:deck.slice(5),hand:deck.slice(0,5),
    grave:[],lanes:[[],[],[]],spellZones:[null,null,null],walls:[8,9,8],
  };
};

export const newBattle=(cards:Card[]):BattleState=>{
  if(!cards.length)throw new Error('전투 덱에 카드가 없습니다.');
  configureCards(cards);
  return {turn:1,active:0,players:[makePlayer('플레이어 A'),makePlayer('플레이어 B')],log:['전투 시작 — 플레이어 A 선공']};
};

const canAct=(s:BattleState)=>!s.winner&&!s.discarding&&!s.pendingRetreat&&!s.pendingEffect;
const isTargetSpell=(id:string)=>id==='S001'||id==='S002'||id==='H004';

/** Side taunts guard their adjacent center; center taunts choose one side at summon. */
export function guardCovers(unit:Unit,unitLane:number,protectedLane:number):boolean{
  if(!unit.taunt)return false;
  if(unitLane===protectedLane)return true;
  if(unitLane===0||unitLane===2)return protectedLane===1;
  return protectedLane===unit.guardSide;
}

/**
 * Legal targets for this unit's single basic attack.
 *
 * The legacy wallLane is kept for ordinary same-lane attacks. When the opposite
 * wall has already fallen, siege rule A opens wallLanes for other active lanes,
 * with no attack or mana penalty. Each destination still respects its own
 * defender and any taunt protecting that destination. No wall can be bypassed
 * through its defenders.
 */
export function legalAttackTargets(state:BattleState,lane:number,unitIndex=0):{
  unitLanes:number[];wallLane:number|null;wallLanes?:number[]
}{
  const empty={unitLanes:[] as number[],wallLane:null};
  if(!canAct(state)||!isLane(lane))return empty;
  const attacker=state.players[state.active].lanes[lane][unitIndex];
  if(!attacker||!attacker.canAttack||attacker.stance!=='attack')return empty;
  const enemy=state.players[1-state.active];

  // A defender standing directly opposite must be fought before breaking out.
  if(enemy.lanes[lane].length>0)return {unitLanes:[lane],wallLane:null};
  const guards=[0,1,2].filter(i=>enemy.lanes[i].some(u=>guardCovers(u,i,lane)));
  if(guards.length>0)return {unitLanes:guards,wallLane:null};

  // Before the opposite wall falls, keep the original same-lane attack rule.
  if(enemy.walls[lane]>0)return {unitLanes:[],wallLane:lane};

  // A — free breakthrough: any remaining active wall may be targeted, even
  // at a non-adjacent lane, without extra mana or reduced damage.
  const unitLanes=new Set<number>();
  const wallLanes:number[]=[];
  for(let targetLane=0;targetLane<3;targetLane++){
    if(enemy.walls[targetLane]<=0)continue;
    if(enemy.lanes[targetLane].length>0){
      unitLanes.add(targetLane);
      continue;
    }
    const interceptors=[0,1,2].filter(i=>
      enemy.lanes[i].some(u=>guardCovers(u,i,targetLane)));
    if(interceptors.length){
      interceptors.forEach(i=>unitLanes.add(i));
    }else{
      wallLanes.push(targetLane);
    }
  }
  return {unitLanes:[...unitLanes],wallLane:null,wallLanes};
}


export function canPlayCard(state:BattleState,index:number,lane:number):boolean{
  if(!canAct(state)||!isLane(lane))return false;
  const player=state.players[state.active];
  const card=player.hand[index];
  if(!card||player.mana<card.cost)return false;
  if(card.type==='유닛')return player.walls[lane]>0&&player.lanes[lane].length===0;
  if(!SUPPORTED_SPELLS.has(card.id))return false;
  if(isTargetSpell(card.id))return player.walls[lane]>0&&player.lanes[lane].length>0;
  return true;
}

const failDraw=(next:BattleState,owner:number)=>{
  const player=next.players[owner];
  next.winner=next.players[1-owner].name;
  next.log.unshift(`${player.name} 드로우 실패 — ${next.winner} 승리`);
};
const draw=(next:BattleState,owner:number,count:number)=>{
  for(let i=0;i<count;i++){
    const player=next.players[owner];
    if(!player.deck.length){failDraw(next,owner);return;}
    player.hand.push(player.deck.shift()!);
  }
};
const clearDead=(state:BattleState)=>{
  for(const p of state.players){
    p.lanes=p.lanes.map(lane=>lane.filter(unit=>{
      if(unit.hp>0)return true;
      const original=cardById(unit.cardId);
      if(original)p.grave.push({...original});
      return false;
    }));
  }
};


const targetPlayer=(state:BattleState,pending:PendingEffect):Player=>
  state.players[pending.type==='ally-heal'?pending.owner:1-pending.owner];

const validPendingTarget=(state:BattleState,pending:PendingEffect,lane:number):boolean=>{
  if(!isLane(lane))return false;
  const target=targetPlayer(state,pending).lanes[lane][0];
  if(!target)return false;
  if(pending.type==='ally-heal')return target.hp<target.maxHp;
  return true;
};

export const eligibleEffectLanes=(state:BattleState):number[]=>{
  const pending=state.pendingEffect;
  if(!pending)return [];
  return [0,1,2].filter(lane=>validPendingTarget(state,pending,lane));
};

const summonTrigger=(state:BattleState,owner:number,cardId:string):PendingEffect|undefined=>{
  const specs:Record<string,Omit<PendingEffect,'owner'|'sourceCardId'>>={
    U003:{type:'enemy-damage',amount:1},
    U004:{type:'ally-heal',amount:2},
    H001:{type:'ally-heal',amount:3},
    H002:{type:'enemy-damage',amount:3},
    M001:{type:'enemy-disable',amount:1},
  };
  const spec=specs[cardId];
  if(!spec)return undefined;
  const effect:PendingEffect={...spec,owner,sourceCardId:cardId};
  return [0,1,2].some(lane=>validPendingTarget(state,effect,lane))?effect:undefined;
};

export function resolvePendingEffect(state:BattleState,lane:number):BattleState{
  const pending=state.pendingEffect;
  if(!pending||state.winner||!validPendingTarget(state,pending,lane))return state;
  const next=structuredClone(state);
  const target=targetPlayer(next,pending).lanes[lane][0];
  if(pending.type==='enemy-damage')target.hp-=pending.amount;
  if(pending.type==='ally-heal')target.hp=Math.min(target.maxHp,target.hp+pending.amount);
  if(pending.type==='enemy-disable')target.stunnedTurns=(target.stunnedTurns??0)+1;
  const action=pending.type==='enemy-damage'?'효과 피해 '+pending.amount:
    pending.type==='ally-heal'?'체력 회복 '+pending.amount:'다음 자기 턴 행동 봉쇄';
  next.log.unshift((cardById(pending.sourceCardId)?.name??pending.sourceCardId)+': '+target.name+' → '+action);
  delete next.pendingEffect;
  clearDead(next);
  return next;
}

export function playCard(state:BattleState,index:number,lane=0,stance:Stance='attack',guardSide?:0|2):BattleState {
  if(!canPlayCard(state,index,lane))return state;
  const incoming=state.players[state.active].hand[index];
  if(lane===1&&(incoming.type==='유닛'&&incoming.text.includes('도발')||incoming.id==='S002')&&guardSide!==0&&guardSide!==2)return state;
  const next=structuredClone(state);
  const owner=next.active, p=next.players[owner], card=p.hand[index];
  p.mana-=card.cost;
  p.hand.splice(index,1);
  if(card.type==='유닛'){
    const unit:Unit={
      cardId:card.id,name:card.name,atk:card.atk??0,hp:card.hp??1,
      maxHp:card.hp??1,canAttack:card.id==='R001'&&stance==='attack',
      stance,taunt:card.text.includes('도발'),temporaryAttack:0,
      guardSide:lane===1&&card.text.includes('도발')?guardSide:undefined,stunnedTurns:0,
    };
    p.lanes[lane]=[unit];
    next.log.unshift(`${p.name}: ${WALL_NAMES[lane]} 전선에 ${card.name} 소환 (${stance==='attack'?'공격':'수비'})`);
    if(card.id==='U006')draw(next,owner,1);
    if(card.id==='H003')draw(next,owner,2);
    if(card.id==='R003'){
      p.lanes.flat().forEach(ally=>{ally.hp=Math.min(ally.maxHp,ally.hp+1);});
      next.log.unshift(card.name+': 아군 유닛 체력 1 회복');
    }
    if(!next.winner){
      const pending=summonTrigger(next,owner,card.id);
      if(pending){
        next.pendingEffect=pending;
        next.log.unshift(card.name+': 능력 대상 선택 필요');
      }
    }
    // Other on-summon effects and response chains remain unsupported.
  } else {
    p.grave.push(card);
    const ally=p.lanes[lane][0];
    if(card.id==='S001'&&ally)ally.hp=Math.min(ally.maxHp,ally.hp+3);
    if(card.id==='S002'&&ally){ally.maxHp+=2;ally.hp+=2;ally.taunt=true;if(lane===1)ally.guardSide=guardSide;}
    if(card.id==='H004'&&ally)ally.hp=ally.maxHp;
    if(card.id==='S003'){
      next.players[1-owner].lanes.flat().forEach(unit=>{unit.hp-=2;});
      clearDead(next);
    }
    if(card.id==='R004'){
      p.lanes.flat().forEach(unit=>{unit.atk+=1;unit.temporaryAttack+=1;});
    }
    next.log.unshift(`${p.name}: ${card.name} 사용 (간이 마법 해결 · 체인 미지원)`);
  }
  return next;
}

export function changeStance(state:BattleState,lane:number):BattleState{
  if(!canAct(state)||!isLane(lane))return state;
  const unit=state.players[state.active].lanes[lane][0];
  if(!unit||!unit.canAttack)return state;
  const next=structuredClone(state);
  const target=next.players[next.active].lanes[lane][0];
  target.stance=target.stance==='attack'?'defense':'attack';
  target.canAttack=false; // stance switch consumes this unit's basic action
  next.log.unshift(`${next.players[next.active].name}: ${target.name} ${target.stance==='attack'?'공격':'수비'} 표시 전환`);
  return next;
}


export function attackUnit(
  state:BattleState,lane:number,unitIndex:number,targetUnitIndex:number|null,targetLane=lane,
):BattleState{
  if(!canAct(state)||!isLane(lane)||!isLane(targetLane))return state;
  const targets=legalAttackTargets(state,lane,unitIndex);
  const canAttackUnit=targetUnitIndex===0&&targets.unitLanes.includes(targetLane);
  const canAttackWall=targetUnitIndex===null&&
    (targets.wallLane===targetLane||!!targets.wallLanes?.includes(targetLane));
  if(!canAttackUnit&&!canAttackWall)return state;
  const next=structuredClone(state);
  const own=next.players[next.active],enemy=next.players[1-next.active];
  const attacker=own.lanes[lane][unitIndex];
  attacker.canAttack=false;
  if(targetUnitIndex!==null){
    const victim=enemy.lanes[targetLane][targetUnitIndex];
    const damage=victim.stance==='defense'?Math.ceil(attacker.atk/2):attacker.atk;
    victim.hp-=damage;
    if(victim.stance==='attack')attacker.hp-=victim.atk;
    next.log.unshift(own.name+': '+attacker.name+' → '+victim.name+' ('+damage+' 피해'+(targetLane!==lane?', 인접 도발':'')+')');
    clearDead(next);
  }else{
    enemy.walls[targetLane]=Math.max(0,enemy.walls[targetLane]-attacker.atk);
    const breakthrough=targetLane!==lane;
    next.log.unshift(breakthrough?
      own.name+': '+attacker.name+' 자유 돌파 공성 ('+
      WALL_NAMES[lane]+' → '+WALL_NAMES[targetLane]+') · '+
      WALL_NAMES[targetLane]+' 성벽에 '+attacker.atk+' 피해 (추가 마나·공격력 페널티 없음)':
      own.name+': '+WALL_NAMES[targetLane]+' 성벽에 '+attacker.atk+' 피해');
    if(enemy.walls.every(w=>w===0)){
      next.winner=own.name;
      next.log.unshift(own.name+' 세 성벽 붕괴 승리!');
    }else if(enemy.walls[targetLane]===0){
      const installed=enemy.spellZones[targetLane];
      if(installed){
        const original=cardById(installed.cardId);
        if(original)enemy.grave.push({...original});
        enemy.spellZones[targetLane]=null;
        next.log.unshift(enemy.name+': 붕괴 전선 설치 마법 묘지 이동 (파괴 아님)');
      }
      if(enemy.lanes[targetLane].length>0){
        next.pendingRetreat={owner:1-next.active,from:targetLane};
        next.log.unshift(enemy.name+': 긴급 퇴각 전선 선택');
      }
    }
  }
  return next;
}

export function resolveRetreat(state:BattleState,toLane:number|null):BattleState{
  if(!state.pendingRetreat||state.winner)return state;
  const {owner,from}=state.pendingRetreat;
  const p=state.players[owner];
  if(toLane!==null&&(!isLane(toLane)||toLane===from||p.walls[toLane]<=0||p.lanes[toLane].length>0))return state;
  const next=structuredClone(state);
  const np=next.players[owner];
  const [unit]=np.lanes[from].splice(0,1);
  if(!unit)return state;
  if(toLane===null){
    const original=cardById(unit.cardId);
    if(original)np.grave.push({...original});
    next.log.unshift(`${np.name}: 퇴각할 자리가 없어 ${unit.name}을(를) 묘지로 이동 (파괴 아님)`);
  }else{
    np.lanes[toLane]=[unit];
    next.log.unshift(`${np.name}: ${unit.name} → ${WALL_NAMES[toLane]} 전선으로 무료 퇴각`);
  }
  delete next.pendingRetreat;
  return next;
}

export function discardCard(state:BattleState,index:number):BattleState{
  const p=state.players[state.active];
  if(!state.discarding||index<0||index>=p.hand.length)return state;
  const next=structuredClone(state);
  const player=next.players[next.active];
  const [card]=player.hand.splice(index,1);
  player.grave.push(card);
  next.log.unshift(`${player.name}: 손패에서 ${card.name} 버림`);
  if(player.hand.length<=MAX_HAND)next.discarding=false;
  return next;
}

export function endTurn(state:BattleState):BattleState{
  if(!canAct(state))return state;
  const p=state.players[state.active];
  if(p.hand.length>MAX_HAND){
    const next=structuredClone(state);
    next.discarding=true;
    next.log.unshift(`${p.name}: 턴 종료 전 손패 ${MAX_HAND}장으로 정리 필요`);
    return next;
  }
  const next=structuredClone(state);
  const ending=next.players[next.active];
  ending.turnsTaken+=1;
  ending.lanes.flat().forEach(unit=>{unit.atk-=unit.temporaryAttack;unit.temporaryAttack=0;});
  next.active=1-next.active;
  next.turn+=1;
  const incoming=next.players[next.active];
  incoming.maxMana=Math.min(MAX_MANA,2+incoming.turnsTaken);
  incoming.mana=incoming.maxMana;
  incoming.lanes.flat().forEach(unit=>{
    if((unit.stunnedTurns??0)>0){
      unit.stunnedTurns=(unit.stunnedTurns??0)-1;
      unit.canAttack=false;
    }else unit.canAttack=true;
  });
  // Each player first draws at the beginning of their SECOND personal turn.
  if(incoming.turnsTaken>0)draw(next,next.active,1);
  next.log.unshift(`${incoming.name} 자기 턴 ${incoming.turnsTaken+1} 시작 · 마나 ${incoming.maxMana}`);
  return next;
}
