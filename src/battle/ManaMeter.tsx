export default function ManaMeter({mana,maxMana,previewCost}:{
  mana:number;maxMana:number;previewCost:number|null;
}){
  const remaining=previewCost===null?null:mana-previewCost;
  return <aside className="field-mana-panel" aria-label={'마나 '+mana+'/'+maxMana}>
    <div className="field-mana-panel-head">
      <strong>💧 마나</strong>
      <span>{mana} / {maxMana}</span>
    </div>
    <div className="field-mana-pips" role="img" aria-label={maxMana+'칸 중 '+mana+'칸 사용 가능'}>
      {Array.from({length:maxMana},(_,i)=>{
        const active=i<mana;
        const consuming=active&&previewCost!==null&&i>=Math.max(0,remaining??0);
        return <span key={i}
          className={['field-mana-pip',active?'is-filled':'',consuming?'is-spending':''].join(' ')}
          title={consuming?'선택 카드 사용 시 소모 예정':active?'사용 가능':'이미 사용한 마나'}
          aria-hidden="true">◆</span>;
      })}
    </div>
    {previewCost!==null&&<small className={remaining!==null&&remaining<0?'mana-insufficient':''}>
      소모 {previewCost} · 사용 후 {remaining!==null&&remaining>=0?remaining+'/'+maxMana:'마나 부족'}
    </small>}
  </aside>;
}
