/**
 * Crew simulation — the little agents that walk the ship.
 *
 * The hull is a tree: a central spine with one door hanging off it per
 * compartment. Routing is therefore exact and cheap — walk up the spine
 * from one door to the other. Agents drift toward compartments that have
 * open orders, so a busy deck visibly draws crew.
 */

import { SHIP, DECKS, CREW } from '../config/empire.js';

const DECK_MAP = Object.fromEntries(DECKS.map((d) => [d.id, d]));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** A point comfortably inside a compartment, clear of its walls. */
function interiorPoint(deck) {
  const [x1, y1, x2, y2] = deck.rect;
  return { x: rand(x1 + 3, x2 - 3), y: rand(y1 + 3.5, y2 - 3.5) };
}

/** Route between two compartments along the spine. */
function route(from, to) {
  const a = DECK_MAP[from];
  const b = DECK_MAP[to];
  const pts = [{ x: a.door[0], y: a.door[1] }];
  const step = a.spine <= b.spine ? 1 : -1;
  for (let i = a.spine; i !== b.spine + step; i += step) {
    pts.push({ x: SHIP.spine[i][0], y: SHIP.spine[i][1] });
  }
  pts.push({ x: b.door[0], y: b.door[1] });
  pts.push(interiorPoint(b));
  // drop zero-length hops so the walk never stalls on a duplicate node
  return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) > 0.01);
}

export class Sim {
  constructor(store) {
    this.store = store;
    this.speed = 1;
    this.agents = CREW.map((c, i) => {
      const deck = DECK_MAP[c.home];
      const p = interiorPoint(deck);
      return {
        ...c,
        deck: c.home,
        x: p.x, y: p.y,
        tx: p.x, ty: p.y,      // wander target inside the compartment
        heading: 0,
        state: 'work',
        timer: rand(4, 16) + i * 0.7,
        path: null,
        leg: 0,
        wake: [],
        wakeClock: 0,
        order: null,
      };
    });
  }

  /** Crew currently inside a compartment. */
  inDeck(deckId) {
    return this.agents.filter((a) => a.deck === deckId && a.state === 'work');
  }

  /** 0–1 activity level, used to light the compartment on the hull. */
  activity(deckId) {
    const crew = this.inDeck(deckId).length;
    const open = this.store.openCount(deckId);
    return Math.min(1, crew * 0.34 + Math.min(open, 4) * 0.13);
  }

  /** Where an agent goes next: open orders pull, home station pulls back. */
  chooseTarget(agent) {
    const weighted = [];
    for (const d of DECKS) {
      let w = 1 + this.store.openCount(d.id) * 2.2;
      if (d.id === agent.home) w += 6;
      if (d.id === agent.deck) w *= 0.25;
      for (let i = 0; i < Math.round(w); i++) weighted.push(d.id);
    }
    return weighted.length ? pick(weighted) : agent.home;
  }

  /** Advance the world. `dt` in seconds. */
  tick(dt) {
    const step = dt * this.speed;
    for (const agent of this.agents) {
      agent.wakeClock += step;
      if (agent.wakeClock > 0.07) {
        agent.wakeClock = 0;
        agent.wake.push({ x: agent.x, y: agent.y });
        if (agent.wake.length > 16) agent.wake.shift();
      }

      if (agent.state === 'work') this.tickWork(agent, step);
      else this.tickTransit(agent, step);
    }
  }

  tickWork(agent, step) {
    // small purposeful drift around the compartment — never a jitter
    const dx = agent.tx - agent.x;
    const dy = agent.ty - agent.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.6) {
      const p = interiorPoint(DECK_MAP[agent.deck]);
      agent.tx = p.x; agent.ty = p.y;
    } else {
      const v = 2.4 * step;
      agent.x += (dx / dist) * v;
      agent.y += (dy / dist) * v;
      agent.heading = Math.atan2(dy, dx);
    }

    const open = this.store.tasks(agent.deck).find((t) => !t.done);
    agent.order = open ? open.t : null;

    agent.timer -= step;
    if (agent.timer > 0) return;

    const target = this.chooseTarget(agent);
    if (target === agent.deck) {
      agent.timer = rand(6, 18);
      return;
    }
    agent.path = route(agent.deck, target);
    agent.leg = 0;
    agent.state = 'transit';
    agent.deck = target;
    agent.order = null;
  }

  tickTransit(agent, step) {
    const next = agent.path[agent.leg];
    if (!next) { this.arrive(agent); return; }
    const dx = next.x - agent.x;
    const dy = next.y - agent.y;
    const dist = Math.hypot(dx, dy);
    const v = 13 * step;
    if (dist <= v) {
      agent.x = next.x; agent.y = next.y;
      agent.leg += 1;
      if (agent.leg >= agent.path.length) this.arrive(agent);
      return;
    }
    agent.x += (dx / dist) * v;
    agent.y += (dy / dist) * v;
    agent.heading = Math.atan2(dy, dx);
  }

  arrive(agent) {
    agent.state = 'work';
    agent.path = null;
    agent.timer = rand(8, 22);
    const p = interiorPoint(DECK_MAP[agent.deck]);
    agent.tx = p.x; agent.ty = p.y;
    this.store.trace(`${agent.name} → ${DECK_MAP[agent.deck].name}`);
  }

  /** Hit test in ship space, for clicks on the hull. */
  agentAt(x, y, radius = 3.6) {
    let best = null;
    let bestD = radius;
    for (const a of this.agents) {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < bestD) { bestD = d; best = a; }
    }
    return best;
  }
}

export function deckAt(x, y) {
  return DECKS.find((d) => {
    const [x1, y1, x2, y2] = d.rect;
    return x >= x1 && x <= x2 && y >= y1 && y <= y2;
  }) || null;
}
