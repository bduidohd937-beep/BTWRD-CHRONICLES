import {useState} from 'react';
import type {BattleState,Card,Stance} from '../types';
import {
  attackUnit,canPlayCard,changeStance,discardCard,endTurn,playCard,
  resolveRetreat,resolvePendingEffect,SUPPORTED_SPELLS,
} from '../engine';
import Battlefield3D from '../graphics/Battlefield3D';
import BattlefieldOverlay from './BattlefieldOverlay';
import HandFan from './HandFan';
import './fieldOverlay.css';

type ChosenUnit={lane:number;index:number};
const globalSpell=(card:Card)=>card.id==='S003'||card.id==='R004';

export default function BattleApp({battle,setBattle}:{
  battle:BattleState;
  setBattle:(state:BattleState)=>void;
}){
  const player=battle.players[battle.active];
  const [chosenCard,setChosenCard]=useState<number|null>(null);
  const [chosenUnit,setChosenUnit]=useState<ChosenUnit|null>(null);
  const [stance,setStance]=useState<Stance>('attack');
  const [guardSide,setGuardSide]=useState<0|2>(0);
  const [show3d,setShow3d]=useState(true);
  const [showLog,setShowLog]=useState(false);
  const [showInspect,setShowInspect]=useState<Card|null>(null);
  const [message,setMessage]=useState('');
  const actingCard=chosenCard===null?null:player.hand[chosenCard];
  const selectedUnit=chosenUnit?player.lanes[chosenUnit.lane][chosenUnit.index]:null;

  const chooseCard=(i:number)=>{
    if(battle.discarding){
      const next=discardCard(battle,i);
      if(next!==battle){
        setBattle(next);
        setMessage(next.discarding?'손패를 7장 이하로 줄이세요.':'버릴 카드 선택 완료. 턴 종료를 누르세요.');
      }
      return;
    }
    const card=player.hand[i];
    if(!card||battle.pendingRetreat||battle.pendingEffect||battle.winner)return;
    if(card.type==='마법'&&!SUPPORTED_SPELLS.has(card.id)){
      setMessage('이 마법은 아직 구현되지 않았습니다.');
      return;
    }
    if(globalSpell(card)){
      const next=playCard(battle,i,0);
      if(next!==battle){
        setBattle(next);
        setChosenCard(null);
        setChosenUnit(null);
        setShowInspect(null);
        setMessage(card.name+' 사용!');
      }
      return;
    }
    setChosenUnit(null);
    setShowInspect(null);
    setChosenCard(chosenCard===i?null:i);
    setMessage(card.type==='마법'?
      '강조된 아군 유닛 카드를 클릭해 마법을 사용하세요.':
      '전장에 빛나는 빈 유닛 존을 선택해 소환하세요.');
  };

  const deploy=(lane:number)=>{
    if(chosenCard===null)return;
    const next=playCard(battle,chosenCard,lane,stance,guardSide);
    if(next===battle){
      setMessage('이 슬롯은 소환할 수 없습니다. 마나·전선 상태를 확인하세요.');
      return;
    }
    setBattle(next);
    setChosenCard(null);
    setShowInspect(null);
    setMessage(next.pendingEffect?'소환 능력 발동! 빛나는 유닛을 선택하세요.':'소환·카드 사용 완료!');
  };

  const chooseUnit=(lane:number)=>{
    setChosenCard(null);
    setShowInspect(null);
    setChosenUnit(chosenUnit?.lane===lane?null:{lane,index:0});
    const unit=player.lanes[lane][0];
    setMessage(chosenUnit?.lane===lane?'유닛 선택 취소':
      unit?.stance==='defense'?'수비 표시입니다. 공격하려면 표시 전환을 선택하세요.':
      '공격 가능한 적 유닛/성벽이 빛납니다. 유효한 대상을 선택하세요.');
  };

  const strike=(lane:number,target:number|null)=>{
    if(chosenUnit===null)return;
    const next=attackUnit(battle,chosenUnit.lane,chosenUnit.index,target,lane);
    if(next===battle){
      setMessage('다른 적 유닛 또는 도발 대상이 공격을 막고 있어요.');
      return;
    }
    setBattle(next);
    setChosenUnit(null);
    setMessage(target===null?'성벽 타격!':'유닛 공격 해결!');
  };

  const resolveEffect=(lane:number)=>{
    const next=resolvePendingEffect(battle,lane);
    if(next===battle){
      setMessage('소환 효과의 유효한 대상을 선택하세요.');
      return;
    }
    setBattle(next);
    setChosenCard(null);
    setChosenUnit(null);
    setMessage('소환 효과 적용!');
  };

  const retreat=(lane:number|null)=>{
    const next=resolveRetreat(battle,lane);
    if(next!==battle){
      setBattle(next);
      setChosenCard(null);
      setChosenUnit(null);
      setMessage(lane===null?'퇴각할 유닛을 묘지로 이동했습니다.':'긴급 퇴각 완료!');
    }
  };

  const finishTurn=()=>{
    const next=endTurn(battle);
    if(next===battle)return;
    setBattle(next);
    setChosenCard(null);
    setChosenUnit(null);
    setShowInspect(null);
    setMessage(next.discarding?'손패에서 버릴 카드를 선택하세요.':'턴 교대!');
  };

  const switchStance=()=>{
    if(!chosenUnit)return;
    const next=changeStance(battle,chosenUnit.lane);
    if(next!==battle){
      setBattle(next);
      setChosenUnit(null);
      setMessage('표시 전환! 유닛의 행동권이 소모됐습니다.');
    }
  };

  const activePrompt=battle.winner?('🏆 '+battle.winner+' 승리!'):
    battle.pendingEffect?'소환 효과 대상을 선택하세요. 강조된 유닛을 클릭해 해결합니다.':
    battle.pendingRetreat?'성벽 붕괴! 유닛을 빈 활성 전선으로 옮기거나 묘지로 보내세요.':
    battle.discarding?'손패가 7장이 될 때까지 버릴 카드를 선택하세요.':
    message||'카드를 선택해 소환하거나 준비된 유닛을 선택해 공격하세요.';

  return <section className="combat-experience field-combat-experience" aria-label="전장 전체화면 카드 전투">
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
          <button type="button" aria-pressed={showLog} onClick={()=>setShowLog(v=>!v)}>📜 기록</button>
          <button type="button" aria-pressed={show3d} onClick={()=>setShow3d(v=>!v)}>
            {show3d?'◈ 3D ON':'▤ 2D'}
          </button>
          <button type="button" className="field-end-turn" disabled={
            !!battle.winner||!!battle.pendingRetreat||!!battle.pendingEffect
          } onClick={finishTurn}>{battle.discarding?'버리기 중':'턴 종료'}</button>
        </div>
      </div>
      <div className="field-action-guide" role="status">{activePrompt}</div>
      <BattlefieldOverlay
        battle={battle} chosenCard={chosenCard} chosenUnit={chosenUnit}
        onPlay={deploy} onStrike={strike} onChooseUnit={chooseUnit}
        onResolveEffect={resolveEffect} onRetreat={lane=>retreat(lane)}
        onInspect={setShowInspect}/>
      <div className="field-active-actions">
        <div className="field-info-pills">
          <span>덱 {player.deck.length}</span><span>묘지 {player.grave.length}</span>
          <span>손패 {player.hand.length}</span>
        </div>
        <div className="field-action-buttons">
          {(actingCard?.type==='유닛'&&actingCard.text.includes('도발')||actingCard?.id==='S002')&&
            <div className="field-action-group">
              <span>중앙 보호</span>
              <button type="button" className={guardSide===0?'active':''}
                aria-pressed={guardSide===0} onClick={()=>setGuardSide(0)}>← 좌</button>
              <button type="button" className={guardSide===2?'active':''}
                aria-pressed={guardSide===2} onClick={()=>setGuardSide(2)}>우 →</button>
            </div>}
          {(actingCard?.type==='유닛'||!battle.discarding)&&
            <div className="field-action-group">
              <span>소환 표시</span>
              <button type="button" className={stance==='attack'?'active':''}
                aria-pressed={stance==='attack'} onClick={()=>setStance('attack')}>⚔ 공격</button>
              <button type="button" className={stance==='defense'?'active':''}
                aria-pressed={stance==='defense'} onClick={()=>setStance('defense')}>🛡 수비</button>
            </div>}
        </div>
      </div>
      {selectedUnit&&!battle.pendingRetreat&&<div className="field-selected-unit-panel">
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
      {showInspect&&!selectedUnit&&<div className="field-inspect-panel">
        <button type="button" aria-label="카드 정보 닫기" onClick={()=>setShowInspect(null)}>×</button>
        <strong>{showInspect.name}</strong>
        <span>⚔ {showInspect.atk??0} · ♥ {showInspect.hp??0}</span>
        <small>{showInspect.text}</small>
      </div>}
      <HandFan cards={player.hand} selected={chosenCard}
        disabled={card=>!battle.discarding&&(
          !!battle.winner||!!battle.pendingRetreat||!!battle.pendingEffect||
          player.mana<card.cost||(card.type==='마법'&&!SUPPORTED_SPELLS.has(card.id))
        )}
        discardMode={!!battle.discarding} onChoose={chooseCard}/>
      {showLog&&<aside className="field-log-drawer" aria-label="전투 기록 및 규칙 상태">
        <div className="field-log-title">
          <strong>📜 전투 기록</strong>
          <button type="button" onClick={()=>setShowLog(false)}>닫기</button>
        </div>
        <ol>{battle.log.slice(0,18).map((line,i)=><li key={i}>{line}</li>)}</ol>
        <p>마법 존·공용 필드 존은 현재 시각적 자리 표시만 지원합니다. 정식 지속/장착마법, 체인, 계승, 합성과 미확정 공성 규칙은 구현되지 않았습니다.</p>
      </aside>}
    </div>
  </section>;
}
