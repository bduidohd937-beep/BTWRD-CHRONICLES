import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ChronicleCard, GameSave, Rarity, SummonResult, Tab } from "./types";
import { CARDS, CFG, RARITIES, rarityIndex, rarityOf } from "./data/cards";
import { collectionStats, defaultSave, loadSave, parseSave, persistSave, summonCards } from "./game/summon";
import CardArtwork from "./components/CardArtwork";
import CombatView from "./components/CombatView";
import "./App.css";

type CardStyle = CSSProperties & { "--rarity"?: string; "--order"?: number };
type Filter = "전체" | Rarity;

const rarityIcon: Record<Rarity, string> = {
  "일반": "◇", "희귀": "◆", "영웅": "✧", "전설": "✦",
  "신화": "✹", "초월": "✺", "???": "?",
};

function CardTile({ card, count, locked = false, first = false, delay = 0, animated = false, onClick }:
  { card: ChronicleCard; count?: number; locked?: boolean; first?: boolean; delay?: number; animated?: boolean; onClick?: () => void }) {
  const rarity = rarityOf(card.rarity);
  const topTier = rarityIndex(card.rarity) >= 3;
  const style: CardStyle = { "--rarity": rarity.color, "--order": delay };
  if (locked) {
    return (
      <div className="chronicle-card locked" style={{ "--rarity": "#5e5968" } as CardStyle} aria-label="아직 발견하지 못한 카드">
        <div className="card-head"><span>미발견</span><span>✦</span></div>
        <div className="card-illustration card-hidden">?</div>
        <div className="card-title">???</div>
        <div className="card-type">새로운 기록을 발견해 보세요</div>
        <span className="card-id">아직 만나지 못한 카드</span>
      </div>
    );
  }
  return (
    <button type="button" className={`chronicle-card ${animated ? "reveal" : ""} ${topTier ? "high-tier" : ""}`}
      style={style} onClick={onClick} aria-label={`${card.rarity} ${card.name} 상세 정보 보기`}>
      <div className="card-head">
        <span className="rarity-name">{rarityIcon[card.rarity]} {card.rarity}</span>
        <span className="card-cost">💧 {card.cost}</span>
      </div>
      {first && <span className="new-label">NEW</span>}
      <div className="card-illustration"><CardArtwork card={card} /></div>
      <div className="card-title">{card.name}</div>
      <div className="card-type"><span className="card-type-label">{card.type}</span> <span>NO. {card.id}</span></div>
      <p className="card-description">{card.text}</p>
      <div className="card-bottom">
        <span className="card-stats">{card.type === "유닛" ? `⚔ ${card.atk ?? 0}　♥ ${card.hp ?? 0}` : "✧ 마법 카드"}</span>
        {count && count > 1 && <span className="copy-count">×{count} 보유</span>}
      </div>
      {card.temp && <span className="temp-flag">임시 카드</span>}
    </button>
  );
}

function RatesTable() {
  return (
    <details className="rates-panel">
      <summary>🎲 소환 확률과 중복 환급 규칙 <span>자세히 보기</span></summary>
      <div className="rates-inner">
        <table>
          <thead><tr><th>등급</th><th>확률</th><th>카드 수</th><th>중복 환급</th></tr></thead>
          <tbody>
            {RARITIES.map(r => (
              <tr key={r.name}>
                <td style={{ color: r.color }}>{rarityIcon[r.name]} {r.name}</td>
                <td>{r.rate}%</td>
                <td>{CARDS.filter(card => card.rarity === r.name).length}장</td>
                <td>{r.refund.toLocaleString()} Gem</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>※ 소환 확률은 원작 영웅 소환 v2 검토값입니다. 환급량은 임시 밸런스 수치입니다.</p>
        <p>※ 10+1 소환의 마지막 1장은 <strong>영웅 등급 이상 확정</strong>(제안 규칙). ??? 등급은 일반 소환에 등장하지 않습니다.</p>
      </div>
    </details>
  );
}

function App() {
  const [game, setGame] = useState<GameSave>(loadSave);
  const [tab, setTab] = useState<Tab>("summon");
  const [results, setResults] = useState<SummonResult[]>([]);
  const [message, setMessage] = useState("");
  const [openCard, setOpenCard] = useState<ChronicleCard | null>(null);
  const [filter, setFilter] = useState<Filter>("전체");
  const [search, setSearch] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [sort, setSort] = useState<"owned" | "rarity" | "copies">("owned");
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const stats = collectionStats(game);

  useEffect(() => { persistSave(game); }, [game]);
  useEffect(() => {
    if (!openCard) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenCard(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openCard]);

  const summon = (count: number, price: number) => {
    const outcome = summonCards(game, count, price);
    if (!outcome) { setMessage("💎 Gem이 부족합니다."); return; }
    setGame(outcome.next);
    setResults(outcome.results);
    setMessage(outcome.refund > 0
      ? `중복 환급 +${outcome.refund.toLocaleString()} Gem`
      : outcome.results.some(x => x.first) ? "새로운 카드가 도감에 등록되었습니다!" : "소환 완료!");
  };

  const ownedCount = (card: ChronicleCard) => game.own[card.id] ?? 0;
  const sorted = [...CARDS].sort((a,b) => {
    const diff = sort === "owned"
      ? Number(ownedCount(b) > 0) - Number(ownedCount(a) > 0)
      : sort === "copies" ? ownedCount(b) - ownedCount(a) : 0;
    return diff || rarityIndex(b.rarity) - rarityIndex(a.rarity) || a.id.localeCompare(b.id);
  });
  const visible = sorted.filter(card =>
    (filter === "전체" || filter === card.rarity) &&
    (!ownedOnly || ownedCount(card) > 0) &&
    (search.trim() === "" || (
      ownedCount(card) > 0 &&
      (card.name + " " + card.id + " " + card.type).toLowerCase().includes(search.trim().toLowerCase())
    ))
  );
  const collectionRate = Math.round(stats.owned / stats.total * 100);
  const remaining = stats.total - stats.owned;

  const copySave = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(game, null, 2));
      setImportStatus("현재 저장 데이터가 클립보드에 복사되었습니다.");
    } catch { setImportStatus("브라우저 복사가 차단되었습니다. 개발자 도구에서 localStorage를 확인해 주세요."); }
  };

  const importSave = () => {
    try {
      const parsed = parseSave(JSON.parse(importText));
      if (!parsed) { setImportStatus("❌ 저장 데이터 형식이 올바르지 않습니다."); return; }
      if (!window.confirm("가져온 데이터로 현재 소환 기록과 Gem을 덮어쓸까요?")) return;
      setGame(parsed);
      setResults([]);
      setMessage("");
      setOpenCard(null);
      setImportText("");
      setImportStatus("✅ V0.1 저장 데이터 가져오기 완료!");
    } catch { setImportStatus("❌ JSON 내용을 확인해 주세요."); }
  };

  const reset = () => {
    if (!window.confirm("정말 모든 Gem, 소환 기록, 도감을 초기화할까요?")) return;
    setGame(defaultSave());
    setResults([]);
    setMessage("");
    setOpenCard(null);
    setResetOpen(false);
    setImportStatus("데이터가 초기화되었습니다.");
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-emblem" aria-hidden="true">✦</span>
            <div><span className="eyebrow">BREAK THE WALLS · ROLL THE DICE</span>
              <h1>BTWRD <span>CHRONICLES</span></h1>
              <div className="version">CARD COLLECTION · V0.2 REACT FOUNDATION</div>
            </div>
          </div>
          <div className="gem-balance" aria-label={`보유 Gem ${game.gem.toLocaleString()}개`}>
            <span className="gem-spark" aria-hidden="true">💎</span>
            <div><small>보유 재화</small><strong>{game.gem.toLocaleString()} <em>GEM</em></strong></div>
          </div>
        </div>
      </header>

      <main className="main-shell">
        <div className="menu-tabs" role="tablist" aria-label="메뉴">
          <button role="tab" aria-selected={tab === "summon"} className={tab === "summon" ? "selected" : ""}
            onClick={() => setTab("summon")}>✧ 카드 소환</button>
          <button role="tab" aria-selected={tab === "collection"} className={tab === "collection" ? "selected" : ""}
            onClick={() => setTab("collection")}>▣ 카드 도감 <span className="tab-counter">{stats.owned}/{stats.total}</span></button>
          <button role="tab" aria-selected={tab === "combat"} className={tab === "combat" ? "selected" : ""}
            onClick={() => setTab("combat")}>⚔ 기본 전투</button>
        </div>

        {tab === "combat" ? <CombatView /> : tab === "summon" ? (
          <section className="summon-view" role="tabpanel">
            <div className="summon-hero">
              <div className="summon-hero-left">
                <span className="eyebrow">THE SUMMONING CHAMBER</span>
                <h2>영웅의 운명을 소환하라</h2>
                <p>왕국의 전설, 신화와 초월의 존재까지. 새로운 이야기는 한 장의 카드에서 시작된다.</p>
                <div className="summon-actions">
                  <button className="summon-button secondary" disabled={game.gem < CFG.single}
                    onClick={() => summon(1, CFG.single)}>
                    <span>1회 소환</span><strong>💎 {CFG.single} Gem</strong>
                  </button>
                  <button className="summon-button primary" disabled={game.gem < CFG.multi}
                    onClick={() => summon(CFG.multiCount, CFG.multi)}>
                    <span>10+1 연속 소환 <b>+1 BONUS</b></span><strong>💎 {CFG.multi.toLocaleString()} Gem</strong>
                  </button>
                </div>
                <p className="summon-guarantee">✦ 10+1의 마지막 1장은 영웅 등급 이상 확정 (검토용 규칙)</p>
              </div>
              <div className="summon-orb" aria-hidden="true"><div className="orb-rings"><span>✦</span></div></div>
            </div>

            <div className="section-heading">
              <div><span className="eyebrow">SUMMON RESULT</span><h2>소환 결과</h2></div>
              {results.length > 0 && <span className="results-count">{results.length}장 획득</span>}
            </div>
            {message && <div className="message" role="status">{message}</div>}
            {results.length ? (
              <div className="cards-grid results-grid" key={game.pulls}>
                {results.map((result, index) =>
                  <CardTile key={index} card={result.card} first={result.first} animated delay={index}
                    count={game.own[result.card.id]} onClick={() => setOpenCard(result.card)} />)}
              </div>
            ) : (
              <div className="empty-result">
                <div className="empty-icon">✧</div>
                <strong>아직 소환한 카드가 없습니다</strong>
                <p>소환 버튼을 눌러 새로운 영웅의 이야기를 발견해 보세요.</p>
              </div>
            )}
            <RatesTable />
          </section>
        ) : (
          <section role="tabpanel">
            <div className="collection-summary">
              <div className="collection-intro">
                <span className="eyebrow">THE HERO ARCHIVE</span>
                <h2>영웅 도감 <span className="collection-percentage">{collectionRate}% 달성</span></h2>
                <p>당신이 만난 영웅과 마법의 기록. 카드를 누르면 상세 정보를 볼 수 있어요.</p>
              </div>
              <div className="collection-stats">
                <span><strong>{stats.owned}<small> / {stats.total}</small></strong>수집 카드</span>
                <span><strong>{game.pulls.toLocaleString()}</strong>누적 소환</span>
                <span><strong>{stats.duplicates.toLocaleString()}</strong>중복 카드</span>
              </div>
            </div>
            <div className="collection-progress-row">
              <span>📜 도감 완성도</span>
              <span>{remaining === 0 ? "모든 카드를 수집했어요!" : `남은 카드 ${remaining}장`}</span>
            </div>
            <div className="collection-progress" role="progressbar" aria-valuenow={stats.owned} aria-valuemin={0}
              aria-valuemax={stats.total} aria-label="도감 수집 진행도">
              <span style={{ width: `${stats.owned / stats.total * 100}%` }} />
            </div>
            <div className="archive-toolbar">
              <div className="rarity-chips" role="group" aria-label="카드 등급별 필터">
                <button type="button" aria-pressed={filter === "전체"} className={filter === "전체" ? "active" : ""}
                  onClick={() => setFilter("전체")}>전체 <small>{stats.owned}/{stats.total}</small></button>
                {RARITIES.filter(r => r.rate > 0).map(r => {
                  const available = CARDS.filter(card => card.rarity === r.name).length;
                  const acquired = CARDS.filter(card => card.rarity === r.name && ownedCount(card) > 0).length;
                  return <button type="button" key={r.name} aria-pressed={filter === r.name}
                    className={filter === r.name ? "active" : ""}
                    style={{ "--chip": r.color } as CSSProperties} onClick={() => setFilter(r.name)}>
                    <span>{rarityIcon[r.name]} {r.name}</span><small>{acquired}/{available}</small>
                  </button>;
                })}
              </div>
              <div className="collection-tools">
                <div className="search-wrap">
                  <span aria-hidden="true">⌕</span>
                  <input type="search" placeholder="보유한 카드 검색" aria-label="보유한 카드 이름 또는 ID 검색"
                    value={search} onChange={e => setSearch(e.target.value)} />
                  {search && <button type="button" aria-label="검색어 지우기"
                    onClick={() => setSearch("")}>✕</button>}
                </div>
                <select aria-label="카드 정렬 방식" value={sort}
                  onChange={e => setSort(e.target.value as "owned" | "rarity" | "copies")}>
                  <option value="owned">보유 카드 우선</option>
                  <option value="rarity">희귀도 높은 순</option>
                  <option value="copies">보유 수량 순</option>
                </select>
                <label className="owned-toggle"><input type="checkbox" checked={ownedOnly}
                  onChange={e => setOwnedOnly(e.target.checked)} /> 보유 카드만</label>
              </div>
              <div className="archive-result-row">
                <span><strong>{visible.length}장</strong> 표시 중</span>
                <span>✨ 카드 전체를 눌러 상세 정보 확인</span>
              </div>
            </div>
            <div className="cards-grid archive-grid">
              {visible.map((card, index) => {
                const count = game.own[card.id] ?? 0;
                return count > 0
                  ? <CardTile key={card.id} card={card} count={count} delay={index} onClick={() => setOpenCard(card)} />
                  : <CardTile key={card.id} card={card} locked />;
              })}
            </div>
            {visible.length === 0 && <div className="empty-result archive-empty">
              <div className="empty-icon">⌕</div>
              <strong>조건에 맞는 카드가 없어요.</strong>
              <p>검색어 또는 등급 필터를 변경해 보세요.</p>
              <button className="secondary-action" onClick={() => { setSearch(""); setFilter("전체"); setOwnedOnly(false); }}>
                필터 초기화
              </button>
            </div>}
          </section>
        )}

        <details className="data-manager" open={resetOpen} onToggle={e => setResetOpen(e.currentTarget.open)}>
          <summary>⚙️ 저장 데이터 관리 <span>기존 HTML 버전 기록 옮기기 · 백업 · 초기화</span></summary>
          <div className="data-body">
            <p>게임 기록은 브라우저에 저장됩니다. 원본 HTML을 <code>file://</code>로 실행했다면, <code>localhost</code>에서는 저장 영역이 달라 <strong>수동으로 가져와야 합니다.</strong></p>
            <div className="transfer-guide">
              <strong>기존 V0.1 저장 데이터 옮기는 방법</strong>
              <p>① 예전 <code>index.html</code> 화면으로 이동 → F12 → Console 탭</p>
              <p>② 아래 명령 실행 후 나온 JSON 문자열을 복사하세요.</p>
              <pre>localStorage.getItem('btwrd_cardgame_v01')</pre>
              <p>③ 이 화면의 입력창에 붙여넣고 <strong>가져오기</strong>를 누르세요.</p>
            </div>
            <textarea rows={4} aria-label="이전 저장 데이터 JSON" value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder='{"gem":5000,"own":{},"pulls":0}' />
            <div className="data-actions">
              <button className="secondary-action" disabled={!importText.trim()} onClick={importSave}>📥 저장 데이터 가져오기</button>
              <button className="secondary-action" onClick={() => void copySave()}>📋 현재 기록 복사</button>
              <button className="danger-action" onClick={reset}>🗑️ 모든 진행 초기화</button>
            </div>
            {importStatus && <p className="import-status" role="status">{importStatus}</p>}
            <p className="muted">저장 키: <code>{CFG.saveKey}</code> · 가져오면 현재 데이터가 교체됩니다.</p>
          </div>
        </details>
        <footer>BTWRD: CHRONICLES · 원작 V0.1 데이터 유지 · 추가 카드와 전투 시스템은 아직 미구현</footer>
      </main>

      {openCard && (
        <div className="modal-backdrop" role="presentation" onMouseDown={e => {
          if (e.target === e.currentTarget) setOpenCard(null);
        }}>
          <div className="modal-content" role="dialog" aria-modal="true" aria-label={`${openCard.name} 상세 정보`}>
            <div className="modal-top"><span>📜 카드 상세 정보</span>
              <button ref={closeButton} type="button" aria-label="닫기" onClick={() => setOpenCard(null)}>✕</button></div>
            <CardTile card={openCard} count={game.own[openCard.id]} />
            <div className="modal-bottom">
              <span>카드 코드 <strong>{openCard.id}</strong></span>
              <span>{openCard.temp ? "설정 검토 중인 임시 카드" : "기획서 샘플 카드 · 능력치 임시"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
