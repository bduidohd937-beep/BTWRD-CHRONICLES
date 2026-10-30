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

export function legalAttackTargets(state:BattleState,lane:number,unitIndex=0):{
  unitLanes:number[];wallLane:number|null
}{
  const empty={unitLanes:[] as number[],wallLane:null};
  if(!canAct(state)||!isLane(lane))return empty;
  const attacker=state.players[state.active].lanes[lane][unitIndex];
  if(!attacker||!attacker.canAttack||attacker.stance!=='attack')return empty;
  const enemy=state.players[1-state.active];
  if(enemy.lanes[lane].length>0)return {unitLanes:[lane],wallLane:null};
  const guards=[0,1,2].filter(i=>enemy.lanes[i].some(u=>guardCovers(u,i,lane)));
  if(guards.length>0)return {unitLanes:guards,wallLane:null};
  return {unitLanes:[],wallLane:enemy.walls[lane]>0?lane:null};
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

export function playCard(state:BattleState,index:number,lane=0,stance:Stance='attack',guardSide?:0|2):BattleState {
  if(!canPlayCard(state,index,lane))return state;
  const incoming=state.players[state.active].hand[index];
  if(incoming.type==='유닛'&&incoming.text.includes('도발')&&lane===1&&guardSide!==0&&guardSide!==2)return state;
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
    // Other on-summon effects and the full response chain remain unsupported.
  } else {
    p.grave.push(card);
    const ally=p.lanes[lane][0];
    if(card.id==='S001'&&ally)ally.hp=Math.min(ally.maxHp,ally.hp+3);
    if(card.id==='S002'&&ally){ally.maxHp+=2;ally.hp+=2;ally.taunt=true;}
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

export function attackUnit(state:BattleState,lane:number,unitIndex:number,targetUnitIndex:number|null):BattleState {
  if(!canAct(state)||!isLane(lane))return state;
  const attacker=state.players[state.active];
  const defender=state.players[1-state.active];
  const unit=attacker.lanes[lane][unitIndex];
  if(!unit||!unit.canAttack||unit.stance==='defense')return state;
  // One occupied enemy unit slot blocks a direct wall strike. No adjacent siege yet.
  if(targetUnitIndex===null){
    if(defender.walls[lane]===0||defender.lanes[lane].length>0)return state;
  }else if(targetUnitIndex!==0||!defender.lanes[lane][targetUnitIndex])return state;
  const next=structuredClone(state);
  const a=next.players[next.active],d=next.players[1-next.active];
  const source=a.lanes[lane][unitIndex];
  source.canAttack=false;
  if(targetUnitIndex!==null){
    const target=d.lanes[lane][targetUnitIndex];
    const damage=target.stance==='defense'?Math.ceil(source.atk/2):source.atk;
    target.hp-=damage;
    if(target.stance==='attack')source.hp-=target.atk;
    next.log.unshift(`${a.name}: ${source.name} → ${target.name} (${damage} 피해)`);
    clearDead(next);
  }else{
    d.walls[lane]=Math.max(0,d.walls[lane]-source.atk);
    next.log.unshift(`${a.name}: ${WALL_NAMES[lane]} 성벽에 ${source.atk} 피해`);
    if(d.walls.every(w=>w===0)){
      next.winner=a.name;
      next.log.unshift(`${a.name} 세 성벽 붕괴 승리!`);
    }else if(d.walls[lane]===0&&d.lanes[lane].length>0){
      next.pendingRetreat={owner:1-next.active,from:lane};
      next.log.unshift(`${d.name}: ${WALL_NAMES[lane]} 성벽 붕괴 — 유닛 긴급 퇴각 선택`);
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
  incoming.lanes.flat().forEach(unit=>{unit.canAttack=true;});
  // Each player first draws at the beginning of their SECOND personal turn.
  if(incoming.turnsTaken>0)draw(next,next.active,1);
  next.log.unshift(`${incoming.name} 자기 턴 ${incoming.turnsTaken+1} 시작 · 마나 ${incoming.maxMana}`);
  return next;
}
