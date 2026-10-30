import {useState} from 'react';
import type {CSSProperties} from 'react';
import type {BattleState,Card,Player,Stance} from '../types';
import type {Rarity} from '../foundation/foundationTypes';
import {CARDS as cards,rarityOf} from '../foundation/foundationCards';
import CardArtwork from '../foundation/CardArtwork';
import {
  attackUnit,canPlayCard,changeStance,discardCard,endTurn,playCard,
  resolveRetreat,resolvePendingEffect,legalAttackTargets,eligibleEffectLanes,SUPPORTED_SPELLS,
} from '../engine';
import Battlefield3D from '../graphics/Battlefield3D';
import './battle.css';

const laneNames=['좌측','중앙','우측'];
const MAX_WALL=[8,9,8];
type ChosenUnit={lane:number;index:number};


function TeamHud({player,owner,battle,chosenCard,chosenUnit,onPlace,onStrike,onChooseUnit,onResolveEffect}:{
  player:Player;
  owner:number;
  battle:BattleState;
  chosenCard:number|null;
  chosenUnit:ChosenUnit|null;
  onPlace:(lane:number)=>void;
  onStrike:(lane:number,target:number|null)=>void;
  onChooseUnit:(lane:number)=>void;
  onResolveEffect:(lane:number)=>void;
}) {
  const active=battle.active===owner;
  const current=chosenCard===null?null:battle.players[battle.active].hand[chosenCard];
  const targetSpell=current?.type==='마법'&&(current.id==='S001'||current.id==='S002'||current.id==='H004');
  const legalTargets=chosenUnit?legalAttackTargets(battle,chosenUnit.lane,chosenUnit.index):null;
  const effect=battle.pendingEffect;
  const effectOwner=effect?(effect.type==='ally-heal'?effect.owner:1-effect.owner):null;
  const eligible=eligibleEffectLanes(battle);
  return <section className={['arena-team',active?'arena-team-active':'',owner===1?'arena-team-enemy':'arena-team-ally'].join(' ')}>
    <div className="arena-team-header">
      <span><strong>{player.name}</strong> {active&&<em className="arena-turn-label">행동 중</em>}</span>
      <span>덱 {player.deck.length} · 손패 {player.hand.length} · 묘지 {player.grave.length}</span>
    </div>
    <div className="arena-lanes">
      {player.lanes.map((lane,i)=>{
        const unit=lane[0];
        const wall=player.walls[i];
        const canHitWall=owner!==battle.active&&legalTargets?.wallLane===i&&wall>0;
        const canHitUnit=owner!==battle.active&&!!unit&&!!legalTargets?.unitLanes.includes(i);
        const canResolveEffect=!!effect&&effectOwner===owner&&!!unit&&eligible.includes(i);
        const canDeploy=active&&chosenCard!==null&&canPlayCard(battle,chosenCard,i);
        const canSelect=active&&!!unit&&unit.canAttack&&!battle.pendingRetreat&&!battle.discarding&&!effect;
        const canSpellTarget=!!unit&&!!targetSpell&&canDeploy;
        const canRetreat=!!battle.pendingRetreat&&battle.pendingRetreat.owner===owner&&wall>0&&!unit&&battle.pendingRetreat.from!==i;
        const installed=player.spellZones[i];
        return <div key={i} className={['arena-lane',canDeploy?'arena-lane-deploy':''].join(' ')}>
          <button type="button"
            className={['arena-wall',wall===0?'arena-wall-down':'',canHitWall?'arena-target':''].join(' ')}
            disabled={!canHitWall} onClick={()=>onStrike(i,null)}
            aria-label={player.name+' '+laneNames[i]+' 성벽 HP '+wall+'/'+MAX_WALL[i]}>
            <span>♜ {laneNames[i]} 성벽</span><strong>{wall}/{MAX_WALL[i]}</strong>
            <span className="arena-wall-track"><i style={{width:(wall/MAX_WALL[i]*100)+'%'}}/></span>
          </button>
          {unit?<button type="button"
            className={['arena-unit',canSelect?'arena-ready':'',
              canHitUnit||canSpellTarget||canResolveEffect?'arena-target':'',
              chosenUnit?.lane===i&&active?'arena-selected':''].join(' ')}
            disabled={!(canSelect||canHitUnit||canSpellTarget||canResolveEffect)}
            onClick={()=>canResolveEffect?onResolveEffect(i):
              active?(canSpellTarget?onPlace(i):onChooseUnit(i)):onStrike(i,0)}
            title={canResolveEffect?'소환 효과 대상 선택':
              unit.stance==='defense'?'수비 표시 · 전투 피해 반감':'공격 표시'}>
            <span className="arena-unit-name">{unit.stance==='defense'?'🛡':'⚔'} {unit.name}</span>
            <small>ATK {unit.atk} · HP {unit.hp}/{unit.maxHp} · {unit.stunnedTurns?'봉쇄 '+unit.stunnedTurns:unit.canAttack&&unit.stance==='attack'?'공격 가능':unit.stance==='defense'?'수비':'대기'}
              {unit.taunt&&i===1&&unit.guardSide!==undefined?' · '+laneNames[unit.guardSide]+' 보호':''}
            </small>
          </button>:<button type="button"
            className={['arena-empty-slot',canDeploy||canRetreat?'arena-target':''].join(' ')}
            disabled={!canDeploy&&!canRetreat}
            onClick={()=>canRetreat?onPlace(-i-1):onPlace(i)}>
            {canRetreat?'↪ 이 전선으로 퇴각':
              canDeploy?(targetSpell?'✧ 마법 사용':'✦ 유닛 소환'):'비어 있음'}
          </button>}
          <span className="arena-magic-slot" title="정식 지속·장착마법은 아직 미구현">
            ✧ 마법 존 · {wall===0?'폐쇄':installed?installed.name:'빈 슬롯 (구현 예정)'}
          </span>
        </div>;
      })}
    </div>
  </section>;
}

const globalSpell=(card:Card)=>card.id==='S003'||card.id==='R004';

export default function BattleApp({battle,setBattle}:{
  battle:BattleState;
  setBattle:(battle:BattleState)=>void;
}){
  const player=battle.players[battle.active];
  const [chosenCard,setChosenCard]=useState<number|null>(null);
  const [chosenUnit,setChosenUnit]=useState<ChosenUnit|null>(null);
  const [stance,setStance]=useState<Stance>('attack');
  const [guardSide,setGuardSide]=useState<0|2>(0);
  const [show3d,setShow3d]=useState(true);
  const [message,setMessage]=useState('');
  const actingCard=chosenCard===null?null:player.hand[chosenCard];
  const opposing=battle.players[1-battle.active];
  const selectedUnit=chosenUnit&&player.lanes[chosenUnit.lane][chosenUnit.index];

  const chooseCard=(i:number)=>{
    if(battle.discarding){
      const next=discardCard(battle,i);
      if(next!==battle)setBattle(next);
      setMessage('턴 종료 시 손패를 7장까지 줄이세요.');
      return;
    }
    const card=player.hand[i];
    if(!card||battle.pendingRetreat||battle.pendingEffect||battle.winner)return;
    if(card.type==='마법'&&!SUPPORTED_SPELLS.has(card.id)){
      setMessage('해당 마법은 아직 구현되지 않았습니다.');
      return;
    }
    if(globalSpell(card)){
      const next=playCard(battle,i,0);
      if(next!==battle){
        setBattle(next);setChosenCard(null);setChosenUnit(null);
        setMessage(`${card.name} 사용`);
      }
      return;
    }
    setChosenUnit(null);
    setChosenCard(chosenCard===i?null:i);
    setMessage(card.type==='마법'?'효과를 받을 아군 유닛이 있는 전선을 선택하세요.':'비어 있는 아군 활성 전선을 선택하세요.');
  };

  const place=(lane:number)=>{
    if(lane<0&&battle.pendingRetreat){
      const next=resolveRetreat(battle,-lane-1);
      if(next!==battle){setBattle(next);setMessage('긴급 퇴각을 완료했어요.');}
      return;
    }
    if(chosenCard===null||lane<0)return;
    const next=playCard(battle,chosenCard,lane,stance,guardSide);
    if(next===battle){setMessage('그 전선에 놓을 수 없습니다. 마나와 빈칸을 확인하세요.');return;}
    setBattle(next);setChosenCard(null);
    setMessage(next.pendingEffect?'소환 능력이 발동했습니다. 빛나는 대상 유닛을 클릭하세요.':'카드 사용 완료!');
  };


  const strike=(lane:number,target:number|null)=>{
    if(chosenUnit===null)return;
    const next=attackUnit(battle,chosenUnit.lane,chosenUnit.index,target,lane);
    if(next===battle){
      setMessage('적법한 대상을 선택하세요. 같은 전선의 유닛이 우선이며, 인접 도발이 차단할 수 있습니다.');
      return;
    }
    setBattle(next);setChosenUnit(null);
    setMessage(target===null?'성벽 공격 성공!':'유닛 공격 해결!');
  };

  const resolveEffect=(lane:number)=>{
    const next=resolvePendingEffect(battle,lane);
    if(next===battle){setMessage('소환 능력을 적용할 유효한 대상이 아닙니다.');return;}
    setBattle(next);
    setChosenCard(null);setChosenUnit(null);
    setMessage('소환 능력 적용 완료!');
  };
  const chooseUnit=(lane:number)=>{
    setChosenCard(null);
    setChosenUnit(chosenUnit?.lane===lane?null:{lane,index:0});
    setMessage(chosenUnit?.lane===lane?'유닛 선택 해제':player.lanes[lane][0]?.stance==='defense'?'수비 표시입니다. 아래 표시 전환 버튼으로 공격 표시로 바꿀 수 있어요.':'빛나는 적 유닛 또는 성벽을 공격하세요. 인접 도발도 공격할 수 있습니다.');
  };

  const runTurn=()=>{
    const next=endTurn(battle);
    if(next===battle)return;
    setBattle(next);setChosenCard(null);setChosenUnit(null);
    setMessage(next.discarding?'손패에서 버릴 카드를 직접 선택하세요.':'턴을 교대했습니다.');
  };

  const flip=()=>{
    if(!chosenUnit)return;
    const next=changeStance(battle,chosenUnit.lane);
    if(next!==battle){
      setBattle(next);setChosenUnit(null);
      setMessage('표시 변경으로 이번 턴의 기본 행동권을 사용했어요.');
    }
  };
  const dismissRetreat=()=>{
    const next=resolveRetreat(battle,null);
    if(next!==battle){setBattle(next);setMessage('전선 유닛을 묘지로 이동했습니다 (파괴 아님).');}
  };
  return <section className="combat-experience" aria-label="3D 하이브리드 전투">
    <header className="combat-command">
      <div className="combat-round">
        <strong>{battle.winner?`🏆 ${battle.winner} 승리`:`${player.name} 행동 턴`}</strong>
        <span>ROUND {battle.turn}</span>
        <span className="combat-mana">💧 {player.mana}/{player.maxMana}</span>
      </div>
      <div className="combat-actions">
        <button type="button" className={show3d?'combat-toggle-on':''}
          aria-pressed={show3d} onClick={()=>setShow3d(v=>!v)}>
          {show3d?'◈ 3D 전장 ON':'▤ 2D 전장'}
        </button>
        <button type="button" onClick={runTurn}
          disabled={!!battle.winner||!!battle.pendingRetreat||!!battle.pendingEffect}>
          {battle.discarding?'카드 버리기 중':'턴 종료'} 
        </button>
      </div>
    </header>
    <div className="combat-guide" role="status">
      {battle.pendingEffect?'소환 효과 대상을 선택하세요. 빛나는 유닛을 클릭하면 능력이 적용됩니다.':
       battle.pendingRetreat?`${battle.players[battle.pendingRetreat.owner].name} 성벽이 무너졌습니다. 빈 활성 전선으로 유닛을 퇴각시키세요.`:
       battle.discarding?'손패를 직접 선택해 7장 이하로 줄이고 다시 턴 종료를 누르세요.':
       message||'① 손패 카드 선택 → 빈 전선 소환 · ② 녹색 유닛 선택 → 적 유닛 또는 성벽 클릭 · ③ 턴 종료'}
    </div>
    <div className={`combat-arena ${show3d?'combat-arena-3d':'combat-arena-flat'}`}>
      {show3d&&<Battlefield3D battle={battle}/>}
      <div className="combat-arena-overlay">
        <TeamHud player={battle.players[1]} owner={1} battle={battle}
          chosenCard={chosenCard} chosenUnit={chosenUnit}
          onPlace={place} onStrike={strike} onChooseUnit={chooseUnit} onResolveEffect={resolveEffect}/>
        <div className="combat-arena-center">
          <span>✦ {show3d?'LIVE 3D BATTLEFIELD':'TACTICAL BATTLEFIELD'} ✦</span>
          <small>위: B · 아래: A · 좌/중/우 3전선</small>
        </div>
        <TeamHud player={battle.players[0]} owner={0} battle={battle}
          chosenCard={chosenCard} chosenUnit={chosenUnit}
          onPlace={place} onStrike={strike} onChooseUnit={chooseUnit} onResolveEffect={resolveEffect}/>
      </div>
    </div>
    {battle.pendingRetreat&&<div className="combat-retreat-banner">
      <strong>긴급 퇴각 선택 — {battle.players[battle.pendingRetreat.owner].name}</strong>
      <span>다른 빈 활성 전선을 클릭하거나 묘지로 보내세요.</span>
      <button onClick={dismissRetreat}>퇴각 포기 · 묘지로</button>
    </div>}
    {selectedUnit&&!battle.pendingRetreat&&<div className="combat-unit-tools">
      <span>선택: {selectedUnit.name} ({selectedUnit.stance==='defense'?'수비':'공격'} 표시)</span>
      <button onClick={flip}>⚑ 표시 전환 (행동권 소모)</button>
      <button onClick={()=>setChosenUnit(null)}>선택 취소</button>
    </div>}
    <div className="combat-hand-header">
      <strong>🃏 {player.name} 손패 <small>{player.hand.length}장</small></strong>
      {(actingCard?.type==='유닛'&&actingCard.text.includes('도발')||actingCard?.id==='S002')&&<div className="combat-stance-choice">
        <span>중앙 도발 보호</span>
        <button aria-pressed={guardSide===0} className={guardSide===0?'active':''} onClick={()=>setGuardSide(0)}>← 좌측</button>
        <button aria-pressed={guardSide===2} className={guardSide===2?'active':''} onClick={()=>setGuardSide(2)}>우측 →</button>
      </div>}
      {!battle.discarding&&<div className="combat-stance-choice">
        <span>소환 표시</span>
        <button aria-pressed={stance==='attack'} className={stance==='attack'?'active':''}
          onClick={()=>setStance('attack')}>⚔ 공격</button>
        <button aria-pressed={stance==='defense'} className={stance==='defense'?'active':''}
          onClick={()=>setStance('defense')}>🛡 수비</button>
      </div>}
    </div>
    <div className={`combat-hand-v033 ${battle.discarding?'combat-discard-hand':''}`}>
      {player.hand.map((card,i)=>{
        const disabled=!battle.discarding&&(!!battle.winner||!!battle.pendingRetreat||
          !!battle.pendingEffect||player.mana<card.cost||(card.type==='마법'&&!SUPPORTED_SPELLS.has(card.id)));
        const rarity=rarityOf(card.rarity as Rarity).color;
        return <button key={i} type="button" className={`battle-hand-card ${chosenCard===i?'chosen':''}`}
          style={{'--rarity':rarity} as CSSProperties} disabled={disabled}
          onClick={()=>chooseCard(i)} title={card.text}>
          <div className="battle-hand-head"><span>{card.rarity}</span><span>💧 {card.cost}</span></div>
          <div className="battle-hand-art"><CardArtwork card={card}/></div>
          <strong>{card.name}</strong>
          <small>{card.type==='유닛'?`⚔ ${card.atk??0} · ♥ ${card.hp??0}`:card.text}</small>
          {card.type==='마법'&&!SUPPORTED_SPELLS.has(card.id)&&<em>효과 미구현</em>}
          {battle.discarding&&<em>묘지로 버리기</em>}
        </button>;
      })}
    </div>
    <details className="combat-details">
      <summary>📜 전투 기록 · 현재 시험 규칙 <span>펼치기</span></summary>
      <div className="combat-details-inner">
        <div><strong>최근 전투 기록</strong>{battle.log.slice(0,10).map((line,i)=><p key={i}>{line}</p>)}</div>
        <p><strong>V0.4 시험 구현:</strong> 3성벽, 1전선 1유닛, 수비 피해 반감, 같은 전선 유닛 우선, 측면 도발의 중앙 보호와 중앙 도발의 좌/우 선택, 대상 선택형 소환 효과, 돌격 기병, 간이 마법 5종, 마법 존 빈 슬롯, 손패 선택 버리기.</p>
        <p><strong>미구현:</strong> 체인/마법 속도, 정식 지속·장착마법과 마법 존 점유, 계승/합성, 우회 공성 A/B/C, 일부 유닛 고유 능력. 3D 모델은 임시 절차적 모델입니다.</p>
      </div>
    </details>
  </section>;
}
