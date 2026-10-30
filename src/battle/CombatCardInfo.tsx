import type {CSSProperties} from 'react';
import type {Card,Unit} from '../types';
import type {Rarity} from '../foundation/foundationTypes';
import {rarityOf} from '../foundation/foundationCards';
import CardArtwork from '../foundation/CardArtwork';

const keywordDescriptions=[
  {key:'도발',description:'같은 전선의 적을 우선 방어하며, 위치에 따라 인접 전선도 보호합니다.'},
  {key:'소환 시',description:'소환이 완료되면 효과 발동 여부를 선택할 수 있습니다.'},
  {key:'공격 가능',description:'행동 가능한 공격 표시 유닛만 공격할 수 있습니다.'},
];

export default function CombatCardInfo({card,unit,source}:{
  card:Card|null;
  unit?:Unit|null;
  source?:'손패'|'전장'|'발동';
}){
  if(!card)return <aside className="field-card-detail field-card-detail-empty"
    aria-label="카드 상세 정보"><span>✦ CARD ARCHIVE</span>
    <strong>카드 정보</strong>
    <small>손패에 마우스를 올리거나 유닛 카드를 선택하면 이미지와 효과가 표시됩니다.</small>
  </aside>;
  const accent=rarityOf(card.rarity as Rarity)?.color??'#bba7c5';
  const keywords=keywordDescriptions.filter(item=>card.text.includes(item.key));
  const stance=unit?.stance;
  return <aside className="field-card-detail" aria-label={'카드 상세 정보: '+card.name}
    style={{'--detail-accent':accent} as CSSProperties}>
    <div className="field-card-detail-top">
      <span>{source??'카드 정보'} · {card.rarity}</span>
      <span>💧 {card.cost}</span>
    </div>
    <div className="field-card-detail-art"><CardArtwork card={card}/></div>
    <h2>{card.name}</h2>
    <div className="field-card-detail-stats">
      <span>{card.type}</span>
      {card.type==='유닛'&&<><span>⚔ {unit?.atk??card.atk??0}</span>
        <span>♥ {unit?unit.hp+'/'+unit.maxHp:card.hp??0}</span></>}
      {unit&&<span className={stance==='defense'?'field-detail-defense':'field-detail-attack'}>
        {stance==='defense'?'🛡 수비':'⚔ 공격'}
      </span>}
    </div>
    <div className="field-card-detail-effect">
      <strong>카드 효과</strong>
      <p>{card.text||'효과 없음'}</p>
    </div>
    {keywords.length>0&&<div className="field-card-detail-keywords">
      {keywords.map(k=><p key={k.key}><b>{k.key}</b> {k.description}</p>)}
    </div>}
    {card.temp&&<small className="field-card-detail-note">임시 카드 설정 · 정식 확정 전</small>}
  </aside>;
}
