import {useEffect,useState} from 'react';
import type {BattleState,Card,Stance,Unit} from '../types';
import {
  attackUnit,canPlayCard,changeStance,discardCard,endTurn,playCard,
  resolveRetreat,resolvePendingEffect,isPendingEffectOptional,skipPendingEffect,
  eligibleEffectLanes,SUPPORTED_SPELLS,
} from '../engine';
import {CARD_MAP} from '../foundation/foundationCards';
import Battlefield3D from '../graphics/Battlefield3D';
import BattlefieldOverlay from './BattlefieldOverlay';
import HandFan from './HandFan';
import CombatCardInfo from './CombatCardInfo';
import ManaMeter from './ManaMeter';
import './fieldOverlay.css';
import './combatUx.css';

type ChosenUnit={lane:number;index:number};
type PendingPlay={index:number;lane:number;kind:'unit'|'spell'};
type EffectTrace={
  title:string;details:string;
  fromOwner:number;fromLane:number;
  toOwner:number;toLane:number;
  amount?:string;kind:'damage'|'heal'|'spell'|'summon'|'attack';
};
const LANE_NAMES=['좌측','중앙','우측'];
const globalSpell=(card:Card)=>card.id==='S003'||card.id==='R004';
const needsCenterGuard=(card:Card,lane:number)=>
  lane===1&&(card.type==='유닛'&&card.text.includes('도발')||card.id==='S002');
const sourceLane=(battle:BattleState,owner:number,cardId:string)=>
  Math.max(0,battle.players[owner].lanes.findIndex(lane=>lane.some(u=>u.cardId===cardId)));

function EffectBeam({trace}:{trace:EffectTrace}){
  const x=(lane:number)=>195+lane*305;
  const y=(owner:number)=>owner===1?350:670;
  return <div className="field-effect-beam" aria-label={trace.details} role="status">
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="battle-effect-flow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e6ca86" stopOpacity=".6"/>
          <stop offset="100%" stopColor={trace.kind==='damage'||trace.kind==='attack'?'#ef7987':'#8fe6eb'} stopOpacity=".95"/>
        </linearGradient>
        <marker id="battle-effect-tip" markerWidth="6" markerHeight="6"
          refX="5" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6z" fill="#ffe3a1"/>
        </marker>
      </defs>
      <line x1={x(trace.fromLane)} y1={y(trace.fromOwner)}
        x2={x(trace.toLane)} y2={y(trace.toOwner)}
        stroke="url(#battle-effect-flow)" strokeWidth="4"
        strokeLinecap="round" markerEnd="url(#battle-effect-tip)" strokeDasharray="13 9"/>
      <circle cx={x(trace.fromLane)} cy={y(trace.fromOwner)}
        r="12" fill="#f2d0a3" opacity=".9"/>
      <circle cx={x(trace.toLane)} cy={y(trace.toOwner)}
        r="22" fill="none" stroke="#e8d0a2" strokeWidth="3"/>
    </svg>
    <div className={'field-effect-result field-effect-'+trace.kind}
      style={{left:(19.5+trace.toLane*30.5)+'%',top:(trace.toOwner===1?'36%':'66%')}}>
      {trace.amount??'✦'}
    </div>
    <div className="field-effect-caption"><strong>{trace.title}</strong><span>{trace.details}</span></div>
  </div>;
}

export default function BattleApp({battle,setBattle}:{
  battle:BattleState;
  setBattle:(state:BattleState)=>void;
}){
  const player=battle.players[battle.active];
  const [chosenCard,setChosenCard]=useState<number|null>(null);
  const [chosenUnit,setChosenUnit]=useState<ChosenUnit|null>(null);
  const [pendingPlay,setPendingPlay]=useState<PendingPlay|null>(null);
  const [summonStance,setSummonStance]=useState<Stance|null>(null);
  const [guardSide,setGuardSide]=useState<0|2|null>(null);
  const [show3d,setShow3d]=useState(true);
  const [showLog,setShowLog]=useState(false);
  const [hoveredCard,setHoveredCard]=useState<Card|null>(null);
  const [hoveredUnit,setHoveredUnit]=useState<Unit|null>(null);
  const [inspectedCard,setInspectedCard]=useState<Card|null>(null);
  const [effectTrace,setEffectTrace]=useState<EffectTrace|null>(null);
  const [effectSourceLane,setEffectSourceLane]=useState<number|null>(null);
  const [message,setMessage]=useState('');

  const selectedHand=chosenCard===null?null:player.hand[chosenCard];
  const selectedUnit=chosenUnit?player.lanes[chosenUnit.lane][chosenUnit.index]:null;
  const pendingCard=pendingPlay?player.hand[pendingPlay.index]:null;
  const trigger=battle.pendingEffect;
  const effectCard=trigger?CARD_MAP.get(trigger.sourceCardId):null;
  const currentUnit=hoveredUnit??selectedUnit;
  const detailCard=hoveredCard??
    (hoveredUnit?CARD_MAP.get(hoveredUnit.cardId):null)??
    effectCard??selectedHand??
    (selectedUnit?CARD_MAP.get(selectedUnit.cardId):null)??
    inspectedCard??null;
  const infoSource=hoveredCard||selectedHand?'손패':effectCard?'발동':'전장';

  useEffect(()=>{
    if(battle.turn===1&&battle.log.length===1&&battle.log[0].includes('전투 시작')){
      setChosenCard(null);
      setChosenUnit(null);
      setPendingPlay(null);
      setSummonStance(null);
      setGuardSide(null);
      setHoveredCard(null);
      setHoveredUnit(null);
      setEffectTrace(null);
      setEffectSourceLane(null);
    }
  },[battle]);

  const chooseCard=(i:number)=>{
    if(battle.discarding){
      const next=discardCard(battle,i);
      if(next!==battle){
        setBattle(next);
        setEffectTrace(null);
        setMessage(next.discarding?'손패를 7장 이하로 줄이세요.':'카드를 버렸습니다. 턴 종료를 다시 누르세요.');
      }
      return;
    }
    const card=player.hand[i];
    if(!card||battle.pendingRetreat||battle.pendingEffect||battle.winner)return;
    if(player.mana<card.cost){
      setMessage(card.name+' 사용에 마나 '+card.cost+'가 필요합니다. 현재 '+player.mana+'입니다.');
      return;
    }
    if(card.type==='마법'&&!SUPPORTED_SPELLS.has(card.id)){
      setMessage('이 마법은 아직 구현되지 않았습니다. 실제 마나는 소모하지 않습니다.');
      return;
    }
    setChosenUnit(null);
    setInspectedCard(card);
    setEffectTrace(null);
    setPendingPlay(null);
    setSummonStance(null);
    setGuardSide(null);
    const nextIndex=chosenCard===i?null:i;
    setChosenCard(nextIndex);
    if(nextIndex===null){
      setMessage('선택을 취소했습니다.');
    }else if(globalSpell(card)){
      setPendingPlay({index:i,lane:0,kind:'spell'});
      setMessage('전역 마법의 효과를 확인하고 발동하세요.');
    }else{
      setMessage(card.type==='마법'?'마법 효과를 적용할 아군 유닛을 선택하세요.':
        '빛나는 빈 유닛 존을 선택한 뒤 공격 또는 수비 표시를 결정하세요.');
    }
  };

  const chooseSlot=(lane:number)=>{
    if(chosenCard===null)return;
    const card=player.hand[chosenCard];
    if(!card||!canPlayCard(battle,chosenCard,lane)){
      setMessage('해당 전선에 카드를 사용할 수 없습니다.');
      return;
    }
    setPendingPlay({index:chosenCard,lane,kind:card.type==='유닛'?'unit':'spell'});
    setSummonStance(null);
    setGuardSide(null);
    setMessage(card.type==='유닛'?'공격 또는 수비 표시를 누르면 즉시 소환합니다.':
      '선택한 대상과 효과를 확인한 다음 마법 발동을 확정하세요.');
  };

  const cancelPending=()=>{
    setPendingPlay(null);
    setSummonStance(null);
    setGuardSide(null);
    setMessage('소환/발동을 취소했습니다. 마나는 소모되지 않았습니다.');
  };

  // Selecting the attack/defense stance is the final summon action.
  // Only center taunt needs one further guard-direction choice.
  const finishPending=(stanceChoice?:Stance,guardChoice?:0|2)=>{
    if(!pendingPlay||!pendingCard)return;
    const finalStance=stanceChoice??summonStance;
    const finalGuard=guardChoice??guardSide;
    if(pendingPlay.kind==='unit'&&!finalStance){
      setMessage('공격 또는 수비 표시를 선택하세요.');
      return;
    }
    if(needsCenterGuard(pendingCard,pendingPlay.lane)&&finalGuard===null){
      setMessage('보호할 좌측 또는 우측 전선을 선택하세요.');
      return;
    }
    if(!canPlayCard(battle,pendingPlay.index,pendingPlay.lane)){
      setMessage('마나 또는 대상 상태가 바뀌어 사용할 수 없습니다.');
      setPendingPlay(null);
      return;
    }
    const original=pendingCard;
    const sourceOwner=battle.active;
    const target=battle.players[sourceOwner].lanes[pendingPlay.lane][0];
    const next=playCard(
      battle,pendingPlay.index,pendingPlay.lane,finalStance??'attack',finalGuard??undefined,
    );
    if(next===battle){
      setMessage('규칙상 사용이 거부되었습니다. 전선과 선택을 확인해 주세요.');
      return;
    }
    setBattle(next);
    setEffectTrace(next.pendingEffect?null:{
      title:original.name+(original.type==='유닛'?' 소환':' 발동'),
      details:original.type==='유닛'?
        LANE_NAMES[pendingPlay.lane]+' 전선 · '+(finalStance==='defense'?'수비 표시':'공격 표시'):
        globalSpell(original)?'전체 효과 · '+original.text:
        '대상 '+(target?.name??'유닛')+' · '+original.text,
      fromOwner:sourceOwner,fromLane:pendingPlay.lane,
      toOwner:sourceOwner,toLane:pendingPlay.lane,
      kind:original.type==='유닛'?'summon':'spell',
    });
    setEffectSourceLane(pendingPlay.lane);
    setChosenCard(null);
    setChosenUnit(null);
    setHoveredCard(null);
    setInspectedCard(original);
    setPendingPlay(null);
    setSummonStance(null);
    setGuardSide(null);
    setMessage(next.pendingEffect?
      '✨ '+original.name+'의 소환 효과! 빛나는 대상 카드를 선택하세요.':
      original.name+(original.type==='유닛'?' 소환 완료!':' 마법 해결 완료!'));
  };

  const chooseSummonStance=(stance:Stance)=>{
    if(!pendingPlay||pendingPlay.kind!=='unit'||!pendingCard)return;
    if(needsCenterGuard(pendingCard,pendingPlay.lane)){
      setSummonStance(stance);
      setMessage('이제 중앙 도발이 보호할 측면을 선택하세요.');
      return;
    }
    finishPending(stance);
  };

  const chooseGuardSide=(side:0|2)=>{
    if(pendingPlay?.kind==='unit'){
      if(!summonStance)return;
      finishPending(undefined,side);
      return;
    }
    setGuardSide(side);
  };

  const declineOptionalEffect=()=>{
    if(!battle.pendingEffect||!isPendingEffectOptional(battle))return;
    const next=skipPendingEffect(battle);
    if(next===battle)return;
    setBattle(next);
    setEffectTrace(null);
    setEffectSourceLane(null);
    setMessage('선택 소환 효과를 사용하지 않았습니다.');
  };

  const chooseUnit=(lane:number)=>{
    setChosenCard(null);
    setPendingPlay(null);
    setEffectTrace(null);
    const next=chosenUnit?.lane===lane?null:{lane,index:0};
    setChosenUnit(next);
    const unit=player.lanes[lane][0];
    const oppositeWall=battle.players[1-battle.active].walls[lane];
    setMessage(next===null?'유닛 선택 취소':
      unit?.stance==='defense'?'수비 표시 유닛입니다. 행동권이 있으면 표시 전환을 할 수 있습니다.':
      oppositeWall===0?'자유 돌파! 다른 활성 성벽을 공격할 수 있습니다. 적 유닛과 도발은 우선 처리해야 합니다.':
      '합법적인 공격 대상만 빛납니다. 유닛 또는 성벽을 선택해 공격하세요.');
  };

  const strike=(lane:number,target:number|null)=>{
    if(chosenUnit===null)return;
    const attacker=player.lanes[chosenUnit.lane][chosenUnit.index];
    const enemy=battle.players[1-battle.active];
    const victim=target===null?null:enemy.lanes[lane][target];
    const oldHp=target===null?enemy.walls[lane]:(victim?.hp??0);
    const next=attackUnit(battle,chosenUnit.lane,chosenUnit.index,target,lane);
    if(next===battle){
      setMessage('같은 전선의 유닛 우선, 인접 도발 등의 공격 조건을 확인해 주세요.');
      return;
    }
    const damage=target===null?Math.min(oldHp,attacker.atk):
      Math.min(oldHp,victim?.stance==='defense'?Math.ceil(attacker.atk/2):attacker.atk);
    setBattle(next);
    setChosenUnit(null);
    setEffectTrace({
      title:attacker.name+' 공격',
      details:LANE_NAMES[chosenUnit.lane]+' → '+LANE_NAMES[lane]+
        (victim?' '+victim.name:' 성벽')+' · 피해 '+damage,
      fromOwner:battle.active,fromLane:chosenUnit.lane,
      toOwner:1-battle.active,toLane:lane,
      amount:'−'+damage,kind:'attack',
    });
    const breakthrough=target===null&&chosenUnit.lane!==lane;
    setMessage(victim?attacker.name+'의 공격으로 '+victim.name+'이(가) 피해 '+damage+'를 받았습니다.':
      breakthrough?'자유 돌파! '+LANE_NAMES[chosenUnit.lane]+' → '+LANE_NAMES[lane]+
        ' 성벽에 피해 '+damage+'! 추가 마나·공격력 페널티 없음.':
        LANE_NAMES[lane]+' 성벽에 피해 '+damage+'!');
  };

  const resolveEffect=(lane:number)=>{
    const pending=battle.pendingEffect;
    if(!pending)return;
    const targetOwner=pending.type==='ally-heal'?pending.owner:1-pending.owner;
    const target=battle.players[targetOwner].lanes[lane][0];
    const next=resolvePendingEffect(battle,lane);
    if(next===battle){
      setMessage('효과를 적용할 수 있는 유닛을 선택해 주세요.');
      return;
    }
    setBattle(next);
    setChosenCard(null);
    setChosenUnit(null);
    const fromLane=effectSourceLane??sourceLane(battle,pending.owner,pending.sourceCardId);
    const isDamage=pending.type==='enemy-damage';
    const isHeal=pending.type==='ally-heal';
    const detail=isDamage?'피해 '+pending.amount:isHeal?'체력 회복 '+pending.amount:'다음 자기 턴 행동 봉쇄';
    setEffectTrace({
      title:(CARD_MAP.get(pending.sourceCardId)?.name??pending.sourceCardId)+' 소환 효과',
      details:(target?.name??'대상')+' → '+detail,
      fromOwner:pending.owner,fromLane,
      toOwner:targetOwner,toLane:lane,
      amount:isDamage?'−'+pending.amount:isHeal?'+'+pending.amount:'✦',
      kind:isDamage?'damage':isHeal?'heal':'spell',
    });
    setMessage((target?.name??'대상')+'에게 '+detail+' 효과를 적용했습니다.');
  };

  const retreat=(lane:number|null)=>{
    const next=resolveRetreat(battle,lane);
    if(next!==battle){
      setBattle(next);
      setChosenCard(null);
      setChosenUnit(null);
      setEffectTrace(null);
      setMessage(lane===null?'퇴각할 유닛을 묘지로 이동했습니다.':'긴급 퇴각 완료!');
    }
  };

  const finishTurn=()=>{
    const next=endTurn(battle);
    if(next===battle)return;
    setBattle(next);
    setChosenCard(null);
    setChosenUnit(null);
    setPendingPlay(null);
    setEffectTrace(null);
    setHoveredCard(null);
    setHoveredUnit(null);
    setInspectedCard(null);
    setMessage(next.discarding?'손패에서 버릴 카드를 직접 선택하세요.':'턴 교대!');
  };

  const switchStance=()=>{
    if(!chosenUnit)return;
    const next=changeStance(battle,chosenUnit.lane);
    if(next!==battle){
      setBattle(next);
      setChosenUnit(null);
      setEffectTrace(null);
      setMessage('유닛이 '+(next.players[next.active].lanes[chosenUnit.lane][0].stance==='defense'?'수비':'공격')+
        ' 표시로 전환했습니다. 행동권이 소모됐습니다.');
    }
  };

  const pendingOptional=isPendingEffectOptional(battle);
  const effectLanes=eligibleEffectLanes(battle);
  const playableHand=player.hand.some((_,i)=>
    [0,1,2].some(lane=>canPlayCard(battle,i,lane)));
  const canUnitAct=player.lanes.flat().some(unit=>unit.canAttack);
  const turnEndReady=!battle.winner&&!battle.discarding&&!battle.pendingRetreat&&
    !trigger&&!pendingPlay&&!playableHand&&!canUnitAct;
  const activePrompt=battle.winner?'🏆 '+battle.winner+' 승리!':
    trigger?'✨ '+(effectCard?.name??'소환 유닛')+
      (pendingOptional?' · 선택 효과':' · 필수 효과')+
      ' — 빛나는 대상 카드를 클릭하세요.':
    battle.pendingRetreat?'성벽 붕괴! 빈 활성 전선으로 퇴각하거나 묘지로 보내세요.':
    battle.discarding?'손패 '+player.hand.length+'장 · 7장이 될 때까지 버릴 카드를 선택하세요.':
    turnEndReady?'✔ 지금 할 수 있는 행동을 모두 마쳤습니다. 빛나는 턴 종료 버튼을 누르세요.':
    message||'카드 선택 → 전선 선택 → 공격/수비 표시를 눌러 소환';

  return <section className="combat-experience field-combat-experience" aria-label="3D 전장 카드 전투">
    <div className="battle-field-stage" data-layout="field-overlay" aria-label="3D 전장과 카드 슬롯">
      {show3d&&<Battlefield3D battle={battle}/>}
      {!show3d&&<div className="field-2d-background" aria-hidden="true"/>}
      <div className="field-stage-vignette" aria-hidden="true"/>
      <div className="field-top-hud">
        <div className="field-round">
          <strong>{battle.winner?'전투 종료':player.name+' 행동 턴'}</strong>
          <span>ROUND {battle.turn}</span>
          <span className="field-mana">💧 {player.mana}/{player.maxMana}</span>
        </div>
        <div className="field-top-actions">
          <button type="button" aria-pressed={showLog} onClick={()=>setShowLog(v=>!v)}>📜 전투 기록</button>
          <button type="button" aria-pressed={show3d} onClick={()=>setShow3d(v=>!v)}>
            {show3d?'◈ 3D ON':'▤ 2D'}
          </button>
          <button type="button"
            className={'field-end-turn'+(turnEndReady?' field-end-turn-ready':'')}
            title={turnEndReady?'가능한 행동을 마쳤습니다. 다음 턴으로 이동하세요.':undefined}
            disabled={!!battle.winner||!!battle.pendingRetreat||!!trigger||!!pendingPlay||!!battle.discarding}
            onClick={finishTurn}>{battle.discarding?'카드 버리기 중':turnEndReady?'✦ 턴 종료':'턴 종료'}</button>
        </div>
      </div>
      <div className={'field-action-guide'+(trigger?' field-guide-priority':'')+
        (turnEndReady?' field-guide-turn-end':'')} role="status">{activePrompt}</div>

      <BattlefieldOverlay
        battle={battle} chosenCard={chosenCard} chosenUnit={chosenUnit}
        onPlay={chooseSlot} onStrike={strike} onChooseUnit={chooseUnit}
        onResolveEffect={resolveEffect} onRetreat={lane=>retreat(lane)}
        onInspect={setInspectedCard} onPreviewUnit={setHoveredUnit}/>
      <CombatCardInfo card={detailCard} unit={currentUnit} source={infoSource}/>

      {trigger&&<div className="field-effect-pending" role="status"
        aria-label="소환 효과 대상 선택 안내">
        <span className="field-effect-pending-tag">✦ 소환 효과 {pendingOptional?'선택 가능':'발동 필수'}</span>
        <strong>✨ {effectCard?.name??trigger.sourceCardId}</strong>
        <p>{effectCard?.text??'효과 대상을 선택하세요.'}</p>
        <span className="field-effect-target-hint">
          ↘ 빛나는 {trigger.type==='ally-heal'?'아군':'적'} 유닛을 클릭하세요
          <b> · 대상 {effectLanes.length}곳</b>
        </span>
        {pendingOptional&&<button type="button" className="field-effect-decline"
          onClick={declineOptionalEffect}>효과 사용 안 함</button>}
      </div>}
      {effectTrace&&!trigger&&!pendingPlay&&<EffectBeam trace={effectTrace}/>}

      {selectedUnit&&!battle.pendingRetreat&&!pendingPlay&&<div className="field-selected-unit-panel">
        <strong>{selectedUnit.name}</strong>
        <span>⚔ {selectedUnit.atk} · ♥ {selectedUnit.hp}/{selectedUnit.maxHp}</span>
        <button type="button" onClick={switchStance}>↺ 표시 전환 (행동권 소모)</button>
        <button type="button" onClick={()=>setChosenUnit(null)}>취소</button>
      </div>}
      {battle.pendingRetreat&&<div className="field-event-panel">
        <strong>긴급 퇴각 선택</strong>
        <span>빛나는 빈 전선으로 유닛을 이동시키세요.</span>
        <button type="button" onClick={()=>retreat(null)}>묘지로 이동</button>
      </div>}

      <div className="field-active-actions">
        <div className="field-info-pills">
          <span>덱 {player.deck.length}</span>
          <span>묘지 {player.grave.length}</span>
          <span>손패 {player.hand.length}</span>
        </div>
      </div>

      <ManaMeter mana={player.mana} maxMana={player.maxMana}
        previewCost={pendingCard?.cost??selectedHand?.cost??null}/>
      <HandFan cards={player.hand} selected={chosenCard}
        disabled={card=>!battle.discarding&&(
          !!battle.winner||!!battle.pendingRetreat||!!trigger||!!pendingPlay||
          player.mana<card.cost||(card.type==='마법'&&!SUPPORTED_SPELLS.has(card.id))
        )}
        discardMode={!!battle.discarding} onChoose={chooseCard} onPreview={setHoveredCard}/>

      {pendingPlay&&pendingCard&&<div className="field-play-backdrop" role="presentation">
        <div className="field-play-dialog" role="dialog" aria-modal="true"
          aria-label={pendingPlay.kind==='unit'?'소환 표시 선택':'마법 발동 확인'}>
          <span className="field-play-stage">카드 선택 <b>→</b> 전선 선택 <b>→</b> {pendingPlay.kind==='unit'?'표시 클릭 시 즉시 소환':'효과 확인'}</span>
          <strong>{pendingCard.name}</strong>
          <p>{pendingPlay.kind==='unit'?'소환 위치: '+LANE_NAMES[pendingPlay.lane]+' 전선':
            globalSpell(pendingCard)?'전체 적용 마법':'효과 대상: '+(player.lanes[pendingPlay.lane][0]?.name??'유닛')}</p>
          <p className="field-play-card-effect">✦ {pendingCard.text}</p>
          <p className="field-play-cost">💧 마나 소모 {pendingCard.cost} · 사용 후 {player.mana-pendingCard.cost}/{player.maxMana}</p>
          {pendingPlay.kind==='unit'&&<div className="field-stance-picker" role="group" aria-label="소환 표시 선택">
            <button type="button" className={summonStance==='attack'?'chosen stance-attack':'stance-attack'}
              aria-pressed={summonStance==='attack'}
              onClick={()=>chooseSummonStance('attack')}>⚔ 공격 표시 <small>클릭 즉시 소환 · 붉은색</small></button>
            <button type="button" className={summonStance==='defense'?'chosen stance-defense':'stance-defense'}
              aria-pressed={summonStance==='defense'}
              onClick={()=>chooseSummonStance('defense')}>🛡 수비 표시 <small>클릭 즉시 소환 · 푸른색</small></button>
          </div>}
          {needsCenterGuard(pendingCard,pendingPlay.lane)&&<div className="field-guard-choice">
            <span>{pendingPlay.kind==='unit'?
              (summonStance?'보호할 측면을 선택하면 즉시 소환됩니다.':'공격/수비 선택 후 보호 방향을 정하세요.'):
              '중앙 도발이 보호할 측면'}</span>
            <button type="button" aria-pressed={guardSide===0}
              disabled={pendingPlay.kind==='unit'&&!summonStance}
              onClick={()=>chooseGuardSide(0)}>← 좌측</button>
            <button type="button" aria-pressed={guardSide===2}
              disabled={pendingPlay.kind==='unit'&&!summonStance}
              onClick={()=>chooseGuardSide(2)}>우측 →</button>
          </div>}
          <div className="field-play-dialog-actions">
            <button type="button" onClick={cancelPending}>취소</button>
            {pendingPlay.kind==='spell'&&<button type="button" className="field-play-confirm"
              disabled={needsCenterGuard(pendingCard,pendingPlay.lane)&&guardSide===null}
              onClick={()=>finishPending()}>
              마법 발동
            </button>}
          </div>
        </div>
      </div>}

      {showLog&&<aside className="field-log-drawer" aria-label="전투 기록 및 규칙 상태">
        <div className="field-log-title"><strong>📜 전투 기록</strong>
          <button type="button" onClick={()=>setShowLog(false)}>닫기</button></div>
        <ol>{battle.log.slice(0,18).map((line,i)=><li key={i}>{line}</li>)}</ol>
        <p>지속/장착마법, 공용 필드 발동과 체인은 아직 구현되지 않았습니다. 현재 단순 마법만 시험용 즉시 해결입니다.</p>
      </aside>}
    </div>
  </section>;
}
