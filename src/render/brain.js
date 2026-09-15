/**
 * THE BRAIN — the network as a graph, drawn live.
 *
 * The facility shows where the crew *are*. This shows how they are
 * *wired*: who answers to the commander, who sits on the Council, and
 * which tools each agent can actually reach. Every node and edge is read
 * from `src/config/agents.js` and from the live simulation, so the
 * picture cannot describe a network the system does not have.
 *
 * **Why this is not a force simulation.** The obvious thing is springs
 * and repulsion, and it looks like a thrown handful of gravel: the
 * commander buried in the middle of a lopsided blob, and a tool nothing
 * points at flung into the far corner, stretching the frame around empty
 * space. Force layout is for graphs whose shape you do not know. This
 * shape is known and it is hierarchical — a commander, nine seats, the
 * rest of the crew, the tools at the rim — so it is drawn as the four
 * orbits it actually is. Deterministic, legible, and stable between
 * frames, which matters because the *sizes* move and the layout must not.
 *
 * Tools are placed at the mean angle of the agents that use them, so the
 * links stay short and mostly avoid crossing the rings.
 *
 * What is live rather than static:
 *
 *   - a node swells with the open orders standing in that agent's room
 *   - an agent the simulation has walking pulses, and its edges brighten
 *   - a tool's colour is its real wiring state, and an edge to a tool
 *     that is not wired is dashed, because that link carries nothing yet
 */

import { AGENTS, ARCANE, TOOLS } from '../config/agents.js';
import { ROOM_BY_ID } from '../config/facility.js';

/** Tool wiring states, as colours — the same reading as the chips. */
const TOOL_TONE = {
  live: '#3ecf8e',
  'read-only': '#6bd6ff',
  'not wired': '#5a5a72',
};

/** The four orbits. Ratios are what matter; the view fits itself. */
const ORBIT = { council: 132, crew: 246, tool: 344 };

export class Brain {
  constructor(canvas, sim, store, onPick) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sim = sim;
    this.store = store;
    this.onPick = onPick;
    this.hover = null;
    /** Set by the UI from prefers-reduced-motion; stills the pulse. */
    this.still = false;
    this.t = 0;
    this.scale = 1;
    this.cx = 0;
    this.cy = 0;
    this.fitted = false;
    this.build();
  }

  /* ---------- the graph ---------- */

  build() {
    this.nodes = [];
    this.edges = [];
    const byId = {};
    const add = (n) => { this.nodes.push(n); byId[n.id] = n; return n; };
    const polar = (angle, radius) => ({
      tx: Math.cos(angle) * radius, ty: Math.sin(angle) * radius, angle,
    });

    // The commander holds the middle. Everything else orbits it.
    add({
      id: ARCANE.id, kind: 'agent', label: ARCANE.name, colour: ARCANE.colour,
      agent: ARCANE, tx: 0, ty: 0, x: 0, y: 0, angle: 0, base: 13,
    });

    // Council seats first, ordered by voice weight so the ring reads as
    // the order they actually speak in.
    const council = AGENTS.filter((a) => a.council && a.id !== ARCANE.id)
      .sort((a, b) => a.weight - b.weight);
    const crew = AGENTS.filter((a) => !a.council && a.id !== ARCANE.id);

    const ring = (list, radius, offset) => list.forEach((a, i) => {
      const angle = offset + (i / list.length) * Math.PI * 2;
      add({
        id: a.id, kind: 'agent', label: a.name, colour: a.colour, agent: a,
        ...polar(angle, radius), x: 0, y: 0, base: a.council ? 9.5 : 8, seat: a.council,
      });
      this.edges.push({ a: ARCANE.id, b: a.id, kind: 'command' });
    });

    // The council ring is turned half a step so top-dead-centre is a gap,
    // not a seat — that is where the ring's own label goes. The crew ring
    // is offset again so a crew node never sits directly behind a seat.
    ring(council, ORBIT.council, -Math.PI / 2 + Math.PI / council.length);
    ring(crew, ORBIT.crew, -Math.PI / 2 + Math.PI / crew.length);

    // A tool sits at the mean heading of the agents that use it, which
    // keeps its links short and off the rings.
    for (const t of TOOLS) {
      const users = AGENTS.filter((a) => a.tools.includes(t.id));
      let sx = 0;
      let sy = 0;
      for (const a of users) {
        const n = byId[a.id];
        if (!n) continue;
        sx += Math.cos(n.angle);
        sy += Math.sin(n.angle);
      }
      // A tool nobody reaches for still needs somewhere to stand.
      const angle = (sx || sy) ? Math.atan2(sy, sx) : Math.random() * Math.PI * 2;
      add({
        id: `tool:${t.id}`, kind: 'tool', label: t.name, tool: t,
        colour: TOOL_TONE[t.state] || TOOL_TONE['not wired'],
        ...polar(angle, ORBIT.tool), x: 0, y: 0, base: 6,
      });
    }

    // Two tools wanting the same heading would overlap, so spread any that
    // land on top of each other around the rim.
    this.spreadTools();

    /**
     * Shared memory is on every agent's list, and drawing all nineteen of
     * those edges says only "everyone has memory" — at the cost of
     * nineteen lines straight across the middle of the picture. A tool the
     * whole network reaches gets one edge, to the commander, and says so
     * in its caption instead.
     */
    for (const t of TOOLS) {
      const node = byId[`tool:${t.id}`];
      if (!node) continue;
      const users = AGENTS.filter((a) => a.tools.includes(t.id));
      node.users = users.length;
      node.universal = users.length === AGENTS.length;
      if (node.universal) {
        this.edges.push({ a: ARCANE.id, b: node.id, kind: 'tool' });
        continue;
      }
      for (const a of users) this.edges.push({ a: a.id, b: node.id, kind: 'tool' });
    }

    this.byId = byId;
    // Start each node on its mark rather than animating in from the origin.
    for (const n of this.nodes) { n.x = n.tx; n.y = n.ty; }
  }

  /** Push apart any tools closer together than the rim has room for. */
  spreadTools() {
    const tools = this.nodes.filter((n) => n.kind === 'tool')
      .sort((a, b) => a.angle - b.angle);
    const gap = (Math.PI * 2) / (tools.length * 1.35);
    for (let pass = 0; pass < 60; pass++) {
      let moved = false;
      for (let i = 0; i < tools.length; i++) {
        const a = tools[i];
        const b = tools[(i + 1) % tools.length];
        let d = b.angle - a.angle;
        while (d < 0) d += Math.PI * 2;
        if (d < gap) {
          const push = (gap - d) / 2;
          a.angle -= push;
          b.angle += push;
          moved = true;
        }
      }
      if (!moved) break;
    }
    for (const n of tools) {
      n.tx = Math.cos(n.angle) * ORBIT.tool;
      n.ty = Math.sin(n.angle) * ORBIT.tool;
    }
  }

  /* ---------- live readings ---------- */

  /** Open orders standing in this agent's room. Drives how big it draws. */
  load(node) {
    return node.kind === 'agent' ? (this.store.openCount(node.agent.room) || 0) : 0;
  }

  /** True while the simulation has this agent walking somewhere. */
  moving(node) {
    return node.kind === 'agent'
      && this.sim.everyone().some((x) => x.id === node.id && x.state === 'transit');
  }

  /** Square-rooted, so a room with twenty orders does not dwarf the rest. */
  radius(node) {
    return node.base + (node.kind === 'agent' ? Math.sqrt(this.load(node)) * 2.6 : 0);
  }

  /* ---------- motion ---------- */

  tick(dt) {
    this.t += dt;
    // Positions are fixed marks; this only eases a node onto its mark, so
    // a rebuild or a resize slides rather than jumps.
    const k = Math.min(1, dt * 6);
    for (const n of this.nodes) {
      n.x += (n.tx - n.x) * k;
      n.y += (n.ty - n.y) * k;
    }
  }

  /* ---------- the frame ---------- */

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, Math.round(rect.width));
    this.h = Math.max(1, Math.round(rect.height));
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Fit the whole graph to whatever frame it has been given. The layout
   * decides the shape; this decides how big it draws, so the same picture
   * works on a laptop and on a phone without touching the orbits.
   */
  fit() {
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    for (const n of this.nodes) {
      const r = this.radius(n);
      minX = Math.min(minX, n.x - r); maxX = Math.max(maxX, n.x + r);
      minY = Math.min(minY, n.y - r); maxY = Math.max(maxY, n.y + r);
    }
    // Room at the bottom of each node for its label.
    const pad = 34;
    const want = Math.min(
      (this.w - pad * 2) / Math.max(1, maxX - minX),
      (this.h - pad * 2 - 14) / Math.max(1, maxY - minY),
      1.4,
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    if (!this.fitted) { this.fitted = true; this.scale = want; this.cx = cx; this.cy = cy; return; }
    const ease = 0.1;
    this.scale += (want - this.scale) * ease;
    this.cx += (cx - this.cx) * ease;
    this.cy += (cy - this.cy) * ease;
  }

  /** Graph space → canvas space. Everything draws through this. */
  project(n) {
    return {
      x: (n.x - this.cx) * this.scale + this.w / 2,
      y: (n.y - this.cy) * this.scale + this.h / 2,
    };
  }

  /* ---------- drawing ---------- */

  draw() {
    const { ctx } = this;
    // The stage resizes with the window and with the rail; re-fit rather
    // than drawing into a stale backing store.
    if (!this.w || this.canvas.clientWidth !== this.w || this.canvas.clientHeight !== this.h) this.resize();
    this.fit();
    ctx.clearRect(0, 0, this.w, this.h);

    const mid = this.project({ x: 0, y: 0 });
    const at = new Map();
    for (const n of this.nodes) at.set(n, this.project(n));

    // The orbits themselves, faintly — the Council reads as a ring rather
    // than as nine unrelated dots.
    for (const [name, r] of [['council', ORBIT.council], ['crew', ORBIT.crew]]) {
      ctx.beginPath();
      ctx.arc(mid.x, mid.y, r * this.scale, 0, Math.PI * 2);
      ctx.strokeStyle = name === 'council' ? 'rgba(169,139,255,.3)' : 'rgba(150,150,190,.14)';
      ctx.setLineDash(name === 'council' ? [] : [2, 5]);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.font = '600 8.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(169,139,255,.62)';
    ctx.fillText('THE COUNCIL', mid.x, mid.y - ORBIT.council * this.scale - 5);

    for (const e of this.edges) {
      const a = this.byId[e.a];
      const b = this.byId[e.b];
      const pa = at.get(a);
      const pb = at.get(b);
      const hot = this.hover && (this.hover === a || this.hover === b);
      const unwired = e.kind === 'tool' && b.tool?.state === 'not wired';
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.setLineDash(unwired ? [3, 4] : []);
      ctx.strokeStyle = hot ? 'rgba(169,139,255,.85)'
        : unwired ? 'rgba(120,120,150,.22)'
          : b.seat || a.seat ? 'rgba(169,139,255,.2)' : 'rgba(150,150,190,.15)';
      ctx.lineWidth = hot ? 1.7 : 1;
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Busiest first, so a loaded room wins the label when two collide.
    const order = [...this.nodes].sort((a, b) => this.weight(b) - this.weight(a));
    const taken = [];

    for (const n of order) {
      const p = at.get(n);
      const hot = this.hover === n;
      const walking = this.moving(n);
      const pulse = walking && !this.still ? 1 + Math.sin(this.t * 5) * 0.13 : 1;
      const rad = Math.max(3, this.radius(n) * this.scale * pulse);

      if (walking || hot) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad + 7, 0, Math.PI * 2);
        ctx.fillStyle = `${n.colour}26`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.fillStyle = n.kind === 'tool' ? '#0d0d15' : n.colour;
      ctx.fill();
      ctx.lineWidth = n.kind === 'tool' ? 1.6 : hot ? 2 : 1;
      ctx.strokeStyle = n.kind === 'tool' ? n.colour : hot ? '#ffffff' : '#0b0b14';
      ctx.stroke();

      // A label nobody can read is worse than none, so one that would land
      // on a label already drawn is dropped — unless it is under the
      // pointer, which always wins and gets a plate to sit on.
      ctx.font = `${n.kind === 'tool' ? 500 : 600} 9.5px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const w = ctx.measureText(n.label).width;
      const box = { x: p.x - w / 2 - 3, y: p.y + rad + 3, w: w + 6, h: 12 };
      const clash = taken.some((t) => box.x < t.x + t.w && box.x + box.w > t.x
        && box.y < t.y + t.h && box.y + box.h > t.y);
      if (!hot && clash) continue;
      taken.push(box);
      if (hot) {
        ctx.fillStyle = 'rgba(11,11,20,.88)';
        ctx.fillRect(box.x, box.y, box.w, box.h);
      }
      ctx.fillStyle = hot ? '#eceaf5' : n.kind === 'tool' ? 'rgba(236,234,245,.5)' : 'rgba(236,234,245,.72)';
      ctx.fillText(n.label, p.x, box.y + 1);
    }
  }

  /** Label priority — the commander, then by how busy the room is. */
  weight(n) {
    if (n.agent === ARCANE) return 1000;
    if (n.kind === 'agent') return 100 + this.load(n) + (n.seat ? 20 : 0);
    return 10;
  }

  /* ---------- pointer ---------- */

  /** Nearest node under the pointer, compared in canvas space. */
  at(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = null;
    let bestD = Infinity;
    for (const n of this.nodes) {
      const p = this.project(n);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < this.radius(n) * this.scale + 9 && d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  /** A line of plain English about whatever is under the pointer. */
  caption(n) {
    if (!n) return '';
    if (n.kind === 'tool') {
      const reach = n.universal ? 'every agent' : `${n.users} agent${n.users === 1 ? '' : 's'}`;
      return `${n.tool.name} — ${n.tool.state} · reached by ${reach} · ${n.tool.note}`;
    }
    const room = ROOM_BY_ID[n.agent.room]?.name || n.agent.room;
    const open = this.load(n);
    const seat = n.agent.council ? ' · Council seat' : '';
    return `${n.label} · ${n.agent.role} — ${room}${seat} · ${open} open order${open === 1 ? '' : 's'}`;
  }
}
