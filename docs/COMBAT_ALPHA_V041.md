# BTWRD: CHRONICLES — COMBAT ALPHA V0.4.1

## Goal

Separate the battle experience from the collection/gacha layout. Keep the **3D battlefield visible and unobstructed**, with tactical controls in a separate panel and hand cards docked at the bottom.

This patch changes **battle UI and navigation**, not the rules engine or card data.

## Changes

- Battle launches as a **dedicated viewport-sized game scene**, without the original collection app header, nav, or constrained `main-shell`.
- Top bar includes **로비로** and **새 전투**. Both require confirmation. Leaving for lobby **preserves the in-memory match** and the lobby's **전투 이어하기** button resumes the same state; restarting resets only the match.
- The 3D stage and clickable tactical controls are **side-by-side on desktops**, not stacked over the same castles. Players B/A remain fixed to their original positions in the tactics sidebar.
- Mana/round/turn controls remain in a compact HUD. The player's hand stays **docked at the bottom of the battle scene**, with horizontal card scrolling when necessary.
- Combat logs and implemented/unimplemented rules move to an optional drawer, so the game board isn't pushed down.
- Smaller windows can scroll *inside the battle scene* instead of clipping actionable cards; reduced-motion support and keyboard-focus styles remain.
- Existing 24-card definitions, original card artwork/gacha/archive styles, local save format `btwrd_cardgame_v01`, developer free-gem convenience, and 3D models are unchanged.

## Verification

Run from repository root:

```powershell
npm ci
npm run test
npm run build
npm run dev
```

The `.github/workflows/combat-alpha-v041-checks.yml` workflow validates the independent scene, existing rules and production build. Scene integration tests check:
- Collection header/nav disappears in battle and 3D + hand remain.
- Leaving requires confirmation; returning resumes the prior round without resetting.
- Restarting requires confirmation and resets the round when approved.
- Combat log opens/closes without occupying the board's normal flow.

**Important:** CI does not run a real GPU/browser visual acceptance test. The local 3D composition, card readability and fit at 1366×768 / 1920×1080 need the user's screenshot and play-test feedback before approval/merge.

## Local update (single notebook folder)

```powershell
cd "$HOME\Desktop\성뿌크로니클"
git status
git fetch origin
git switch --track origin/feature/combat-alpha-v041-battle-scene
npm ci
npm run dev
```

If the branch already exists locally, use `git switch feature/combat-alpha-v041-battle-scene` and `git pull --ff-only origin feature/combat-alpha-v041-battle-scene`. Never discard local uncommitted changes.

## Pending features

- Full chain/quick/counter spell windows, installed and equipment spells, inheritance and synthesis summons, all card effects, decided siege method, production GLB artwork and audio remain deferred.
- This is a presentation patch; **no previously undecided rules are ratified**.
- Combat still runs a separate fixed 25-card test deck rather than a collection-derived deck.

## Next

Review one screenshot of a full combat screen (including hand) and one mid-battle sequence. If the scene layout is usable, proceed to V0.5 with rule priorities and formal magic slots.
