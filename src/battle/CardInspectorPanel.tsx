import type {Card,Unit} from '../types';
import CombatCardInfo from './CombatCardInfo';

/** The small persistent tab is the only inspector surface shown at rest.
 * Hover/keyboard preview expands; pin keeps the selected card visible.
 */
export default function CardInspectorPanel({card,unit,source,open,pinned,onToggle,onPin,onCollapse}:{
  card:Card|null;
  unit:Unit|null|undefined;
  source:'손패'|'전장'|'발동';
  open:boolean;
  pinned:boolean;
  onToggle:()=>void;
  onPin:()=>void;
  onCollapse:()=>void;
}){
  return <div className={'field-inspector-shell'+(open?' field-inspector-open':'')}
    aria-label="카드 정보 패널">
    {open?<div className="field-inspector-expanded">
      <div className="field-inspector-controls">
        <span>✦ CARD INFO</span>
        <button type="button" className={pinned?'field-inspector-pinned':''}
          disabled={!card}
          aria-pressed={pinned}
          onClick={onPin}>{pinned?'📌 고정 해제':'📌 고정'}</button>
        <button type="button" onClick={onCollapse} aria-label="카드 정보 접기">접기 ✕</button>
      </div>
      <CombatCardInfo card={card} unit={unit} source={source}/>
    </div>:<button type="button" className="field-inspector-tab"
      aria-expanded={false} onClick={onToggle} title="카드 정보 열기">
      <span aria-hidden="true">✦</span> 카드 정보 <span aria-hidden="true">›</span>
    </button>}
  </div>;
}
