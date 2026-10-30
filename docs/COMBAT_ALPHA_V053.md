# BTWRD CHRONICLES — COMBAT ALPHA V0.5.3
## Streamlined combat UX · user-approved incremental patch

Source: `feature/combat-alpha-v052-free-breakthrough`. New working branch:
`feature/combat-alpha-v053-flow-polish`. Do not alter `main`.

### Scope and actual work

1. **One-click stance summons**: hand card → legal allied lane → **attack** or **defense**. Clicking the stance completes a normal summon immediately; there is no separate “소환 확정” step. Until a stance has been clicked, no mana or card is spent. Cancellation remains possible.
2. **Center taunt exception**: choose stance first, then the left/right adjacent side to protect. This necessary second choice immediately completes the summon. For center-lane `S002` spells, keep the existing spell confirmation plus guard-direction choice.
3. **Spell behavior**: existing targeted/global spell confirmation is deliberately kept; pending 3-speed chains/installed spells remain unimplemented.
4. **Summon effect prompt**: large source-card banner, printed card text, mandatory-vs-optional status, target instruction, number of eligible target lanes and highlighted targets. Original data `U003`, `U004`, `H001`, `H002`, `M001` stays mandatory as printed. Only text actually granting choice (e.g. `줄 수 있다`) allows **효과 사용 안 함**. Skipping such a choice is enforced in the engine and does not refund summon resources.
5. **Turn-end guidance**: turn-end button glows only if no playable hand card and no unit with an available action remain. The banner explains why. Turn-end is disabled while another effect, retreat, confirmation or discard operation is pending. Existing player-selected hand discard and turn mechanics remain unchanged.
6. **Readable card inspector and mana**: the root `styles.css` contains a generic `aside` grid rule which squeezed battle cards and the mana panel. New battle-only CSS resets these panels; detail artwork and stats sit side-by-side with full-width effect text. Numeric mana stays on one line; crystals size to the current mana capacity, including 10.
7. **Hand position**: the fan remains a floating overlay on the 3D board; it is lifted higher and resized so card name/stats are less likely to be hidden by the browser/Windows taskbar. No separate hand row was added.
8. **Version label**: updated battle/lobby header to V0.5.3.

### Preserved

- Approved siege A free breakthrough / wall priority / taunt / emergency retreat / 3-wall victory.
- The 24 original cards and printed effect texts, the current engine's action legality and save format, card archive, gacha and local dev unlimited GEM.
- Original 3D temporary castles and figurines, lobby separation and in-progress match resume.

### Automated verification

GitHub Actions workflow:
`.github/workflows/combat-alpha-v053-checks.yml`

It runs from the repo root:

```powershell
npm ci
npm run test
npm run build
```

Test suite covers quick attack/defense summons, no mana spent on cancel, center taunt guard selection, legal target spell confirmation, optional/mandatory effect gating, real highlighted target, decision to skip, turn-end readiness, floating hand and variable mana pip count, plus all earlier combat engine and archive/save checks.

**Actual tests and production build passed in CI.** CI does not assert pixel-accurate layout on the user's monitor, GPU/browser frame rates or complete real-game playthrough; screenshots are needed for visual acceptance.

### Local usage

```powershell
cd "$HOME\Desktop\성뿌크로니클"
git status
git fetch origin
git switch --track origin/feature/combat-alpha-v053-flow-polish
npm run dev
```

If branch exists already, `git switch feature/combat-alpha-v053-flow-polish` and `git pull --ff-only origin feature/combat-alpha-v053-flow-polish`. Use `npm ci` only if dependencies are missing, and stop only the Chronicles Vite process before reinstalling to avoid the prior Windows Rolldown `EPERM` lock.

### Manual play-test guide

- Ordinary unit summon: click card → click empty lane → click **공격 표시**. Check dialog closes, mana deducted once and unit is red. Repeat for blue `수비 표시`.
- Center taunt `철갑 방패병`: choose attack/defense, then left/right direction to finish; no separate confirmation.
- `왕국 궁수`: once opponent has a target unit, summon and inspect large required-effect prompt; click glowing enemy to resolve. No skip on the mandatory original text.
- Turn end: spend mana and unit actions, then verify the top-right button glows when no legal actions remain. Discard when 8+ hand cards before ending.
- Reach 7–10 maximum mana and verify `7 / 7` etc stay on one line.
- Hover a card with long text to inspect a full-width effect description.
- See all hand card labels inside the battlefield without adding a footer.

### Next version

`V0.5.4`: prototype rule-bound **VS AI** that uses the same engine, with an explicit AI/local-2P mode selection and complete-turn tests. Do not assume that AI is already implemented by this UX patch.
