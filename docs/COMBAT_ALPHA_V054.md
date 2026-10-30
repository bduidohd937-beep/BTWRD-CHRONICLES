# BTWRD: CHRONICLES — COMBAT ALPHA V0.5.4 · UX POLISH

Branch: `feature/combat-alpha-v054-ux-polish`
Base: `feature/combat-alpha-v053-flow-polish`
Original `main` and earlier feature branches remain untouched.

## Confirmed scope

The player requested simpler combat controls and improved readability after manually playing V0.5.3. This patch does not add VS AI (planned separately for V0.5.5) or finalize unfinished magic/3D design features.

### 1. Centered turn action bar
- Primary `턴 종료` action moved from the top toolbar to the **bottom center**, immediately above the floating hand fan and still over the Three.js arena. No duplicate top turn-end action.
- The bar displays a small actionable status: cards available, units still able to act, no actions left, targeting, retreat, discard, or combat over.
- Gold glow appears **only** when engine state has no playable cards or units with available actions; early end turn remains allowed.
- While a pending summon effect, retreat, hand discard or card confirmation exists, turn end is disabled. Discard selection and manual re-click remain unchanged.

### 2. Folding card inspector
- At rest, the left panel is a compact `✦ 카드 정보` tab.
- Hover or keyboard focus on cards/units expands a detailed preview; selecting a card also opens it.
- The user can explicitly pin/unpin the displayed card, or collapse it into the small tab.
- The existing symbol art and canonical card stats/effect text remain unchanged; lobby/collection are unaffected.

### 3. Combat record
- Full log is **closed by default** and opens using the top `전투 기록` button.
- Right-side drawer now explicitly uses flex/block layout, a fixed header, proper full-width Korean list rows, and an internally scrollable list. This overrides the old global `aside` grid layout that had squashed lines into single letters.
- Recent combat log feedback appears as a compact automatically disappearing toast. Attack/effect beam now disappears after 1.9 seconds.
- No log history is deleted by these presentation changes.

### 4. On-summon effect choice — V0.5.4 prototype rule
- All **currently implemented on-summon targeted triggers** default to **optional at the rules layer**, even when the printed card text is imperative. This is a user-authorized prototype rule; original printed card text is unchanged.
- When a trigger occurs, gameplay is paused, and a small banner offers **`✨ 효과 발동`** or **`넘기기`**. The affected enemy/ally becomes a selectable target only **after** clicking activate.
- After opting to activate, the user may still `발동 취소` before selecting a target.
- Skipping does not refund the already-paid summon cost; a trigger can be handled only once, and no illegal target can resolve before activation.
- If there is no eligible target, the engine does not create a pending decision.
- `PendingEffect.mandatory` is reserved for future individually explicit exceptions; no current card is flagged mandatory.
- Existing global/targeted basic spells remain in their earlier activation flow. Magic speeds/chains, continuous/equipment slots, and future mechanics are deferred.

### 5. Visibility and responsiveness
- The enlarged center summon-effect modal is replaced by a narrow horizontal effect strip with clear activation buttons.
- Center screen remains focused on the three-lane 3D battlefield. The floating hand, mana crystals, attack/defense stance colors and siege A free-breakthrough all remain.
- CSS is scoped to the battle scene and contains desktop/small-screen/short-viewport rules.

## Files updated/added
- `src/types.ts`, `src/engine.ts`
- `src/battle/BattleApp.tsx`, `src/battle/CombatCardInfo.tsx`
- `src/battle/CardInspectorPanel.tsx` (new)
- `src/battle/combatUx054.css` (new)
- `src/battle/battleScene.test.tsx`, `src/battle/effectPrompt.test.tsx`
- `src/optionalEffect.test.ts`, `src/rules-v04.test.ts`
- `src/App.tsx`, `src/battle/BattleScene.tsx` (version labels)
- `.github/workflows/combat-alpha-v054-checks.yml` (new)

## Automated validation
GitHub Actions workflow on the patch branch:
```powershell
npm ci
npm run test
npm run build
```

Tests cover the chosen effect flow, disable targeting until activation, skip/no refund, no-target case, optionality override, legacy taunt/retreat/free breakthrough, center turn button, card inspector preview/pin/fold, log drawer, card/gacha/save compatibility, and the existing UI/mana tests.

**Honest limitation:** GitHub CI verifies unit/UI logic and TypeScript production build, not the user's exact 3D GPU/browser layout at 1920×1080 or real playthrough. Visual alignment on the user's laptop still requires screenshots/acceptance.

## Local update instructions
Stop **only** the BTWRD CHRONICLES Vite server with Ctrl+C before switching branches.

```powershell
cd "$HOME\Desktop\성뿌크로니클"
git status
git fetch origin
git switch --track origin/feature/combat-alpha-v054-ux-polish
npm run dev
```

If branch exists locally, `git switch feature/combat-alpha-v054-ux-polish`, then `git pull --ff-only origin feature/combat-alpha-v054-ux-polish`. Only `npm ci` if dependencies need reinstalling, and ensure no Chronicles Vite process holds Rolldown's Windows native binary while reinstalling.

## Notebook acceptance checklist
1. Start a match: only tiny card-info tab at upper left; no duplicate top turn-end button.
2. Hover/focus a card: card details expand. Pin it, move cursor away, unpin and fold.
3. Click a cheap summon, click attack/defense; the card is summoned immediately.
4. Summon `왕국 궁수` when an eligible enemy unit exists: no target should glow until `효과 발동` is chosen. Choose `넘기기` instead in another match and confirm resources remain spent.
5. Resolve an effect and verify beam fades on its own. Verify latest action disappears while log remains retrievable.
6. Open log after several turns: Korean lines must flow normally across the panel width rather than one character per line. Check internal scrolling and close.
7. Verify the central turn button glows only when no legal actions remain; optional end-turn works earlier. Test >7 hand card discard and remnant wall free breakthrough.
8. Compare responsive screens; note whether the action bar obscures the hand and whether all card labels stay visible.

## Next
V0.5.5 — add VS AI as a separately testable opponent mode. Local two-player remains available, and both modes must use the same combat engine and validated state rules.
