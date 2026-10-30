import type {CSSProperties} from 'react';
import type {BattleState,Card,Player,Unit} from '../types';
import {eligibleEffectLanes,legalAttackTargets,canPlayCard} from '../engine';
import CardArtwork from '../foundation/CardArtwork';

/**
 * Presentational battlefield overlay: every clickable slot reads the engine state.
 * Three.js units and these original card miniatures represent the same entity.
 * Installed spell zones and the shared field slot are currently display-only.
 */
const names=['좌측','중앙','우측'] as const;
const maxWalls=[8,9,8] as const;
type SelectedUnit={lane:number;index:number};

export interface BattlefieldOverlayProps {
  battle:BattleState;
  chosenCard:number|null;
  chosenUnit:SelectedUnit|null;
  onPlay:(lane:number)=>void;
  onStrike:(lane:number,target:number|null)=>void;
  onChooseUnit:(lane:number)=>void;
  onResolveEffect:(lane:number)=>void;
  onRetreat:(lane:number)=>void;
  onInspect:(card:Card)=>void;
}

function InstalledSpellZone({player,lane}: {player:Player;lane:number}){
  const spell=player.spellZones[lane];
  const disabled=player.walls[lane]<=0;
  return <div className={['field-magic-zone',disabled?'field-zone-closed':'',spell?'field-zone-occupied':''].join(' ')}
    data-zone="magic" data-lane={lane}
    title={disabled?'성벽 붕괴로 폐쇄된 마법 존':spell?'장착·지속 마법 표시 (정식 효과 미구현)':'빈 마법 존 · 지속/장착/체인 미구현'}>
    <span className="field-zone-icon" aria-hidden="true">✧</span>
    <span>{disabled?'폐쇄':spell?spell.name:'마법'}</span>
    {!disabled&&!spell&&<small>빈 슬롯</small>}
  </div>;
}

function WallZone({owner,player,lane,canHitWall,onStrike}:{
  owner:number;player:Player;lane:number;canHitWall:boolean;
  onStrike:(lane:number,target:number|null)=>void;
}){
  const hp=player.walls[lane];
  return <button type="button" data-zone="wall" data-owner={owner} data-lane={lane}
    className={['field-wall-zone',hp<=0?'field-zone-closed':'',canHitWall?'field-zone-target':''].join(' ')}
    disabled={!canHitWall}
    onClick={()=>onStrike(lane,null)}
    aria-label={player.name+' '+names[lane]+' 성벽 HP '+hp+'/'+maxWalls[lane]}>
    <span className="field-wall-symbol" aria-hidden="true">♜</span>
    <span className="field-wall-name">{names[lane]} 성벽</span>
    <strong>{hp}/{maxWalls[lane]}</strong>
    <span className="field-wall-meter"><i style={{width:hp/maxWalls[lane]*100+'%'}}/></span>
  </button>;
}

function UnitZone({owner,lane,unit,player,selected,canDeploy,canHit,canResolve,canRetreat,canSpellTarget,onPlay,onStrike,onChooseUnit,onResolveEffect,onRetreat,onInspect}:{
  owner:number;lane:number;unit:Unit|undefined;player:Player;selected:boolean;
  canDeploy:boolean;canHit:boolean;canResolve:boolean;canRetreat:boolean;canSpellTarget:boolean;
  onPlay:(lane:number)=>void;onStrike:(lane:number,target:number|null)=>void;
  onChooseUnit:(lane:number)=>void;onResolveEffect:(lane:number)=>void;
  onRetreat:(lane:number)=>void;onInspect:(card:Card)=>void;
}){
  const canClick=canDeploy||canHit||canResolve||canRetreat||canSpellTarget||selected||
    (!!unit&&owner===0&&unit.canAttack);
  const canSelect=!!unit&&owner===0&&unit.canAttack&&!canSpellTarget&&!canResolve;
  const inspectLabel=unit?unit.name:'빈 유닛 존';
  const card=unit?{id:unit.cardId,name:unit.name,rarity:'일반',type:'유닛' as const,
    cost:0,atk:unit.atk,hp:unit.hp,text:'전장에 배치된 유닛'}:null;
  const disabled=!canClick;
  return <button type="button" data-zone="unit" data-owner={owner} data-lane={lane}
    className={['field-unit-zone',unit?'field-unit-occupied':'',
      selected?'field-unit-selected':'',
      canDeploy||canHit||canResolve||canRetreat||canSpellTarget?'field-zone-target':'',
      canSelect?'field-unit-ready':'',
      player.walls[lane]===0?'field-zone-closed':''].join(' ')}
    disabled={disabled} onClick={()=>{
      if(canResolve){onResolveEffect(lane);return;}
      if(canSpellTarget){onPlay(lane);return;}
      if(canHit){onStrike(lane,0);return;}
      if(canRetreat){onRetreat(lane);return;}
      if(canDeploy){onPlay(lane);return;}
      if(canSelect){onChooseUnit(lane);return;}
      if(unit&&card)onInspect(card);
    }}
    title={unit?unit.name+' | ATK '+unit.atk+' / HP '+unit.hp+'/'+unit.maxHp:
      canDeploy?'이 전선에 유닛 소환':canRetreat?'유닛 퇴각 전선':inspectLabel}
    aria-label={player.name+' '+names[lane]+' '+(unit?unit.name+' 공격 '+unit.atk+' 체력 '+unit.hp+'/'+unit.maxHp:'빈 유닛 존')}>
    {unit&&card?<>
      <span className="field-card-art"><CardArtwork card={card}/></span>
      <span className="field-card-details">
        <strong>{unit.name}</strong>
        <small>⚔ {unit.atk} &nbsp; ♥ {unit.hp}/{unit.maxHp}</small>
        <small>{unit.stance==='defense'?'🛡 수비':'⚔ 공격'}
          {unit.canAttack?' · 준비':''}
          {unit.taunt?' · 도발':''}
        </small>
      </span>
    </>:<>
      <span className="field-zone-empty-symbol" aria-hidden="true">✧</span>
      <span className="field-unit-empty-label">유닛 존</span>
      {(canDeploy||canRetreat)&&<small>{canRetreat?'퇴각':'소환'}</small>}
    </>}
  </button>;
}

function PlayerFormation({battle,owner,chosenCard,chosenUnit,onPlay,onStrike,onChooseUnit,onResolveEffect,onRetreat,onInspect}:{
  owner:number;battle:BattleState;chosenCard:number|null;chosenUnit:SelectedUnit|null;
  onPlay:(lane:number)=>void;onStrike:(lane:number,target:number|null)=>void;
  onChooseUnit:(lane:number)=>void;onResolveEffect:(lane:number)=>void;
  onRetreat:(lane:number)=>void;onInspect:(card:Card)=>void;
}){
  const player=battle.players[owner];
  const active=owner===battle.active;
  const current=chosenCard===null?null:battle.players[battle.active].hand[chosenCard];
  const targetSpell=current?.type==='마법'&&['S001','S002','H004'].includes(current.id);
  const legal=chosenUnit?legalAttackTargets(battle,chosenUnit.lane,chosenUnit.index):null;
  const effect=battle.pendingEffect;
  const effectOwner=effect?(effect.type==='ally-heal'?effect.owner:1-effect.owner):null;
  const eligible=eligibleEffectLanes(battle);
  return <div className={['field-formation',owner===1?'field-formation-enemy':'field-formation-self'].join(' ')}
    aria-label={player.name+' 전장'}>
    <div className="field-formation-label">
      <strong>{player.name}</strong>
      <span>덱 {player.deck.length} · 손패 {player.hand.length} · 묘지 {player.grave.length}</span>
    </div>
    <div className="field-formation-columns">
      {[0,1,2].map(lane=>{
        const unit=player.lanes[lane][0];
        const canDeploy=active&&chosenCard!==null&&canPlayCard(battle,chosenCard,lane);
        const canSpellTarget=!!unit&&!!targetSpell&&canDeploy;
        const canChoose=active&&!battle.discarding&&!effect&&!battle.pendingRetreat&&!!unit&&unit.canAttack;
        const canHit=!!unit&&!active&&!!legal?.unitLanes.includes(lane);
        const canHitWall=!active&&legal?.wallLane===lane;
        const canResolve=!!unit&&!!effect&&effectOwner===owner&&eligible.includes(lane);
        const canRetreat=!!battle.pendingRetreat&&battle.pendingRetreat.owner===owner&&
          battle.pendingRetreat.from!==lane&&player.walls[lane]>0&&!unit;
        // The card occupies the unit zone; Three.js renders the same unit as a figurine.
        // For B: walls -> spells -> units. For A: units -> spells -> walls.
        return <div key={lane} className="field-formation-column"
          style={{'--field-index':lane} as CSSProperties}>
          <WallZone owner={owner} player={player} lane={lane}
            canHitWall={canHitWall} onStrike={onStrike}/>
          <InstalledSpellZone player={player} lane={lane}/>
          <UnitZone owner={owner} lane={lane} unit={unit} player={player}
            selected={active&&chosenUnit?.lane===lane}
            canDeploy={canDeploy&&!unit} canHit={canHit}
            canResolve={canResolve} canRetreat={canRetreat}
            canSpellTarget={canSpellTarget}
            onPlay={onPlay} onStrike={onStrike} onChooseUnit={onChooseUnit}
            onResolveEffect={onResolveEffect} onRetreat={onRetreat} onInspect={onInspect}/>
          {canChoose&&<span className="field-ready-marker" aria-hidden="true">●</span>}
        </div>;
      })}
    </div>
  </div>;
}

export default function BattlefieldOverlay(props:BattlefieldOverlayProps){
  return <div className="field-layout-overlay">
    <PlayerFormation {...props} owner={1}/>
    <div className="field-center-mark" aria-hidden="true">✦ BREAK THE WALLS ✦</div>
    <div className="field-shared-magic" data-zone="shared-field" aria-label="공용 필드마법 존 · 미구현"
      title="공용 필드마법 존은 향후 구현 예정입니다">
      ✧ 공용 필드 존 <span>준비 중</span>
    </div>
    <PlayerFormation {...props} owner={0}/>
  </div>;
}
