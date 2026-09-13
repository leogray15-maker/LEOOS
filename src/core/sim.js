/**
 * Crew simulation.
 *
 * ARCANE is the one you drive: select a room and the commander walks
 * there. The nine crew work their own stations but drift toward whatever
 * room is carrying the most open orders — and toward ARCANE, because the
 * room the commander is standing in is the room that gets attention.
 */

import { ROOMS, ROOM_BY_ID, buildGraph, doorNode } from '../config/facility.js';
import { CREW, ARCANE } from '../config/empire.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Somewhere inside a room, clear of the walls and the door. */
function interiorPoint(room) {
  const [x1, y1, x2, y2] = room.rect;
  return { x: rand(x1 + 14, x2 - 14), y: rand(y1 + 24, y2 - 8) };
}

const GRAPH = buildGraph();

/** Breadth-first over the corridor graph — the building is a grid, not a spine. */
function nodePath(fromId, toId) {
  const a = GRAPH.index[fromId];
  const b = GRAPH.index[toId];
  if (a === undefined || b === undefined) return [];
  if (a === b) return [a];
  const prev = new Map([[a, -1]]);
  const q = [a];
  while (q.length) {
    const n = q.shift();
    if (n === b) break;
    for (const m of GRAPH.edges[n]) {
      if (prev.has(m)) continue;
      prev.set(m, n);
      q.push(m);
    }
  }
  if (!prev.has(b)) return [];
  const out = [];
  for (let n = b; n !== -1; n = prev.get(n)) out.push(n);
  return out.reverse();
}

/** Walk one room to another: out of the door, along the corridors, in again. */
function route(fromId, toId) {
  const a = ROOM_BY_ID[fromId];
  const b = ROOM_BY_ID[toId];
  if (!a || !b) return [];

  const pts = [{ x: a.door[0], y: a.door[1] }];
  for (const n of nodePath(doorNode(a), doorNode(b))) {
    pts.push({ x: GRAPH.nodes[n].x, y: GRAPH.nodes[n].y });
  }
  pts.push({ x: b.door[0], y: b.door[1] });
  pts.push(interiorPoint(b));

  return pts.filter((p, i) => i === 0
    || Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) > 0.5);
}

function makeWalker(def, kind, speed) {
  const room = ROOM_BY_ID[def.room];
  const p = interiorPoint(room);
  return {
    ...def,
    kind,
    speed,
    deck: def.room,
    home: def.room,        // the room it drifts back to, and reports as its station
    x: p.x, y: p.y,
    tx: p.x, ty: p.y,
    state: 'work',
    hx: 0, hy: 1,          // heading, for which way the sprite faces
    step: 0,               // walk-cycle phase
    timer: rand(3, 14),
    path: null,
    leg: 0,
    wake: [],
    wakeClock: 0,
    order: null,
  };
}

export class Sim {
  constructor(store) {
    this.store = store;
    this.speed = 1;
    this.selectedAgent = null;
    this.agents = CREW.map((c, i) => {
      const a = makeWalker(c, 'crew', 30);
      a.timer += i * 0.6;
      return a;
    });
    this.arcane = makeWalker(ARCANE, 'arcane', 40);
  }

  everyone() { return [...this.agents, this.arcane]; }

  /** Everyone on the floor — there is only one now. */
  onFloor() { return this.everyone(); }

  inRoom(id) {
    return this.agents.filter((a) => a.deck === id && a.state === 'work');
  }

  /** 0–1, drives how brightly a room is lit. */
  activity(id) {
    const crew = this.inRoom(id).length;
    const open = this.store.openCount(id);
    const boss = this.arcane.deck === id && this.arcane.state === 'work' ? 0.3 : 0;
    return Math.min(1, crew * 0.26 + Math.min(open, 4) * 0.1 + boss);
  }

  /** Send anyone to a room. This is the command primitive. */
  dispatch(agent, roomId) {
    if (!agent || !ROOM_BY_ID[roomId] || agent.deck === roomId) return false;
    agent.path = route(agent.deck, roomId);
    agent.leg = 0;
    agent.state = 'transit';
    agent.deck = roomId;
    agent.order = null;
    return true;
  }

  /** ARCANE walks to the room you opened. */
  commandTo(roomId) {
    const room = ROOM_BY_ID[roomId];
    if (!room) return;
    if (this.arcane.deck === roomId && this.arcane.state === 'work') return;
    if (this.dispatch(this.arcane, roomId)) this.store.trace(`ARCANE → ${room.name}`);
  }

  /** Where a crew member drifts next: open orders pull, so does the commander. */
  chooseTarget(agent) {
    const bag = [];
    for (const r of ROOMS) {
      let w = 1 + this.store.openCount(r.id) * 2.4;
      if (r.id === agent.home) w += 5;
      if (r.id === this.arcane.deck) w += 4;
      if (r.id === agent.deck) w *= 0.2;
      for (let i = 0; i < Math.round(w); i++) bag.push(r.id);
    }
    return bag.length ? pick(bag) : agent.home;
  }

  tick(dt) {
    const step = dt * this.speed;
    for (const a of this.everyone()) {
      a.wakeClock += step;
      if (a.wakeClock > 0.05) {
        a.wakeClock = 0;
        a.wake.push({ x: a.x, y: a.y });
        if (a.wake.length > 14) a.wake.shift();
      }
      if (a.state === 'work') this.tickWork(a, step);
      else this.tickTransit(a, step);
    }
  }

  tickWork(agent, step) {
    const dx = agent.tx - agent.x;
    const dy = agent.ty - agent.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.2) {
      const p = interiorPoint(ROOM_BY_ID[agent.deck]);
      agent.tx = p.x; agent.ty = p.y;
      agent.state = 'work';
    } else {
      const v = agent.speed * 0.28 * step;
      agent.x += (dx / dist) * v;
      agent.y += (dy / dist) * v;
      agent.hx = dx / dist;
      agent.hy = dy / dist;
      agent.step += v * 0.42;
    }

    const open = this.store.tasks(agent.deck).find((t) => !t.done);
    agent.order = open ? open.t : null;

    // ARCANE holds position until you send them somewhere
    if (agent.kind === 'arcane') return;

    agent.timer -= step;
    if (agent.timer > 0) return;
    const target = this.chooseTarget(agent);
    if (target === agent.deck) { agent.timer = rand(5, 15); return; }
    this.dispatch(agent, target);
  }

  tickTransit(agent, step) {
    const next = agent.path?.[agent.leg];
    if (!next) { this.arrive(agent); return; }
    const dx = next.x - agent.x;
    const dy = next.y - agent.y;
    const dist = Math.hypot(dx, dy);
    const v = agent.speed * step;
    if (dist <= v) {
      agent.x = next.x; agent.y = next.y;
      agent.leg += 1;
      if (agent.leg >= agent.path.length) this.arrive(agent);
      return;
    }
    agent.x += (dx / dist) * v;
    agent.y += (dy / dist) * v;
    agent.hx = dx / dist;
    agent.hy = dy / dist;
    agent.step += v * 0.42;
  }

  arrive(agent) {
    agent.state = 'work';
    agent.path = null;
    agent.timer = rand(7, 20);
    const p = interiorPoint(ROOM_BY_ID[agent.deck]);
    agent.tx = p.x; agent.ty = p.y;
    if (agent.kind !== 'arcane') {
      this.store.trace(`${agent.name} reached ${ROOM_BY_ID[agent.deck].name}`);
    }
  }

  agentAt(x, y, radius = 9) {
    let best = null;
    let bestD = radius;
    for (const a of this.everyone()) {
      const d = Math.hypot(a.x - x, a.y - (y + 5));
      if (d < bestD) { bestD = d; best = a; }
    }
    return best;
  }
}
