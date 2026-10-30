# BTWRD: CHRONICLES — COMBAT ALPHA V0.4

**Branch:** `feature/combat-alpha-v04-rules`

A reversible, testable rules patch based on V0.3.3. **Not merged into main.** The 3D renderer, original 24 cards, gacha, card archive, developer GEM mode, and save key `btwrd_cardgame_v01` are preserved.

## Implemented in this patch

- **Directional taunt:** a side-lane taunt unit guards its own lane and center; a center-lane taunt guards its own lane and the left **or** right side chosen before summon. Shield Formation (`S002`) granting center taunt requires the same guard-side selection.
- **Target priority:** if an opposing unit occupies the attacking unit's own lane, it must be attacked first. If that lane is empty and adjacent guardian units protect it, the attacker chooses an eligible guardian instead of the wall. Otherwise it may attack the same-lane wall if that wall is active. No siege rule selected.
- **Targeted summon effects:** `U003` enemy unit damage 1, `U004` heal ally 2, `H001` heal ally 3, `H002` enemy unit damage 3, `M001` disable one enemy unit for the next own-turn readiness refresh. The user must click a legal target to resolve the queued trigger before other actions continue. `R003` heals friendly units by 1 on summon.
- `U006` draw 1, `H003` draw 2, and `R001` charge remain enabled. Empty-deck mandatory draws still lose.
- Added three per-player **magic slot state placeholders**, visible per lane in battle. Slots are initially empty. On an enemy wall collapse, that lane's installed magic slot (if any in a future test state) is sent to its owner's grave and closed.
- No card rebalancing or changes to gacha/collection storage.

## Important limitations

- **Magic slots are foundations only:** proper continuous/equipment installation, choosing arbitrary magic zones for equipment, chains and counterspells are **not** implemented. Existing five one-shot spell effects remain simplified testing rules.
- Not all original card abilities are implemented. Cards not listed above can still have unimplemented printed abilities. The game must not be used for serious card balance conclusions yet.
- `M001` disables its target for one upcoming personal-turn readiness refresh: **testing interpretation**, pending full timing review.
- Normal summon/attack are still simplified. `P-U20` exception (both sides protected), advanced equipment interaction, 3D production models, formal inheritance summon, and ??? synthesis are not implemented.
- **Siege A/B/C** remains undecided. No bypass siege was silently chosen.
- Original 24 cards remain in the catalog; battle uses a reproducible 25-card temporary test deck not connected to ownership.
- Automated verification covers unit tests and build but not a browser screenshot or real GPU hardware acceptance test.

## Developer laptop

```powershell
cd "$HOME\Desktop\성뿌크로니클"
git status
git fetch origin
git switch --track origin/feature/combat-alpha-v04-rules
npm install
npm run dev
```

If the branch exists locally, run `git switch feature/combat-alpha-v04-rules` then `git pull --ff-only origin feature/combat-alpha-v04-rules` instead.

## Suggested 5-minute play test

1. Enter lobby → **전투**, confirm 3D battlefield still renders and collection/gacha still show prior saved cards/GEM.
2. Summon `U002 철갑 방패병` in center; switch guard-side buttons to test whether left vs right lanes can attack their wall.
3. Summon `U003 왕국 궁수` when enemy units exist and select a glowing enemy target. Confirm 1 damage in log, and invalid targets do not consume another action.
4. Test `U004 왕국 사제` on a damaged ally, and `S002 방패 진형` granting center taunt.
5. Pass turns and confirm mana / card draw rules; check whether the player can recognize legal targets.
6. Share screenshots and unexpected behavior before broadening card effects.

## Verification

GitHub Actions `.github/workflows/combat-alpha-v04-checks.yml` runs `npm ci`, `npm run test` and `npm run build`. Do not merge to main until local visual and gameplay testing.
