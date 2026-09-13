# LEOOS v2

The operating system of the Arcane empire, rendered as a facility you can walk.

Twenty rooms, one per real domain of the business and the life behind it.
Eighteen crew sprites walk the corridors between them, drawn toward whichever
room is carrying the most open orders — and toward ARCANE, the commander you
drive. Click a room and the commander walks there while its dashboard opens.

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
                 AGENT NETWORK  — 18 specialists, one facility
                       │
                    TOOLS  — Notion (read-only), Claude, memory
                              calendar / email / store / CRM / web: not wired
```

One facility, twenty rooms, four wings around two service corridors and a
central hall:

```
 C1 PRODUCTION │ V1 │ C2 COMMAND │ HALL │ C3 KNOWLEDGE │ V3 │ C4 NETWORK
```

| | PRODUCTION | COMMAND | KNOWLEDGE | NETWORK |
| --- | --- | --- | --- | --- |
| 1 | The Lab | Bridge | Intelligence | Agent Garage |
| 2 | Vitals | War Room | Observatory | Control Room |
| 3 | Forge | The Council | Deal Room | Inventor's Room |
| 4 | The Market | The Vault | The Library | The Records |
| 5 | Beacon | Scriptorium | The Lounge | Sanctum |

Routing is breadth-first over a corridor graph, not a single spine — the
building is a grid, so agents find their own way through it. `buildGraph()`
places nodes where corridors meet room rows and the hall; a build-time check
proves every room is reachable from every other.

The map is 640x460, larger than most stages allow at 2x, so there is a
**FIT / 2x / 3x** zoom and drag-to-pan. Scale is always an integer — a
fractional one gives uneven pixels and shimmer. Opening a room brings it into
view without moving the map when it is already visible.

### The Council

`08 THE COUNCIL` — and the door inside THE COUNCIL on the floor, which is
the same screen — puts a real decision to nine seated agents. Each answers from
its own domain in its own voice, then the Commander returns one verdict —
**BUILD, DELAY, WATCH or KILL** — with the conditions that must be true first.

It is one structured `sample.json()` call, not one per seat: faster, cheaper,
and every position is grounded in the same system brief. The prompt forbids
inventing figures, forbids medical claims about any compound, and explicitly
asks for disagreement — a council where everyone agrees is worthless.

### Permissions

Every agent carries a grade per capability: `deny`, `read`, `analyse`, `draft`,
`recommend`, `approval`, `allow`. `09 CONTROL` renders the whole matrix,
and THE CONTROL ROOM on the floor opens the same screen.

Standing rules, enforced in the model rather than asserted in prose:

- No agent spends money. The Treasurer may recommend; you move it.
- Nothing publishes unattended. Drafts wait in the Signal queue.
- Notion is read-only for the entire network.
- No agent gives medical advice about a compound, to you or to a member.

## Navigation

**One door per thing.** Every destination has exactly one interface. Where a
room's work needs a full screen, the room opens the door to it rather than
rendering a second copy into the side panel — so THE COUNCIL, THE AGENT
GARAGE and THE CONTROL ROOM each lead to one Council, one roster, one matrix.

The rail is eleven rows in four groups:

| | | |
| --- | --- | --- |
| **Overview** | `00` THE EMPIRE | `01` THE FACTORY |
| **Work** | `02` ORDERS · `03` AGENTS | `04` SIGNALS |
| **Money** | `05` VENTURES · `06` LEDGER | `07` GOALS |
| **Governance** | `08` THE COUNCIL · `09` CONTROL | `10` SYSTEM |

**The number on a row is the key that opens it.** Digits accumulate for
700ms, so `10` is typed as 1 then 0; a lone digit reads as its leading-zero
form, so 6 opens `06 LEDGER`. Escape closes an open room dashboard. A digit
typed into a field stays in the field.

Rooms are opened from the floor — click one and the commander walks there
while its dashboard opens.

## The rooms

All twenty rooms open onto a dashboard with real controls — orders, crew,
goals and the venture that room belongs to. Ten of them also carry a bespoke
widget on top of that:

| Room | What it holds | Its dashboard |
| --- | --- | --- |
| **BRIDGE** | Command. Targets and doctrine. | Standing doctrine, goals |
| **FORGE** | Build — site, ArcaneTrack app, automation. | Build queue |
| **BEACON** | Signal — content, email, launches. | The post queue |
| **THE LAB** | Arcane Peptides — cold storage, vial racks, instruments, packing. | Editable stock by compound with COA state; live dispatch queue when the shop is connected |
| **THE MARKET** | The shop front — visitors, leads, orders. | Funnel: revenue, average order, orders per customer, conversion |
| **VITALS** | Arcane Track — members and dose logs. | Member cohorts |
| **VAULT** | Treasury — cash, VAT, the split. | Month summary and allocations |
| **THE LIBRARY** | Archives content, posts, PDF products. | PDF catalogue cut from real modules |
| **SCRIPTORIUM** | The Codex — books and masterclasses. | Manuscript progress |
| **SANCTUM** | Leo — body, sleep, focus. | Daily protocol |

## The pixel renderer

Everything is drawn into a **640x460** offscreen buffer at 1:1, then blitted to
the visible canvas at an **integer** scale with `imageSmoothingEnabled = false`.
That is what keeps the pixels square instead of soupy.

Three composited layers, back to front:

1. **The field** — a 760x640 industrial landscape baked once at startup from a
   seeded PRNG: three depth layers of structures with lit windows, pipe and
   gantry runs, docking spars, dust. It is drawn centred on the station and
   overflows the stage, so the facility sits *in* a place rather than in a void.
   The station's own footprint is kept clear of it.
2. **The station** — shell, corridors, rooms, props, crew, in the 640x460 buffer.
3. **Atmosphere** — vignette and scanlines at display resolution.

- `src/config/facility.js` — the floor plan and all 412 hand-placed props
- `src/render/props.js` — 90 prop painters; no two rooms share furniture
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

## Connecting Arcane Peptides

The shop at `arcanepeptides.vercel.app` is where orders, revenue, customers and
stock actually live. LEOOS reads it; it never writes to it.

**On the shop.** Copy `bridge/arcane-peptides-feed.ts` into the Next.js app as
`app/api/leoos-feed/route.ts` and replace the three loader stubs at the bottom
with however that app reads its data. Set `ARCANE_FEED_KEY` in the project's
environment variables, and `LEOOS_ORIGIN` to the LEOOS deployment's origin so
CORS is scoped rather than open. The route only selects, and it returns counts,
totals and shelf state — no names, emails or addresses cross the wire.

**In LEOOS.** System → Arcane Peptides. Paste the feed URL and the key, hit
Save, and the pull runs. THE LAB fills with real vial counts, batches, COA state
and the live dispatch queue; THE MARKET becomes a real funnel.

Two paths in, because the two places this page runs have different rules:

| Path | Where it works | Why |
| --- | --- | --- |
| live pull | the Vercel deployment, any normal origin | a plain `fetch` of the feed URL |
| paste | the published artifact on claude.ai | artifacts run under a CSP that blocks outbound `fetch`, so open the feed URL in a tab, copy the JSON, and drop it into **Paste feed instead** |

Both go through the same normaliser in `src/core/bridge.js`, which accepts
several plausible field namings (`vials`/`stock`/`quantity`, `status`/`stage`)
so the shop's own schema does not have to match this one. A stock row that
carries no count at all is read as "the shop does not count vials" rather than
as zero, so the hand count in THE LAB survives the pull — the shop still sets
that line's COA, batch and size.

A pull is authoritative for the compounds the shop names and leaves every line
counted by hand alone. Fed lines carry a green dot so it is always obvious which
number came from where. `bridge/sample-feed.json` is a feed shaped like the real
admin page, and `test/feedserver.mjs` serves it for the suite.

## What actually reasons

Worth being straight about, because AGENTS lists tools for every agent:

- **live** — the Council (nine seats deliberate, one structured call) and Counsel
  (ask the network anything). Both need `sample`, so both only work on the
  published page at claude.ai.
- **live** — the Arcane Peptides bridge, once connected.
- **simulation** — the floor. Crew route, walk and drift toward attention. They
  do not perform the work their labels describe.
- **waiting** — the Signal Forge Routine exists but has no connector attached,
  so it cannot read the Archives yet.
- **not wired** — the `tools` array on each agent describes what that agent is
  *for*. No agent calls a tool on its own. Control → *What actually runs today*
  says the same thing inside the interface.

## Running it

```bash
npm run dev      # serve the modular source at localhost:5173
npm run build    # flatten to two self-contained targets
npm test               # build, serve, run the 75-check end-to-end suite
npm run test:dev       # the same screens and rooms on the real ES modules
npm run test:contrast  # every text element on every screen, measured against AA
npm run test:clipping  # anything whose content overflows its box
```

The build emits the same page twice, because its two homes need different
things:

| Target | Shape | For |
| --- | --- | --- |
| `dist/index.html` | fragment — no doctype, html, head or body | the Artifact platform, which wraps it in its own shell at publish time |
| `public/index.html` | complete document | Vercel or any static host |

Publishing the fragment to a static host is the trap: nothing injects a charset
or a **viewport meta**, so the page runs in quirks mode and a phone renders it
at desktop width. The standalone target carries both, plus a theme colour, an
inline SVG favicon and the same reset the Artifact shell applies, so the two
render identically.

## Legibility, measured

Two of these suites are there because "looks fine to me" is not a test, and
a third is there because the bundle can hide a broken import.

`npm run test:dev` loads the real ES modules rather than the flattened bundle.
Flattening shares one scope, so a module that forgot an import still resolves
and every other check passes, while `npm run dev` dies on load. That suite
walks all eleven screens and all twenty rooms on that path.

`npm run test:contrast` walks every rendered element on all eleven screens and
all twenty room dashboards, finds the first opaque background actually painted
behind each piece of text, and computes the real WCAG ratio. Everything must
clear 4.5:1 (3:1 for large text). The palette is tuned to that: `--faint` was
sitting at **2.6:1**, which fails even the large-text floor, and it is used on
every muted note, stat label and table header — that was the squint. Each tone
now carries its measured ratio as a comment beside it.

`npm run test:clipping` finds any element whose content overflows its own box
without a scroller or an ellipsis to handle it. It caught a `calc(100% + 16px)`
hover bleed on `.order`, `.floor-row` and `.signal-row` that pushed 8px of
horizontal overflow into every scroll container in the app.

## Deploying

`vercel.json` sets `buildCommand: node build.js` and `outputDirectory: public`.
There are no dependencies to install — the build is one Node script with no
imports beyond `node:fs` and `node:path`.

What does **not** work outside the Artifact viewer: `window.claude` is absent, so
Counsel and the Council have nothing to reason with and state falls back to
`localStorage` instead of syncing across devices. The interface says which is in
force rather than pretending.

The source is plain ES modules with no dependencies and no bundler. `build.js`
inlines the stylesheet and flattens the modules into a single page so the
published artifact depends on nothing but itself.

## Changing it

The empire is **`src/config/empire.js`**:

- `VENTURES` — the businesses and what they cost/earn
- `CATALOGUE` — titles and prices
- `GOALS`, `BUDGET` — targets, fixed costs, the split
- `SCREENS` — the rail: each row's number, name and group
- `SEED_TASKS` — the opening orders in each room

The building is **`src/config/facility.js`**: `ROOMS` (each with its `rect`,
`door`, tileset, accent and hand-placed props) and `WINGS`. Pixel space is
640 wide by 460 tall. A room's `door` must sit on one of its own walls and
line up with a corridor, or the crew cannot route to it — `buildGraph()`
proves at build time that every room still reaches every other.

The network is **`src/config/agents.js`**: `AGENTS` (19, one of them ARCANE),
their `tools`, and the `caps` grade each one runs under.

## Layout

```
index.html              page shell
styles/leoos.css        design system (tokens, panels, rail)
build.js                single-file bundler, and the module ORDER
vercel.json             static deploy

src/app.js              boot, the animation loop, pointer and keyboard
src/config/empire.js    ventures, catalogue, goals, budget, the rail
src/config/facility.js  the floor plan, twenty rooms and their props
src/config/agents.js    the network: agents, tools, permission grades
src/config/roomdata.js  per-room dashboard rows, and which room has a widget
src/core/store.js       persistence: artifact db → localStorage → memory
src/core/sim.js         crew routing and behaviour
src/core/bridge.js      the Arcane Peptides feed, pulled or pasted
src/render/format.js    presentation helpers — no store, no DOM
src/render/screens.js   the full-screen bodies the rail opens
src/render/widgets.js   per-room panels, and the bridge that feeds two
src/render/ui.js        shell, navigation, dashboard, telemetry, events
src/render/factory.js   field, buffer, blit, atmosphere, hit testing
src/render/tiles.js     seven 8x8 tilesets with wear variants
src/render/props.js     90 prop painters
src/render/sprites.js   character matrices, baked once and blitted

bridge/                 the feed route to drop into the shop, and a sample
test/                   e2e, dev-graph, contrast and clipping suites
trading/                the backtester — separate from the OS, see below
```

The panels are one class in three links — `UIScreens → UIWidgets → UI`.
`extends` runs at class-definition time, so `build.js` must flatten them in
that order. It checks that every imported module is in `ORDER` and that no
two modules declare the same top-level name, because flattening shares one
scope.

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

## The trading bot

`trading/` is a research backtester, and it is **not part of the OS** — no
screen, room or agent reads it, and it shares nothing with the facility but
the repository. It is kept here because it is the groundwork for an ETH
trading bot that will connect through MetaMask.

```bash
cd trading
pip install -r requirements.txt     # numpy and pandas, nothing else
python3 test_engine.py              # 9 checks on the engine itself
python3 run.py                      # synthetic series, clearly marked
python3 run.py ../data/BTCUSDT_1d.csv
```

It had no dependency manifest, so `requirements.txt` now names the two it
needs. `results.json` is a run output and is no longer tracked.

The engine is deliberately pessimistic, because a backtest that flatters a
strategy costs money with confidence:

- signals are computed from data up to bar `t` and the position is only held
  during `t+1`, so nothing can see its own future
- every change in position pays both a fee and slippage, both ways
- every result is reported next to buy-and-hold, after the same costs
- nothing is reported without an out-of-sample half and a permutation test
- long/flat only, because shorting adds funding, borrow and liquidation
  mechanics this engine does not model and will not pretend to

**Nothing in this repository can place an order or touch a wallet.** It reads
price series and prints results. Wiring a wallet that can spend real funds is
a different risk class from anything else in LEOOS — it belongs behind its own
explicit, reviewed step, not inside a refactor.
