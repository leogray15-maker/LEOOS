# LEOOS

The operating system of the Arcane empire — a ship you can see.

Nine compartments, one per real domain of the business and the life behind it.
Nine crew who walk the corridors between them, drawn toward whichever deck is
carrying the most open orders. A dashboard alongside that holds the standing
directives, the ledger, the signals worth reacting to, and a counsel console
that reads the whole ship before it answers.

## The decks

| Deck | What it holds |
| --- | --- |
| **BRIDGE** | Command. Targets, the north star, the kill list. |
| **FORGE** | Build. The site, the ArcaneTrack app, automation. |
| **BEACON** | Signal. Content, email, launches. |
| **APOTHECARY** | Arcane Peptides — stock, COA, dispatch. |
| **VITALS** | Arcane Track — members, dose logs, retention. |
| **VAULT** | Treasury — cash, VAT, reconciliation. |
| **ARCHIVES** | Arcane Archives — the £128/mo platform, curriculum. |
| **SCRIPTORIUM** | The Codex — books and masterclasses. |
| **SANCTUM** | Leo — body, sleep, focus. |

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
