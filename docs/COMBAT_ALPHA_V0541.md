# BTWRD: CHRONICLES — Combat Alpha V0.5.4.1

## Approved scope: right-center turn end + central communal field magic

Base: `feature/combat-alpha-v054-ux-polish`.
Branch: `feature/combat-alpha-v0541-field-layout`.
Main and other projects are untouched. User approved this incremental layout patch after reviewing their V0.5.4 gameplay recording. This is not the follow-up VS AI or 3D-art overhaul.

### Implemented

**Turn end UI**
- The **single** existing `턴 종료` button was moved from the lower-center action bar to the **right middle** of the same fullscreen battlefield.
- A small current-action status line is stacked under the button.
- Gold emphasis when all available actions are spent, early end turn, and disabled states for retreat, discard, and pending effects all use the unmodified existing state/control logic.
- Keeps floating cards and central lane visible; no new side panel or extra hand row.

**One shared global field magic slot**
- The formerly tiny far-right `공용 필드 존 준비 중` is now **one centered neutral slot** located on the front line and marked `공용 필드마법` / `빈 슬롯 · 준비 중`.
- Three.js also draws a static dormant gold/violet circular floor sigil at the origin, made of original procedural geometry. Both normal 3D rendering and the 2D background mode retain the DOM slot overlay.
- This neutral slot is intentionally **not clickable** or a legal target.
- Both players keep their **six total individual rear magic zones** (three per player, behind the unit zones). Their click/status/zone semantics are untouched.

**Responsive layout**
- The right-side turn control is anchored at the battlefield right midpoint at desktop, compact screens and short windows, independent of the floating hand fan.
- Compact central magic label is not an opaque blocking panel; the seal uses a translucent circular background and no pointer events.
- Attack targets, card overlays, hand and existing spell prompt remain unaffected.

### Not implemented; not claimed
- Playing field magic cards, replacement priority, ownership, target legality and persistent field magic effects.
- New cards, effects, altered battle rules, AI opponents or complex 3D unit models.
- Any modifications to collection/gacha/save data.

### Regression checks
`.github/workflows/combat-alpha-v0541-checks.yml` executes:
```powershell
npm ci
npm run test
npm run build
```

New `src/battle/fieldLayout0541.test.tsx` covers:
1. Exactly one turn-end button and right-center placement metadata; actual turn transitions.
2. Exactly one central shared magic slot, no extra action button, six personal rear magic zones and unchanged hand/units/walls.
3. Slot + right-side action preserved when switching 3D ↔ 2D.
4. Choosing a card does not make the dormant shared magic slot an illegal playable target.

**CI success is not a pixel-accuracy claim.** The notebook's real browser 3D/DOM positioning and pointer affordances still require manual inspection, particularly on low-height screens.

### Run locally
Stop the active **Chronicles** Vite terminal using Ctrl+C, without stopping other projects.

```powershell
cd "$HOME\Desktop\성뿌크로니클"
git status
git fetch origin
git switch --track origin/feature/combat-alpha-v0541-field-layout
npm run dev
```

If local branch already exists, use `git switch feature/combat-alpha-v0541-field-layout` and `git pull --ff-only origin feature/combat-alpha-v0541-field-layout` instead. Do not overwrite uncommitted work. Existing node_modules can be reused; `npm ci` is only needed when packages are missing.

### Manual acceptance
- At full-screen desktop resolution, the turn-end button should appear at the **right midpoint**, not lower center or upper right. It should not cover the right lane's unit/attack clicks.
- Right action status still updates after summons, effects, discard, and victory.
- The single neutral magic circle should be precisely at the **field center** on the three-lane separator line. It should display a readable empty/coming-soon status.
- Inspect at 3D ON and 2D; the center rune/status remain legible. The inactive slot should not react when selected.
- Verify hand fan, three rear magic slots for each side, three walls each, siege rule A, battle log and basic summons all still work.
- Take a screenshot at desktop full-screen before choosing future layout changes.

### Next
Confirm actual V0.5.4.1 on-device UI placement, then add **V0.5.5 rule-bound VS AI** in a separate branch. The AI must use the same engine and work through summon, attack, effect decisions, discard, retreat and victory in complete-match tests.
