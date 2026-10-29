# BTWRD: CHRONICLES — React Foundation V0.2

Original standalone `../index.html` is preserved **unchanged**.
This `web/` folder is a new React + Vite + TypeScript implementation.

## 실행

```powershell
cd web
npm install
npm run dev
```

Open the URL printed by Vite (typically http://localhost:5173).

## 기능

- V0.1 원본 카드 **24종**, 등급 **일반/희귀/영웅/전설/신화/초월** + 미등장 ???
- 보유 Gem 5,000 시작 / 1회 100 / 10+1회 1,000 / 마지막 1장 영웅 이상
- V0.1 소환 등급 확률, 카드별 중복 환급, 도감, 잠금 카드, 상세 카드 보기
- 컬렉션 검색/등급 필터/보유 필터
- 브라우저 자동 저장, JSON 복사·가져오기, 초기화
- **전투 시스템은 이번 마이그레이션 범위에 포함하지 않음.**

### 기존 저장 이전

`localStorage`는 origin마다 분리됩니다. 예전 `file:///...` HTML에서 기록한 데이터는 React 개발 서버 `http://localhost:5173`에 자동으로 나타나지 않습니다.

1. 구 버전 `index.html` 파일을 브라우저로 엽니다.
2. 개발자 도구(F12) → Console에서 `localStorage.getItem('btwrd_cardgame_v01')` 실행.
3. 반환된 JSON 문자열을 복사.
4. 새 React 게임 하단의 '저장 데이터 관리'에 붙여넣고 '가져오기' 클릭.

수동 이전 시 현재 새 버전의 데이터는 덮어쓰므로, 필요하면 먼저 복사해 두세요.

## 빌드

```powershell
npm run build
```

현재 확률 및 중복 환급·임시 카드 스탯은 검토값입니다. 확정 밸런스로 간주하지 마세요.
