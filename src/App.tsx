import {useEffect,useState} from 'react';
import {CollectionApp} from './foundation/CollectionApp';
import {CARDS as cards} from './foundation/foundationCards';
import {collectionStats,loadSave,persistSave} from './foundation/summon';
import type {GameSave,Tab} from './foundation/foundationTypes';
import {newBattle} from './engine';
import type {BattleState} from './types';
import BattleScene from './battle/BattleScene';
import './styles.css';

type AppTab = 'lobby' | 'battle' | Tab;

const navItems: {id:AppTab;label:string}[] = [
  {id:'lobby',label:'⌂ 메인 로비'},
  {id:'battle',label:'⚔ 전투'},
  {id:'summon',label:'✧ 카드 뽑기'},
  {id:'collection',label:'▣ 카드 도감'},
];

function Lobby({game,developerMode,hasBattle,onNavigate}:{
  game:GameSave;
  developerMode:boolean;
  hasBattle:boolean;
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
        <button className="lobby-main-action" onClick={()=>onNavigate('battle')}>{hasBattle?'⚔ 전투 이어하기':'⚔ 전투 시작'}</button>
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
  const navigate=(next:AppTab)=>{
    if(next==='battle')setBattle(current=>current??newBattle(cards));
    setTab(next);
  };
  // The match lives outside the collection page shell and survives lobby navigation.
  if(tab==='battle'&&battle)return <BattleScene battle={battle}
    setBattle={setBattle} onExit={()=>navigate('lobby')}
    onNewBattle={()=>setBattle(newBattle(cards))}/>;
  return <div className="app">
    <header className="topbar"><div className="topbar-inner">
      <div className="brand">
        <span className="brand-emblem" aria-hidden="true">✦</span>
        <div><span className="eyebrow">BREAK THE WALLS · ROLL THE DICE</span>
          <h1>BTWRD <span>CHRONICLES</span></h1>
          <div className="version">CARD COLLECTION · 3D COMBAT ALPHA V0.5.0</div>
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
        onClick={()=>navigate(item.id)}>{item.label}</button>)}
    </nav>
    {tab==='lobby'?<Lobby game={game} developerMode={developerMode} hasBattle={!!battle} onNavigate={navigate}/>:
     tab==='battle'?<div className="main-shell"><button onClick={()=>navigate('battle')}>전투 불러오기</button></div>:
     <CollectionApp tab={tab} game={game} setGame={setGame} developerMode={developerMode}/>}
  </div>;
}
