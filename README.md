# LEOOS v2

The operating system of the Arcane empire, rendered as a facility you can walk.

Nine rooms, one per real domain of the business and the life behind it. Nine
crew sprites who walk the corridors between them, drawn toward whichever room
is carrying the most open orders — and toward ARCANE, the commander you drive.
Click a room and the commander walks there while its dashboard opens.

## Architecture

```
                    ARCANE
                       │
                 COMMANDER  (ARCANEBOT)
                       │
          ┌────────────┼────────────┐
       MEMORY     ORCHESTRATOR    CONTROL
      (db state)  (which agent)  (permission grades)
                       │
                 AGENT NETWORK  — 17 specialists, 2 decks
                       │
                    TOOLS  — Notion (read-only), Claude, memory
                              calendar / email / store / CRM / web: not wired
```

Two decks. **Deck 1** is operations — the rooms that run the businesses.
**Deck 2** is command and intelligence — where decisions get made and the
network itself is configured. ARCANE rides a lift between them.

### The Council

`08 THE COUNCIL` puts a real decision to nine seated agents. Each answers from
its own domain in its own voice, then the Commander returns one verdict —
**BUILD, DELAY, WATCH or KILL** — with the conditions that must be true first.

It is one structured `sample.json()` call, not one per seat: faster, cheaper,
and every position is grounded in the same system brief. The prompt forbids
inventing figures, forbids medical claims about any compound, and explicitly
asks for disagreement — a council where everyone agrees is worthless.

### Permissions

Every agent carries a grade per capability: `deny`, `read`, `analyse`, `draft`,
`recommend`, `approval`, `allow`. `10 CONTROL` renders the whole matrix.

Standing rules, enforced in the model rather than asserted in prose:

- No agent spends money. The Treasurer may recommend; you move it.
- Nothing publishes unattended. Drafts wait in the Signal queue.
- Notion is read-only for the entire network.
- No agent gives medical advice about a compound, to you or to a member.

## The rooms

| Room | What it holds | Its dashboard |
| --- | --- | --- |
| **BRIDGE** | Command. Targets and doctrine. | Standing doctrine, goals |
| **FORGE** | Build — site, ArcaneTrack app, automation. | Build queue |
| **BEACON** | Signal — content, email, launches. | The post queue |
| **THE LAB** | Arcane Peptides — cold storage, vial racks, instruments, packing. | Stock by compound with COA state, dispatch queue |
| **VITALS** | Arcane Track — members and dose logs. | Member cohorts |
| **VAULT** | Treasury — cash, VAT, the split. | Month summary and allocations |
| **THE LIBRARY** | Archives content, posts, PDF products. | PDF catalogue cut from real modules |
| **SCRIPTORIUM** | The Codex — books and masterclasses. | Manuscript progress |
| **SANCTUM** | Leo — body, sleep, focus. | Daily protocol |

## The pixel renderer

Everything is drawn into a **380x320** offscreen buffer at 1:1, then blitted to
the visible canvas at an **integer** scale with `imageSmoothingEnabled = false`.
That is what keeps the pixels square instead of soupy.

Three composited layers, back to front:

1. **The field** — a 760x640 industrial landscape baked once at startup from a
   seeded PRNG: three depth layers of structures with lit windows, pipe and
   gantry runs, docking spars, dust. It is drawn centred on the station and
   overflows the stage, so the facility sits *in* a place rather than in a void.
   The station's own footprint is kept clear of it.
2. **The station** — shell, corridors, rooms, props, crew, in the 380x320 buffer.
3. **Atmosphere** — vignette and scanlines at display resolution.

- `src/config/facility.js` — the floor plan and all 185 hand-placed props
- `src/render/props.js` — 78 prop painters; no two rooms share furniture
- `src/render/sprites.js` — character matrices, baked once and blitted
- `src/render/factory.js` — field, buffer, blit, atmosphere, labels, hit testing

Walls have real height: an outer cast shadow, a dark body, a lit top lip, with
the doorway cut out of all three. Floors carry per-room wear — scuffs, stains, a
drain, and darkened edges — seeded off the room id so it is stable across loads.

### Sprites

Each character is a set of matrices: three facings (front, back, side) and three
walk cels (stand, step A, step B), played as a four-beat cycle. Side-facing left
is the right-facing matrix mirrored at bake time, so nothing is drawn twice.
Standing figures get a slow idle bob.

Palette slots: `o` outline, `c` main, `d` shade, `l` highlight, `e` eyes/visor,
`s` skin, `h` hair or helm, `k` cloak fold, `a` trim. The outline sits at
`#0b0b14` rather than pure black so a figure reads against a dark deck, and the
shade/highlight pair is deliberately wide — strong internal contrast is what
makes a nine-pixel figure read as a person rather than a blob. Arms are held off
the torso by an outline column, or they merge into it and the sprite T-poses.

Crew are 9x15, ARCANE is 12x19 and hooded. Every combination is baked once into
a tiny canvas and blitted, so a crowded room costs nothing.

### Tiles

`src/render/tiles.js` holds seven 8x8 tilesets — plate, grate, lab, carpet,
wood, concrete, mat — each with four wear variants chosen from seeded hash noise
so a floor has texture without visibly repeating. Rooms name their set, and each
floor is baked once into its own canvas with scuffs, a drain and inward wall
shadow, then blitted. Nothing about a floor is recomputed per frame.

## Demo data

`src/config/roomdata.js` holds the per-room dashboard rows — real structure,
placeholder numbers — so every room opens as a working dashboard instead of an
empty shell. Each set carries a `source` line naming what it will be wired to,
and shows a `placeholder` chip in the interface. Nothing there is a claim about
what any compound does: stock, batch and COA state only.

## Running it

```bash
npm run dev      # serve the modular source at localhost:5173
npm run build    # flatten to dist/index.html, one self-contained page
```

The source is plain ES modules with no dependencies and no bundler. `build.js`
inlines the stylesheet and flattens the modules into a single page so the
published artifact depends on nothing but itself.

## Changing the ship

Everything lives in **`src/config/empire.js`** — it is the only file you need to
touch to reshape the OS:

- `VENTURES` — the businesses and what they cost/earn
- `CATALOGUE` — titles and prices
- `DECKS` — compartments, their position in the hull (`rect`), and the door
  that opens onto the central corridor (`door` + `spine` index)
- `CREW` — who is aboard and which deck is their station
- `SEED_TASKS` — the opening orders on each deck

Ship space is 100 wide by 170 tall, nose at `y=0`. If you move a compartment,
keep its `door` on one of its own walls and level with its spine node — the
crew route along that corridor, so a misplaced door strands them.

## Layout

```
index.html              page shell
styles/leoos.css        design system (tokens, panels, rail)
src/config/empire.js    ← the empire. edit this.
src/core/store.js       persistence: artifact db → localStorage → memory
src/core/sim.js         crew routing and behaviour
src/render/ship.js      canvas hull renderer
src/render/ui.js        rail, readouts, dashboard, inspectors, counsel
src/app.js              boot and the animation loop
build.js                single-file bundler
```

## State

Orders and ledger figures persist through the artifact `db` capability, so they
follow you across every device signed in to the published page. Where that is
unavailable the store falls back to `localStorage`, and then to memory — the
panel at the foot of the dashboard always says which one is in force.

The ledger ships **blank on purpose**. No revenue figure appears anywhere until
you type a real one in.


## The Signal Forge

A scheduled agent that reads The Arcane Archives and drafts posts you can paste
straight into Threads, X, Instagram, TikTok or an email.

**Notion is read-only.** The agent fetches module pages and nothing else — it
never creates, edits, moves or deletes anything in the workspace. Drafts are
delivered into this artifact's own database and surface on the BEACON deck,
where each one has a Copy button.

How it works:

1. It keeps its own map of the Archives in `forge/state` — `{id, title, course}`
   per module, plus a `covered` list of what it has already used. It walks six
   new course pages per run, so ~3,300 modules index over about a week without
   hammering Notion.
2. Each morning it picks three uncovered modules from three different courses,
   reads what you actually wrote, and drafts one post per module.
3. The drafts go to the front of `system/ship.posts`, trimmed to 30.

It writes drafts only. There is no auto-posting step anywhere in the system.

Peptide content is fenced: no claim that a compound treats, cures, prevents or
diagnoses anything, no dosing, and no named compound paired with a health
outcome. A module that cannot clear that bar is skipped.
