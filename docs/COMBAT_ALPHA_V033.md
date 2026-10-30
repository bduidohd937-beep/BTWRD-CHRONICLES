# COMBAT ALPHA V0.3.3 — 3D+ Hybrid Battle (test build)

This branch prototypes the intended **3D castle battlefield + readable 2D card/turn HUD**. It is not a full rules implementation and does not change the 24 original card definitions, gacha effects, collection UI, or `btwrd_cardgame_v01` save format.

## Start locally

```powershell
cd "$HOME\Desktop\성뿌크로니클"
git status
git fetch origin
git switch --track origin/feature/combat-alpha-v033-3d-battle
npm install
npm run dev
```

If the branch is already local, run `git switch feature/combat-alpha-v033-3d-battle` and `git pull --ff-only origin feature/combat-alpha-v033-3d-battle` instead.

## What to try

1. Open **메인 로비 → 전투 → 새 전투**; default **3D 전장 ON** uses native Three.js/WebGL meshes for castles and troops. **2D 전장** switches off the rendered scene.
2. Pick a unit card from the hand; choose **공격/수비** before summoning; click an empty *active* allied lane.
3. On the unit's next own turn, select a green ready attack-stance unit, then click the enemy in its **same lane**, or that lane's wall if empty. `R001` charge is available on the summon turn.
4. A defending unit takes `ceil(ATK/2)` in combat and does not counterattack. An attack-stance unit receives full damage and counterattacks. You can switch the stance of a ready unit, consuming its normal action.
5. Cast simple test-mode spells: `S001` heal, `S002` shield/taunt, `S003` enemy area damage, `R004` temporary attack buff, `H004` full heal. Other spells are disabled instead of deducting mana with no effect.
6. Each player has a 25-card fixed test deck and opens with 5. Both personal first turns start with 2 mana and **no normal draw**; each second own turn starts at 3 mana and draws 1. Hand >7 must be reduced by **player-selected discards** before the turn can end.
7. Empty deck is not itself defeat; a failed mandatory draw is. All three enemy walls reduced to 0 is victory.

## 3D presentation

- Procedural low-poly **tower/wall/gate geometry** (not production art)
- HP-dependent cracks, damage reaction and collapse into stone fragments
- Summon scale-in, attack lunge, stance shape, unit hit reaction
- GPU rendering with a reduced pixel ratio, reactive resizing, reduced-motion support
- 3D is presentation only; the pure TypeScript engine remains separate and works without WebGL

## Known limitations / design pending

- **Not the final Rulebook 1.9.5 implementation.** Some printed unit triggers, chain timings, magic speed, dedicated magic zones, equipment, extra taunt range and special summons are NOT implemented.
- The five currently supported spells resolve **immediately** without spell-zone reservation or a response chain. Treat this as a temporary battle-testing shortcut, not a canon rule.
- 25-card testing deck is fixed and does not yet use the user's owned card collection/deck builder.
- Emergency retreat UI is wired to the collapse event, but the current basic-attack-only route normally requires destroying the occupant first; it still needs integration testing with future wall-damage effects.
- No verified browser screenshot or visual acceptance test has been run by the GitHub Actions pipeline; CI currently runs logic unit tests, TypeScript validation and a Vite build.
- The 3D castles are geometric placeholders; later iterations can use authored GLB models, particles, hit sound and camera direction.
- The alternative siege A/B/C and ??? synthesis summon count **remain undecided** and are not silently assigned a canonical option.

## Verification

```powershell
npm run test
npm run build
```

The workflow `.github/workflows/combat-alpha-v033-checks.yml` runs the same checks and regenerates the lockfile when needed. Do not merge into `main` until local visual testing and review.
