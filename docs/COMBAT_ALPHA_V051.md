# BTWRD: CHRONICLES — COMBAT ALPHA V0.5.1

> Design direction: user-approved cinematic fantasy battle concept screenshot, **without copying Yu-Gi-Oh artwork or interface assets**. This patch is an original implementation on top of the existing Three.js procedural board.

Branch: `feature/combat-alpha-v051-combat-ux`, based on `feature/combat-alpha-v050-field-overlay`. No merge to `main`.

## Changes actually implemented

- **Top-left card inspector:** real existing 24-card names/rarity/cost/ATK/HP and printed effect text from `foundationCards`; uses the existing original heraldic symbol artwork. Displays the current battle unit's HP and stance when available. Hover/keyboard focus on hand cards and field units works even if the hand card is unaffordable.
- **Readable mana:** blue mana-crystal pips, numeric current/max mana, amber estimated spending crystals and projected remaining mana for the chosen card. Mana is not consumed merely for selecting a card, target, or stance.
- **Deliberate summon sequence:** select hand card → select empty allied unit slot → modal forces `공격 표시` or `수비 표시` → confirm or cancel. No default preselected stance. Center-lane taunt also requires explicit left/right guard choice. Cancel preserves the hand and mana.
- **Spell activation flow:** supported global spells get an activation confirmation. Supported targeted spells select a legal allied target first, then show a confirmation with mana and printed effect. Full speed/chain handling **remains unsupported**.
- **Summon effects:** when the battle engine supplies `pendingEffect`, block subsequent actions and display the source card and a target-selection prompt. After selecting a target the UI shows a short causal connection and effect/damage text. Basic attacks and casts also show source/target feedback.
- **Attack vs defense display:** field cards have a subtle red attack background or blue defense background. Three.js markers have red or blue stance-colored rings.
- **De-overlap:** 3D troop markers are shifted from the card slots toward the center line. Cards stay fixed in their own unit slots behind the figures; their visual states come from the same battle engine.
- **Still a full-field design:** curved hand floats over the bottom center of the battlefield; mana and card detail are overlays, without restoring the split tactical sidebar or separate hand row.

## Not changed

- Original 24-card set, card text, gacha animations, archive/collection styles, save key `btwrd_cardgame_v01` and developer-mode infinite GEM.
- Existing combat engine rules, three walls, lane targeting/taunt, deck draws, hand size/retreat and winner condition.
- All **unconfirmed** advanced siege, fusion/inheritance summon and magic-chain/installed-spell details remain undecided.

## Validation

The GitHub Actions workflow `.github/workflows/combat-alpha-v051-checks.yml` runs:

```powershell
npm ci
npm run test
npm run build
```

Additional scene tests check card-inspector content, artwork display, required stance confirmation, cancel not spending mana, attack/defense indicators, center guard direction selection, and targeted spell activation/mana deduction. Previous engine and collection regression tests remain.

**Not verified by CI:** pixel-perfect 3D model alignment, GPU performance, actual browser rendering at the user's monitor resolution, card artwork fidelity to the approved cinematic reference image, and real full game playthrough. 3D castles and figurines are still geometric prototypes, not production GLB models.

## Run in the existing notebook repository

```powershell
cd "$HOME\Desktop\성뿌크로니클"
git status
git fetch origin
git switch --track origin/feature/combat-alpha-v051-combat-ux
npm ci
npm run dev
```

If the new branch already exists locally, run `git switch feature/combat-alpha-v051-combat-ux` and `git pull --ff-only origin feature/combat-alpha-v051-combat-ux` instead.

If `npm ci` encounters `EPERM` for Rolldown, identify and stop only the running **BTWRD CHRONICLES** Vite process before retrying, not the Codex or other game-development processes.

## Suggested local play test

1. Open the battle scene and inspect a card by hovering/focusing it. Confirm inspector uses actual card text/art.
2. Select `왕국 병사`, choose an empty own lane, cancel the summon. Verify mana stays unchanged.
3. Repeat, choose attack, confirm. Verify subtle red card outline; restart and choose defense to verify blue.
4. Select `철갑 방패병`, center lane, choose stance AND guard direction before summon.
5. Pass two turns to reach 3 mana, summon a unit and use `치유의 빛` on an allied unit; verify the target confirmation and mana change.
6. Cause a unit attack and inspect effect narration/line. Compare figurine/card overlap at 1366x768 and 1920x1080.
7. Check lobby, gacha, collection and developer GEM still work.

## Next

Review a new V0.5.1 screenshot of an attack-stance unit, a defense-stance unit and an opened left detail panel. Tune visual positions first; production-quality creature models and particles remain a later art upgrade.
