import {useEffect,useState} from 'react';
import {CollectionApp} from './foundation/CollectionApp';
import CardArtwork from './foundation/CardArtwork';
import {CARDS as cards} from './foundation/foundationCards';
import {collectionStats,loadSave,persistSave} from './foundation/summon';
import type {GameSave,Tab} from './foundation/foundationTypes';
import {attackUnit,endTurn,newBattle,playCard} from './engine';
import type {BattleState,Player} from './types';
import './styles.css';

type AppTab = 'lobby' | 'battle' | Tab;

const lanes=['좌','중','우'];
const wallState=(hp:number)=>hp<=0?'broken':hp<=2?'critical':hp<=5?'damaged':'intact';

function BattleSide({player,playerIndex,battle,active,selectedCard,selectedUnit,onDeploy,onStrike,onSelectUnit}:{player:Player;playerIndex:number;battle:BattleState;active:boolean;selectedCard:number|null;selectedUnit:{lane:number;index:number}|null;onDeploy:(lane:number)=>void;onStrike:(lane:number,target:number|null)=>void;onSelectUnit:any}){
  const isTop=playerIndex===1;
  return <div className={`battle-side ${isTop?'player-two-side':'player-one-side'} ${active?'active-side':''}`}><h2><span>{player.name} {active&&<em className="active-badge">현재 턴</em>}</span><span>HP {player.hp}</span></h2>{isTop&&<div className="walls">{player.walls.map((w,i)=><button className={`wall wall-${wallState(w)} ${selectedUnit?'targetable':''}`} key={i} onClick={()=>onStrike(i,null)} disabled={!selectedUnit}>▣ {lanes[i]} 성벽 <strong>{w}</strong></button>)}</div>}<div className="lane-grid">{player.lanes.map((l,i)=><div className={`lane ${selectedCard!==null&&active?'deployable':''}`} key={i} onClick={()=>selectedCard!==null&&active&&onDeploy(i)}><b>{lanes[i]} 전선</b>{l.length===0&&<span className="lane-empty">빈 전선</span>}{l.map((u,j)=>{const selectable=active&&u.canAttack&&!selectedCard;const targetable=!active&&!!selectedUnit;return <button className={`combat-unit ${active?'ally-unit':'enemy-unit'} ${u.canAttack?'ready':''} ${selectable&&selectedUnit?.lane===i&&selectedUnit.index===j?'selected':''} ${targetable?'targetable':''}`} disabled={active?!selectable&&!(!selectedCard&&selectedUnit?.lane===i&&selectedUnit.index===j):!selectedUnit} key={u.cardId+j} onClick={(event)=>{event.stopPropagation();active?onSelectUnit(i,j):onStrike(i,j)}}><CardArtwork card={cards.find(c=>c.id===u.cardId)??cards[0]}/><span>{u.name}</span><small>⚔ {u.atk} · ♥ {u.hp}/{u.maxHp}</small></button>})}</div>)}</div>{!isTop&&<div className="walls">{player.walls.map((w,i)=><div className={`wall wall-${wallState(w)}`} key={i}>▣ {lanes[i]} 성벽 <strong>{w}</strong></div>)}</div>}</div>;
}

function Battle({battle,setBattle}:{battle:BattleState;setBattle:(b:BattleState)=>void}){const p=battle.players[battle.active];const [selectedCard,setSelectedCard]=useState<number|null>(null);const [selectedUnit,setSelectedUnit]=useState<{lane:number;index:number}|null>(null);const chooseCard=(index:number)=>{setSelectedUnit(null);setSelectedCard(selectedCard===index?null:index)};const deploy=(lane:number)=>{if(selectedCard===null)return;const next=playCard(battle,selectedCard,lane);if(next!==battle){setBattle(next);setSelectedCard(null)}};const strike=(lane:number,target:number|null)=>{if(!selectedUnit)return;const next=attackUnit(battle,lane,selectedUnit.index,target);if(next!==battle){setBattle(next);setSelectedUnit(null)}};return <section className="battle-view"><div className="battle-toolbar"><div><b>{battle.winner??`${p.name}의 차례`}</b><span className="turn-pill">TURN {battle.turn}</span></div><span className="resource">💧 {p.mana}/{p.maxMana}</span><button onClick={()=>{setBattle(endTurn(battle));setSelectedCard(null);setSelectedUnit(null)}} disabled={!!battle.winner}>턴 종료</button></div><div className="howto">{selectedCard!==null?'배치할 전선을 선택하세요 — 고정 배치: 플레이어 A 아래 / 플레이어 B 위':selectedUnit?'공격 대상을 선택하세요 — 같은 전선의 적 유닛 또는 성벽을 누르세요.':'손패를 선택해 소환하거나 초록색 준비 유닛을 선택해 공격하세요.'}</div><div className="battle-board"><BattleSide player={battle.players[1]} playerIndex={1} battle={battle} active={battle.active===1} selectedCard={selectedCard} selectedUnit={selectedUnit} onDeploy={deploy} onStrike={strike} onSelectUnit={setSelectedUnit}/><div className="battle-divider">⚔ {battle.turn}턴 · {selectedUnit?'공격 선택':'전투선'} · 위 B / 아래 A</div><BattleSide player={battle.players[0]} playerIndex={0} battle={battle} active={battle.active===0} selectedCard={selectedCard} selectedUnit={selectedUnit} onDeploy={deploy} onStrike={strike} onSelectUnit={setSelectedUnit}/></div><div className="combat-hand"><h2>{p.name} 손패 <small>{selectedCard!==null?'선택됨 · 전선에 배치':'카드를 선택하세요'}</small></h2>{p.hand.map((c,i)=><button className={`combat-card ${selectedCard===i?'selected':''}`} key={i} disabled={p.mana<c.cost||!!battle.winner} onClick={()=>chooseCard(i)}><CardArtwork card={c}/><b>{c.name}</b><small>💧 {c.cost} · {c.type}</small><span>{c.text}</span></button>)}</div><div className="combat-log"><b>전투 로그</b>{battle.log.slice(0,6).map((x,i)=><div key={i}>{x}</div>)}</div><aside className="rule-note"><b>이번 패치 확정</b> 3전선 · 성벽 3개 · 손패 최대 7장 · 마나 상한 10<br/><b>미구현</b> 카드 세부 능력 · 체인/마법 속도 · 합성 소환 · 고급 공성 규칙</aside></section>}


const navItems: {id:AppTab;label:string}[] = [
  {id:'lobby',label:'⌂ 메인 로비'},
  {id:'battle',label:'⚔ 전투'},
  {id:'summon',label:'✧ 카드 뽑기'},
  {id:'collection',label:'▣ 카드 도감'},
];

function Lobby({game,developerMode,onNavigate}:{
  game:GameSave;
  developerMode:boolean;
  onNavigate:(next:AppTab)=>void;
}) {
  const stats=collectionStats(game);
  const menu=[
    {id:'battle' as const,symbol:'⚔',title:'전투',description:'세 성벽을 지키고 상대의 전선을 무너뜨리세요.',sub:'COMBAT ALPHA · 기본 전투 체험'},
    {id:'summon' as const,symbol:'✧',title:'카드 뽑기',description:'새로운 영웅과 마법을 수집하세요.',sub:'SUMMONING CHAMBER'},
    {id:'collection' as const,symbol:'▣',title:'카드 도감',description:'수집한 카드와 아직 만나지 못한 영웅을 확인하세요.',sub:'THE HERO ARCHIVE'},
  ];
  return <main className="main-shell lobby-shell">
    <section className="lobby-hero">
      <div>
        <span className="eyebrow">BREAK THE WALLS · ROLL THE DICE</span>
        <h2>세 전선, 세 성벽.<br/><span>당신의 연대기가 시작된다.</span></h2>
        <p>카드를 모으고, 나만의 전략으로 세 전선을 지켜 보세요. 현재 전투 모드는 규칙을 개발 중인 알파 테스트입니다.</p>
        <button className="lobby-main-action" onClick={()=>onNavigate('battle')}>⚔ 전투 시작</button>
      </div>
      <div className="lobby-emblem" aria-hidden="true">✦</div>
    </section>
    <div className="lobby-status" aria-label="내 수집 현황">
      <span><small>수집한 카드</small><strong>{stats.owned}<em> / {stats.total}</em></strong></span>
      <span><small>누적 카드 뽑기</small><strong>{game.pulls.toLocaleString()}</strong></span>
      <span><small>보유 GEM</small><strong>{developerMode?'∞':game.gem.toLocaleString()} <em>{developerMode?'DEV':'GEM'}</em></strong></span>
    </div>
    <div className="lobby-section-title"><span className="eyebrow">CHOOSE YOUR DESTINY</span><h2>어디로 향할까요?</h2></div>
    <div className="lobby-tiles">
      {menu.map(item=><button className="lobby-tile" key={item.id} onClick={()=>onNavigate(item.id)}>
        <span className="lobby-tile-symbol" aria-hidden="true">{item.symbol}</span>
        <span className="lobby-tile-sub">{item.sub}</span>
        <strong>{item.title}</strong>
        <span className="lobby-tile-description">{item.description}</span>
        <span className="lobby-tile-link">입장하기 ›</span>
      </button>)}
      <div className="lobby-tile lobby-tile-locked" aria-label="덱 편성은 준비 중">
        <span className="lobby-tile-symbol" aria-hidden="true">♜</span>
        <span className="lobby-tile-sub">COMING SOON</span>
        <strong>덱 편성</strong>
        <span className="lobby-tile-description">내가 가진 카드로 25장 덱을 편성하는 기능은 추후 구현됩니다.</span>
        <span className="lobby-tile-link">준비 중</span>
      </div>
    </div>
    {developerMode&&<p className="dev-mode-note">💎 로컬 개발자 모드: 카드 뽑기 비용이 면제됩니다. 저장된 실제 GEM 수량은 변경되지 않습니다.</p>}
  </main>;
}

export default function App(){
  const [tab,setTab]=useState<AppTab>('lobby');
  const [game,setGame]=useState<GameSave>(loadSave);
  const [battle,setBattle]=useState<BattleState|null>(null);
  // This is a local development convenience, not an authenticated account role.
  // Production builds always use regular GEM costs.
  const developerMode=import.meta.env.DEV;
  useEffect(()=>{persistSave(game)},[game]);
  return <div className="app">
    <header className="topbar"><div className="topbar-inner">
      <div className="brand">
        <span className="brand-emblem" aria-hidden="true">✦</span>
        <div><span className="eyebrow">BREAK THE WALLS · ROLL THE DICE</span>
          <h1>BTWRD <span>CHRONICLES</span></h1>
          <div className="version">CARD COLLECTION · COMBAT ALPHA V0.3.2</div>
        </div>
      </div>
      <div className="gem-balance" aria-label={developerMode?'개발 모드: 무한 GEM 사용 가능':`보유 GEM ${game.gem.toLocaleString()}개`}>
        <span className="gem-spark" aria-hidden="true">💎</span>
        <div><small>{developerMode?'개발자 모드 · GEM 소모 없음':'보유 재화'}</small>
          <strong>{developerMode?'∞':game.gem.toLocaleString()} <em>GEM</em></strong>
        </div>
      </div>
    </div></header>
    <nav className="app-tabs" aria-label="메인 메뉴">
      {navItems.map(item=><button key={item.id} type="button"
        aria-current={tab===item.id?'page':undefined}
        className={tab===item.id?'active':''}
        onClick={()=>setTab(item.id)}>{item.label}</button>)}
    </nav>
    {tab==='lobby'?<Lobby game={game} developerMode={developerMode} onNavigate={setTab}/>:
     tab==='battle'?<main className="main-shell">
       <button className="start-battle" onClick={()=>setBattle(newBattle(cards))}>{battle?'새 전투':'전투 시작'}</button>
       {battle?<Battle battle={battle} setBattle={setBattle}/>:<div className="empty-result">
         <strong>전투를 시작하면 3전선 전투를 플레이할 수 있습니다.</strong>
         <p>현재 일부 카드 능력과 고급 규칙은 개발 중입니다.</p>
       </div>}
     </main>:
     <CollectionApp tab={tab} game={game} setGame={setGame} developerMode={developerMode}/>}
  </div>;
}
