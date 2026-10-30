# BTWRD: CHRONICLES — Combat Alpha V0.5.2

## Adopted rule: Siege A · Free Breakthrough

**Approved by the user on 2026-10-30.** This is a formal choice of A instead of previously discussed B/C. A does **not** apply attack damage reductions or extra mana costs for attacking a remaining wall from a lane whose opposite wall has collapsed.

### Engine interpretation and priority

- The existing one-action-per-unit, attack readiness, stance and target validation remain unchanged.
- When the target's wall **opposite the attacker's lane still stands**, only that same-lane wall is an available wall target (after the same-lane unit and taunt checks).
- Once the **opposite enemy wall is already destroyed**, the attacking unit may choose **any remaining enemy wall** (left, middle, right; adjacent and nonadjacent alike).
- A standing enemy unit still blocks **its own wall**. To fight through that wall, attack its defender first. A taunt unit protecting a given destination wall also intercepts attacks on that wall.
- If the attacker has an opposing unit in its current lane, or a taunt directly protecting that lane, the original priority is preserved before breakthrough.
- An exposed wall can still be attacked even if a different destination wall is guarded. No surviving wall is bypassable through its own defenders.
- A unit still receives **only one attack**. Breakthrough is not an extra attack; neither the mana cost nor the attack strength changes.
- The winner is the first player to destroy **all three enemy walls**. Attacks after victory remain blocked.
- **Different rule:** when an *own* wall falls, existing emergency retreat to a free active allied lane remains, with the option to move to the grave if required. No forced action loss was introduced.

### Code change

- `src/engine.ts`: `legalAttackTargets` adds optional `wallLanes` only when siege A opens multiple destinations, preserving the previous `wallLane` interface for standard attacks. `attackUnit` enforces the same engine-level legality and applies full damage/mana unchanged.
- `src/battle/BattlefieldOverlay.tsx`: highlights *all* legal additional enemy walls and allows the corresponding click, with a small breakthrough marker and an accessible description.
- `src/battle/BattleApp.tsx`: on select, advises that further active walls may be attacked; on attack, displays the source/destination lane and the zero-penalty result.
- `src/battle/combatUx.css`: visual breakthrough accent without changing the main UI structure.
- No changes to `src/types.ts`, installed magic or chain rules, Three.js production models, original 24 cards, gacha, card collection, saved GEM or save format.

### Regression coverage

Added `src/freeBreakthrough.test.ts` with **11 engine scenarios** including ordinary same-lane attack, both available destinations, nonadjacent wall, full damage/no mana penalty, defender and taunt priority, player B symmetry, victory, exhausted/defense unit, emergency retreat and invalid zero-HP targets.

Added `src/battle/freeBreakthrough.ui.test.tsx` with **2 UI scenarios** covering wall highlights and clicks, and preventing bypass of a unit guarding a destination wall.

CI workflow: `.github/workflows/combat-alpha-v052-checks.yml`.

```powershell
npm ci
npm run test
npm run build
```

**CI verification only.** The production build and unit/UI tests do not validate a complete manual combat playthrough or actual GPU rendering on the user's notebook.

### Local notebook

```powershell
cd "$HOME\Desktop\성뿌크로니클"
git status
git fetch origin
git switch --track origin/feature/combat-alpha-v052-free-breakthrough
npm ci
npm run dev
```

If already on this branch: `git switch feature/combat-alpha-v052-free-breakthrough` and `git pull --ff-only origin feature/combat-alpha-v052-free-breakthrough`. Stop a previously running **Chronicles** Vite server before using `npm ci`; leave other project runtimes untouched.

### Manual check

1. In a live combat session, destroy the opponent's left wall.
2. Select a ready attack-stance unit in the left lane.
3. The center and right **intact, unguarded** enemy wall HP buttons should glow.
4. Click the far-right wall. Verify exactly its HP decreases by the unit's full ATK, own mana remains unchanged, the unit exhausts normally, and the log says **자유 돌파**.
5. Put an enemy unit in the center lane or a taunt guarding center. The center wall should stop being clickable, while an unguarded right wall stays valid.
6. Verify retreat when *own* wall is destroyed, followed by normal actions in an active lane.

### Still pending

Card-detail window readability, 7+ mana meter layout, some hand cards clipping, more advanced 3D and spell-chain effects. These are **out of scope** for this isolated rules patch, for user approval in a later UI/visual patch.
