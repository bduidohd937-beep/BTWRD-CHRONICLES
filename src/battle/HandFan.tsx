import {useState} from 'react';
import type {CSSProperties} from 'react';
import type {Card} from '../types';
import type {Rarity} from '../foundation/foundationTypes';
import {rarityOf} from '../foundation/foundationCards';
import CardArtwork from '../foundation/CardArtwork';

export default function HandFan({cards,selected,disabled,discardMode,onChoose}:{
  cards:Card[];
  selected:number|null;
  disabled:(card:Card)=>boolean;
  discardMode:boolean;
  onChoose:(index:number)=>void;
}){
  const [hovered,setHovered]=useState<number|null>(null);
  const focusedIndex=hovered!==null&&hovered<cards.length?hovered:selected;
  const focused=focusedIndex===null?null:cards[focusedIndex];
  return <div className="field-hand-layer" aria-label="플레이어 손패">
    {focused&&<div className="field-card-inspect" aria-live="polite">
      <strong>{focused.name} <span>💧{focused.cost}</span></strong>
      <span>{focused.type==='유닛'?('⚔ '+(focused.atk??0)+' · ♥ '+(focused.hp??0)):'마법'} · {focused.text}</span>
    </div>}
    <div className="field-hand-fan" role="group" aria-label={'손패 '+cards.length+'장'}>
      {cards.map((card,i)=>{
        const center=(cards.length-1)/2;
        const delta=i-center;
        const angle=Math.max(-13,Math.min(13,delta*3.7));
        const offset=Math.abs(delta)*3.5;
        const style={
          '--fan-angle':angle+'deg',
          '--fan-y':offset+'px',
          '--rarity':rarityOf(card.rarity as Rarity).color,
          '--fan-index':i,
        } as CSSProperties;
        const isSelected=selected===i;
        const isHovered=hovered===i;
        const isBlocked=disabled(card);
        return <button key={card.id+'-'+i} type="button"
          className={['field-hand-card',isSelected?'field-hand-selected':'',
            isHovered?'field-hand-hovered':'',discardMode?'field-hand-discard':''].join(' ')}
          style={style}
          disabled={isBlocked}
          aria-pressed={isSelected}
          aria-label={(discardMode?'버릴 카드: ':'손패: ')+card.name+', 코스트 '+card.cost+', '+card.text}
          onMouseEnter={()=>setHovered(i)}
          onMouseLeave={()=>setHovered(current=>current===i?null:current)}
          onFocus={()=>setHovered(i)}
          onBlur={()=>setHovered(current=>current===i?null:current)}
          onClick={()=>onChoose(i)}>
          <span className="field-hand-card-head">
            <span>{card.rarity}</span>
            <strong>💧{card.cost}</strong>
          </span>
          <span className="field-hand-card-art"><CardArtwork card={card}/></span>
          <strong className="field-hand-card-name">{card.name}</strong>
          <small>{card.type==='유닛'?'⚔ '+(card.atk??0)+' · ♥ '+(card.hp??0):'✧ 마법'}</small>
          {discardMode&&<span className="field-hand-discard-tag">버리기</span>}
        </button>;
      })}
      {cards.length===0&&<span className="field-hand-empty">손패가 없습니다.</span>}
    </div>
  </div>;
}
