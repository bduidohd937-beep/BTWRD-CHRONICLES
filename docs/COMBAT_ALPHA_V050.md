# BTWRD CHRONICLES — COMBAT ALPHA V0.5.0 · FULL FIELD OVERLAY

Branch: `feature/combat-alpha-v050-field-overlay` (based on V0.4.1; main untouched).

## Goal

Use the **entire visible battlefield as the game surface**. The hand of cards must **float directly over the lower-center battlefield**, not take a separate row or any reserved layout height. Keep a 3D tabletop card battler feel without copying copyrighted artwork or game UI assets from the reference.

## Actual changes

- Replaced the old left tactics sidebar / right 3D viewport with a **single full-window Three.js field**. Removed the separate hand/footer layout from the main battle component.
- Enemy B: wall (back) → spell slot → unit card (front). Player A: unit card (front) → spell slot → wall (back). The three lanes form **three columns per player** with six visible unit slots, six spell placeholders, and six HP bars.
- The shared field spell slot is visible at the neutral center as a **disabled placeholder**. Persistent/equipment spell activation remains **unimplemented**, not falsely represented as working.
- Each placed unit's mini card appears **on the same 3-lane field** as its Three.js unit figurine. Cards use the project's original heraldic symbol artwork; the engine remains the only source of current ATK, HP, stance, taunt, and legality.
- Clicking hand cards highlights legal empty unit zones or allied spell targets; click the card slot to summon. Attack-ready units can be selected and then legal targets glow. Taunt, target effects, emergency retreat, hand discard and turn state continue to use the previous engine.
- Bottom center `HandFan`: curved cards inside the field, hover/keyboard focus enlargement and selected card rise, temporary effect description popup. No bottom panel, footer or separate layout height reserved for cards.
- Small floating round/mana/turn HUD, action buttons and optional combat log. Existing lobby and safe return-to-lobby/restart confirmations remain unchanged.
- The Three.js scene was reframed for the full battlefield and given lightweight procedural stone paths and markers. The 3D meshes are **still placeholders**. No images, sound assets or copyrighted card art are reused.
- No changes to the 24 original cards, gacha effects, collection UI, `btwrd_cardgame_v01` save compatibility or developer-mode GEM setting.

## Verification checklist

In the GitHub CI pipeline `.github/workflows/combat-alpha-v050-checks.yml`:
```powershell
npm ci
npm run test
npm run build
```

Tests include:
- The full-field stage and hand fan appear **inside one scene**.
- There is no longer a split tactics sidebar.
- Six unit card slots, six magic slot placeholders, six wall HP buttons and one shared field placeholder.
- Enemy/back vs player/back slot ordering matches the approved rules.
- Selecting a hand card highlights a valid field card slot; clicking it summons the card and reduces the hand.
- Lobby navigation preserves an in-progress match and restart asks first.
- Existing engine rules, gacha and developer GEM tests remain green.

**Not yet verified:** Real GPU/browser visual acceptance, exact projected 3D model alignment at notebook screen resolutions, special responsive/mobile layouts, full match playthrough. Use screenshots to tune if needed.

## Notebook installation

```powershell
cd "$HOME\Desktop\성뿌크로니클"
git status
git fetch origin
git switch --track origin/feature/combat-alpha-v050-field-overlay
npm ci
npm run dev
```

If already checked out locally, use `git switch feature/combat-alpha-v050-field-overlay` and `git pull --ff-only origin feature/combat-alpha-v050-field-overlay`. Do not overwrite uncommitted edits.

## Deferred work

- Proper installed persistent/equipment spell slot use and chains, fast/counter speed; original temporary simple spells still resolve immediately.
- Card-to-model exact projection interaction, native 3D card meshes, drag-and-drop/snap-to-slot and authored 3D/FX.
- Inheritance/synthesis and advanced siege A/B/C; **all still undecided**, not ratified by this patch.
- Balanced ownership-derived decks, production-quality 3D figurines, spell sounds and damage numbers.
