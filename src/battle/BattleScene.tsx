import {useEffect,useState} from 'react';
import type {BattleState} from '../types';
import BattleApp from './BattleApp';
import './battleScene.css';

type Dialog='exit'|'restart'|null;

export default function BattleScene({battle,setBattle,onExit,onNewBattle}:{
  battle:BattleState;
  setBattle:(state:BattleState)=>void;
  onExit:()=>void;
  onNewBattle:()=>void;
}){
  const [dialog,setDialog]=useState<Dialog>(null);

  useEffect(()=>{
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=previousOverflow;};
  },[]);

  useEffect(()=>{
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key!=='Escape')return;
      event.preventDefault();
      setDialog(current=>current===null?'exit':null);
    };
    window.addEventListener('keydown',onKeyDown);
    return ()=>window.removeEventListener('keydown',onKeyDown);
  },[]);

  const hasEnded=!!battle.winner;
  return <div className="battle-scene-root">
    <header className="battle-scene-header">
      <div className="battle-scene-brand">
        <span className="battle-scene-brandmark" aria-hidden="true">✦</span>
        <div>
          <strong>BTWRD <span>CHRONICLES</span></strong>
          <small>COMBAT ALPHA V0.5.1 · COMBAT UX</small>
        </div>
      </div>
      <div className="battle-scene-navigation">
        <span className="scene-match-status">{hasEnded?'전투 종료':battle.players[battle.active].name+'의 턴'}</span>
        <button type="button" onClick={()=>setDialog('restart')} aria-label="새 전투 시작하기">↻ 새 전투</button>
        <button type="button" className="scene-exit-button" onClick={()=>setDialog('exit')}>⌂ 로비로</button>
      </div>
    </header>

    <main className="battle-scene-main" aria-label="독립 전투 화면">
      <BattleApp battle={battle} setBattle={setBattle}/>
    </main>

    {dialog!==null&&<div className="battle-scene-dialog-backdrop" onMouseDown={event=>{
      if(event.target===event.currentTarget)setDialog(null);
    }}>
      <div className="battle-scene-dialog" role="dialog" aria-modal="true"
        aria-labelledby="battle-scene-dialog-title" aria-describedby="battle-scene-dialog-description">
        <span className="battle-scene-dialog-icon" aria-hidden="true">{dialog==='exit'?'⌂':'↻'}</span>
        <h2 id="battle-scene-dialog-title">{dialog==='exit'?'로비로 돌아갈까요?':'전투를 새로 시작할까요?'}</h2>
        <p id="battle-scene-dialog-description">{dialog==='exit'?
          '현재 전투는 그대로 보존됩니다. 로비에서 전투 이어하기를 누르면 같은 상태로 돌아옵니다.':
          '진행 중인 전투와 손패, 전장 배치가 초기화됩니다. 기존 카드 도감과 보유 GEM은 유지됩니다.'}</p>
        <div className="battle-scene-dialog-actions">
          <button type="button" autoFocus onClick={()=>setDialog(null)}>계속 플레이</button>
          <button type="button" className="scene-confirm-button"
            onClick={()=>{setDialog(null);if(dialog==='exit')onExit();else onNewBattle();}}>
            {dialog==='exit'?'로비로 이동':'새 전투 시작'}
          </button>
        </div>
      </div>
    </div>}
  </div>;
}
