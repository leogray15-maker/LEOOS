/**
 * Room widgets — the bespoke panel each room carries on top of its orders,
 * crew and goals — and the Arcane Peptides bridge that feeds two of them.
 *
 * Second link in the chain: UIScreens → UIWidgets → UI.
 */

import { UIScreens } from './screens.js';
import { parseFeed, pullFeed } from '../core/bridge.js';
import { BUILD_QUEUE, COHORTS, DISPATCH, DOCTRINE, MANUSCRIPTS, PDF_PRODUCTS, PROTOCOL, ROOM_WIDGET } from '../config/roomdata.js';
import { $, PLATFORM_CLASS, clockTime, esc, meter, money, num } from './format.js';

export class UIWidgets extends UIScreens {
  /* ================= room widgets ================= */

  /** The room-specific dashboard. Each room does a different job. */
  roomWidget(roomId) {
    switch (ROOM_WIDGET[roomId]) {
      case 'door': return this.wDoor(roomId);
      case 'lab': return this.wLab();
      case 'market': return this.wMarket();
      case 'library': return this.wLibrary();
      case 'cohorts': return this.wCohorts();
      case 'build': return this.wBuild();
      case 'manuscripts': return this.wManuscripts();
      case 'protocol': return this.wProtocol();
      case 'signals': return this.wSignals();
      case 'treasury': return this.wTreasury();
      case 'doctrine': return this.wDoctrine();
      default: return '';
    }
  }

  srcNote(text) { return `<p class="src-note"><span class="chip is-seed">placeholder</span> ${esc(text)}</p>`; }

  /**
   * A room whose work is done on a full screen. One door, named, rather
   * than a second copy of the tool rendered into a side panel.
   */
  wDoor(roomId) {
    const door = {
      council: {
        screen: 'council', label: 'Convene the Council',
        note: 'Nine seats deliberate on one real decision and the Commander returns a verdict. It needs the width of a full screen, so it opens as one.',
      },
      garage: {
        screen: 'agents', label: 'Open the roster',
        note: 'Where the network is read and configured — every agent, its domain, the tools it reaches and what it must ask you before doing.',
      },
      control: {
        screen: 'control', label: 'Open the permission matrix',
        note: 'Every agent graded against every capability. The grid is too wide for this panel, so it opens as a full screen.',
      },
    }[roomId];
    if (!door) return '';
    return `
      <h3 class="sub-title">The work of this room</h3>
      <p class="muted-note">${esc(door.note)}</p>
      <button class="wide-btn" type="button" data-goscreen="${door.screen}">${esc(door.label)} →</button>`;
  }

  wLab() {
    const coaChip = { published: 'is-vital', pending: 'is-flare', none: 'is-breach' };
    const rows = this.store.stock();
    const low = this.store.lowStock().length;
    // A line nobody has counted is not a line with zero vials. The shelf
    // ships blank on purpose, so "0" here would be an invented figure.
    const uncounted = this.store.uncounted().length;
    const feed = this.store.feed();
    const fed = rows.filter((r) => r.src === 'peptides').length;
    return `
      <h3 class="sub-title">Stock</h3>
      ${feed
        ? `<p class="src-note"><span class="chip is-vital">live</span> ${fed} line${fed === 1 ? '' : 's'} from Arcane Peptides, pulled ${esc(clockTime(feed.fetchedAt))}. Hand counts below are yours and are left alone.</p>`
        : '<p class="muted-note">Counted here, saved on this device. Type a count, or tap −/+ as vials move. Click the COA chip to cycle none → pending → published.</p>'}
      <div class="stat-row">
        <div class="stat"><span class="stat-n mono">${rows.length}</span><span class="stat-l">Lines</span></div>
        <div class="stat"><span class="stat-n mono is-arcane">${this.store.totalVials()}</span><span class="stat-l">Vials on hand</span></div>
        <div class="stat"><span class="stat-n mono ${low ? 'is-flare' : 'dim'}">${low}</span><span class="stat-l">Running low</span></div>
        ${uncounted ? `<div class="stat"><span class="stat-n mono is-flare">${uncounted}</span><span class="stat-l">Never counted</span></div>` : ''}
      </div>
      <div class="stock-list">
        ${rows.map((r) => `
          <div class="stock-line">
            <span class="stock-name">
              <i class="vial is-${esc(r.tint)}"></i>${esc(r.code)}
              ${r.src === 'peptides' ? '<i class="live-dot" title="From Arcane Peptides"></i>' : ''}
            </span>
            <span class="step">
              <button class="step-btn" type="button" data-stockstep="${r.id}" data-delta="-1"
                      aria-label="One ${esc(r.code)} out">&minus;</button>
              <input class="cell-in is-count mono ${!r.counted || r.vials === 0 ? 'dim' : r.vials < 12 ? 'is-flare' : ''}"
                     type="number" min="0" step="1" value="${r.counted ? r.vials : ''}" placeholder="—"
                     data-stock="${r.id}" data-field="vials"
                     aria-label="${esc(r.code)} vials${r.counted ? '' : ', never counted'}">
              <button class="step-btn" type="button" data-stockstep="${r.id}" data-delta="1"
                      aria-label="One ${esc(r.code)} in">+</button>
            </span>
            <button class="row-x" type="button" data-stockdrop="${r.id}"
                    aria-label="Close the ${esc(r.code)} line">&times;</button>
            <span class="stock-meta">
              <input class="cell-in is-size mono" type="text" value="${esc(r.size)}"
                     data-stock="${r.id}" data-field="size" aria-label="${esc(r.code)} size">
              <input class="cell-in is-batch mono" type="text" value="${esc(r.batch)}"
                     data-stock="${r.id}" data-field="batch" aria-label="${esc(r.code)} batch">
              <button class="chip is-coa ${coaChip[r.coa] || ''}" type="button" data-coa="${r.id}"
                      aria-label="${esc(r.code)} certificate of analysis: ${esc(r.coa)}. Click to change.">${esc(r.coa)}</button>
            </span>
          </div>`).join('')}
      </div>
      ${rows.length ? '' : '<p class="muted-note">No stock lines. Add the first below.</p>'}
      <form class="add-row is-stock" data-stockadd="1">
        <input type="text" name="code" placeholder="Compound (e.g. GHK-Cu)" maxlength="40" autocomplete="off">
        <input type="text" name="size" placeholder="Size" maxlength="16" autocomplete="off">
        <input type="number" name="vials" placeholder="Vials" min="0" step="1">
        <button type="submit">Add stock</button>
      </form>
      ${low ? `<p class="warn-note">${low} line${low === 1 ? '' : 's'} under two weeks of cover.</p>` : ''}
      ${uncounted ? `<p class="muted-note">${uncounted} line${uncounted === 1 ? '' : 's'} have never been counted — they read &mdash;, not zero. Type a count, or connect the shop.</p>` : ''}
      ${feed
        ? '<button class="wide-btn" type="button" data-bridgepull="1">Pull from Arcane Peptides</button>'
        : '<button class="wide-btn" type="button" data-goscreen="system">Connect Arcane Peptides</button>'}

      <h3 class="sub-title">Dispatch</h3>
      ${this.dispatchForm()}
      ${feed ? `
        <p class="src-note"><span class="chip is-vital">live</span> ${feed.dispatch.length} order${feed.dispatch.length === 1 ? '' : 's'} from the shop</p>
        <div class="tbl">
          ${feed.dispatch.slice(0, 12).map((r) => `
            <div class="tbl-row is-2">
              <span class="mono dim">${esc(r.ref)}</span>
              <span>${esc(r.items)}</span>
              <span class="chip ${/pend|unfulfil|await/i.test(r.stage) ? 'is-flare' : 'is-vital'}">${esc(r.stage)}</span>
            </div>`).join('') || '<div class="tbl-row is-2"><span class="mono dim">—</span><span>Nothing waiting.</span><span></span></div>'}
        </div>`
      : `
        ${this.srcNote(DISPATCH.source)}
        <p class="muted-note">${esc(DISPATCH.note)}</p>
        <div class="tbl">
          ${DISPATCH.rows.map((r) => `
            <div class="tbl-row is-2">
              <span class="mono dim">${esc(r.ref)}</span>
              <span>${esc(r.items)}</span>
              <span class="chip">${esc(r.stage)}</span>
            </div>`).join('')}
        </div>`}`;
  }

  /**
   * Ship off the shelf and book it, in one action.
   *
   * Only offers lines that can actually go out — counted, in stock, COA
   * published, and not fed by the shop, which owns its own decrements.
   * Everything else is named with the reason it cannot ship, so the room
   * says what is blocking dispatch rather than hiding the option.
   */
  dispatchForm() {
    const ready = this.store.dispatchable();
    const note = this.dispatchNote;
    const blocked = [
      ...this.store.blockedByCoa().map((r) => `${r.code} — COA ${r.coa}`),
      ...this.store.outOfStock().map((r) => `${r.code} — none on the shelf`),
      ...this.store.uncounted().map((r) => `${r.code} — never counted`),
    ];
    return `
      ${ready.length ? `
        <form class="add-row is-dispatch" data-dispatch="1">
          <select name="line" aria-label="Compound to dispatch">
            ${ready.map((r) => `<option value="${r.id}">${esc(r.code)} · ${r.vials} on hand</option>`).join('')}
          </select>
          <input type="number" name="qty" placeholder="Vials" min="1" step="1" aria-label="Vials out">
          <input type="number" name="value" placeholder="£ value" min="0" step="0.01" aria-label="Order value">
          <button type="submit">Dispatch</button>
        </form>
        <p class="muted-note">Takes the vials off the shelf and books the value to THE VAULT in one step.</p>`
        : '<p class="muted-note">Nothing can ship yet — a line has to be counted, in stock and COA published.</p>'}
      ${note ? `<p class="${note.ok ? 'src-note' : 'warn-note'}" data-dispatchnote="1">${esc(note.text)}</p>` : ''}
      ${blocked.length ? `<p class="muted-note">Not dispatchable: ${esc(blocked.join(' · '))}.</p>` : ''}`;
  }

  wLibrary() {
    const stageChip = { live: 'is-vital', draft: 'is-flare', idea: '' };
    const live = PDF_PRODUCTS.rows.filter((r) => r.stage === 'live');
    const potential = PDF_PRODUCTS.rows.reduce((n, r) => n + (r.price || 0), 0);
    return `
      <h3 class="sub-title">PDF products</h3>
      ${this.srcNote(PDF_PRODUCTS.source)}
      <div class="stat-row">
        <div class="stat"><span class="stat-n mono is-vital">${live.length}</span><span class="stat-l">Live</span></div>
        <div class="stat"><span class="stat-n mono">${PDF_PRODUCTS.rows.length}</span><span class="stat-l">In the catalogue</span></div>
        <div class="stat"><span class="stat-n mono is-arcane">${money(potential, 2)}</span><span class="stat-l">Full set price</span></div>
      </div>
      <div class="tbl" style="margin-top:12px">
        ${PDF_PRODUCTS.rows.map((r) => `
          <div class="tbl-row is-pdf">
            <span>
              <span class="tbl-title">${esc(r.title)}</span><br>
              <span class="tbl-from">from ${esc(r.from)} · ${r.pages}pp</span>
            </span>
            <span class="mono">${r.price ? money(r.price, 2) : '—'}</span>
            <span class="chip ${stageChip[r.stage] || ''}">${esc(r.stage)}</span>
          </div>`).join('')}
      </div>
      <p class="muted-note" style="margin-top:10px">Every title above is cut from a module you already wrote. The Signal Forge picks the modules; this is where they become something to sell.</p>`;
  }

  wCohorts() {
    return `
      <h3 class="sub-title">Members</h3>
      ${this.srcNote(COHORTS.source)}
      <div class="tbl">
        ${COHORTS.rows.map((r) => `
          <div class="tbl-row is-2">
            <span>${esc(r.label)}</span>
            <span class="muted-note">${esc(r.note)}</span>
            <span class="mono ${r.count ? '' : 'dim'}">${r.count || '—'}</span>
          </div>`).join('')}
      </div>`;
  }

  wBuild() {
    const chip = { building: 'is-arcane', queued: 'is-flare', shipped: 'is-vital', idea: '' };
    return `
      <h3 class="sub-title">Build queue</h3>
      ${this.srcNote(BUILD_QUEUE.source)}
      <div class="tbl">
        ${BUILD_QUEUE.rows.map((r) => `
          <div class="tbl-row is-2">
            <span>${esc(r.item)}</span>
            <span class="muted-note">${esc(r.target)}</span>
            <span class="chip ${chip[r.stage] || ''}">${esc(r.stage)}</span>
          </div>`).join('')}
      </div>`;
  }

  wManuscripts() {
    const chip = { live: 'is-vital', proofing: 'is-flare', drafting: '' };
    return `
      <h3 class="sub-title">The Codex</h3>
      ${MANUSCRIPTS.rows.map((r) => `
        <div class="goal">
          <div class="goal-top">
            <span class="goal-name">${esc(r.title)}${r.price ? ` <span class="mono dim">${money(r.price, 2)}</span>` : ''}</span>
            <span class="chip ${chip[r.stage] || ''}">${esc(r.stage)}</span>
          </div>
          ${meter(r.pct / 100, r.stage === 'live' ? 'vital' : 'breach')}
        </div>`).join('')}`;
  }

  wProtocol() {
    return `
      <h3 class="sub-title">Daily protocol</h3>
      <p class="muted-note">${esc(PROTOCOL.source)}</p>
      <div class="tbl" style="margin-top:10px">
        ${PROTOCOL.rows.map((r) => `
          <div class="tbl-row is-2">
            <span>${esc(r.item)}</span>
            <span class="muted-note">${esc(r.unit)}</span>
            <span class="mono is-vital">${num(r.target)}</span>
          </div>`).join('')}
      </div>`;
  }

  wSignals() {
    const drafts = this.store.drafts().slice(0, 3);
    return `
      <h3 class="sub-title">Signal queue</h3>
      ${drafts.length ? drafts.map((d) => `
        <article class="signal-card">
          <div class="signal-card-top">
            <span class="chip is-${PLATFORM_CLASS[d.platform] || 'ash'}">${esc(d.platform)}</span>
            <span class="signal-card-src">${esc(d.course || '')}</span>
          </div>
          <p class="signal-card-hook">${esc(d.hook)}</p>
          <pre class="signal-card-body">${esc(d.post)}</pre>
          <div class="signal-card-acts">
            <button class="act is-primary" type="button" data-copy="${d.id}">Copy</button>
            <span class="signal-card-spacer"></span>
            <button class="act" type="button" data-posted="${d.id}">Posted</button>
            <button class="act is-quiet" type="button" data-kill="${d.id}">Kill</button>
          </div>
        </article>`).join('')
        : '<p class="muted-note">No drafts standing. The Signal Forge writes three every morning.</p>'}`;
  }

  wTreasury() {
    const allocs = this.store.allocations();
    const run = this.store.runwayMonths();
    return `
      <h3 class="sub-title">This month</h3>
      <div class="stat-row">
        <div class="stat"><span class="stat-n mono is-arcane">${money(this.store.monthlyRevenue())}</span><span class="stat-l">Revenue</span></div>
        <div class="stat"><span class="stat-n mono is-breach">${money(this.store.monthlyFixed())}</span><span class="stat-l">Fixed</span></div>
        <div class="stat"><span class="stat-n mono is-gold">${run === null ? '—' : run.toFixed(1)}</span><span class="stat-l">Runway (mo)</span></div>
      </div>
      <h3 class="sub-title">The split</h3>
      ${allocs.map((a) => `
        <div class="mini-alloc">
          <span class="mini-name">${esc(a.name)} <span class="dim mono">${a.pct}%</span></span>
          <span class="mini-amt mono is-${a.accent}">${money(a.amount)}</span>
        </div>`).join('')}
      <button class="back-btn" type="button" data-goscreen="ledger" style="margin-top:12px">Open the full Ledger →</button>`;
  }

  wDoctrine() {
    return `
      <h3 class="sub-title">Standing doctrine</h3>
      ${DOCTRINE.map((d) => `<p class="doctrine">${esc(d)}</p>`).join('')}
      <button class="back-btn" type="button" data-goscreen="goals" style="margin-top:10px">Open all goals →</button>`;
  }


  /* ================= arcane peptides bridge ================= */

  bridgeBlock() {
    const b = this.store.bridge();
    const feed = b.feed;
    const state = b.error ? 'is-breach' : feed ? 'is-vital' : 'is-flare';
    const word = b.error ? 'error' : feed ? 'connected' : b.url ? 'not pulled yet' : 'not set up';
    return `
      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">Arcane Peptides</h3>
          <span class="chip ${state}">${word}</span></div>
        <p class="muted-note">Read-only. LEOOS pulls orders, revenue, customers and stock from the shop
          and fills THE LAB and THE MARKET with them. It never writes anything back.</p>
        <form class="bridge-form" data-bridgesave="1">
          <label class="field-l" for="bridgeUrl">Feed URL</label>
          <input id="bridgeUrl" type="url" name="url" autocomplete="off" spellcheck="false"
                 placeholder="https://arcanepeptides.vercel.app/api/leoos-feed"
                 value="${esc(b.url)}">
          <label class="field-l" for="bridgeKey">Read key</label>
          <input id="bridgeKey" type="password" name="key" autocomplete="off"
                 placeholder="the ARCANE_FEED_KEY you set on the shop" value="${esc(b.key)}">
          <div class="bridge-btns">
            <button type="submit">Save</button>
            <button type="button" data-bridgepull="1">Pull now</button>
            ${feed ? '<button type="button" class="is-quiet" data-bridgeclear="1">Disconnect</button>' : ''}
          </div>
        </form>
        ${b.error ? `<p class="warn-note">${esc(b.error)}</p>` : ''}
        ${!b.error && this.bridgeHint ? `<p class="muted-note" style="margin-top:8px">${esc(this.bridgeHint)}</p>` : ''}
        ${feed ? `
          <div class="stat-row" style="margin-top:12px">
            <div class="stat"><span class="stat-n mono is-arcane">${money(feed.revenue, 2)}</span><span class="stat-l">Revenue</span></div>
            <div class="stat"><span class="stat-n mono">${feed.orderCount}</span><span class="stat-l">Orders</span></div>
            <div class="stat"><span class="stat-n mono ${feed.pending ? 'is-flare' : 'dim'}">${feed.pending}</span><span class="stat-l">Pending</span></div>
            <div class="stat"><span class="stat-n mono">${feed.customers}</span><span class="stat-l">Customers</span></div>
          </div>
          <p class="src-note"><span class="chip is-vital">live</span> Last pull ${esc(clockTime(b.last))} · ${feed.stock.length} stock line${feed.stock.length === 1 ? '' : 's'}</p>`
        : ''}
        <details class="bridge-paste" data-pastebox="1" ${this.pasteOpen ? 'open' : ''}>
          <summary>Paste feed instead</summary>
          <p class="muted-note">On claude.ai this page cannot call out to the shop, so open the feed URL
            in a tab, copy the JSON, and drop it here.</p>
          <form data-bridgepaste="1">
            <textarea name="json" rows="4" placeholder='{"revenue":1420.02,"orders":[…],"stock":[…]}'>${esc(this.pasteDraft || '')}</textarea>
            <button type="submit">Import</button>
          </form>
        </details>
      </section>`;
  }

  async pullBridge() {
    const b = this.store.bridge();
    if (!b.url) {
      // Nothing typed yet. That is a setup step, not a failure — the
      // placeholder in the field looks like a value, so say what to do.
      this.store.bridgeError('');
      this.bridgeHint = 'Paste the feed URL from the shop, then Save.';
      this.render();
      return;
    }
    this.bridgeHint = '';
    this.store.bridgeError('');
    this.bridgeBusy = true;
    this.render();
    try {
      const feed = await pullFeed(b.url, b.key);
      this.store.applyFeed(feed);
      this.bridgeHint = '';
    } catch (e) {
      this.store.bridgeError(e?.message || 'The pull failed.');
    }
    this.bridgeBusy = false;
    this.render();
  }

  importBridge(raw) {
    try {
      this.store.applyFeed(parseFeed(raw));
      this.pasteOpen = false;
      this.pasteDraft = '';
    } catch (e) {
      // Hold on to what was pasted — losing it to a re-render is worse
      // than the error that caused it.
      this.store.bridgeError(e?.message || 'That feed could not be read.');
      this.pasteOpen = true;
      this.pasteDraft = String(raw || '').slice(0, 200000);
    }
    this.render();
  }

  /* ================= the market ================= */

  wMarket() {
    const feed = this.store.feed();
    if (!feed) {
      return `
        <h3 class="sub-title">The funnel</h3>
        ${this.srcNote('Not connected. Open System → Arcane Peptides and point this at the shop.')}
        <p class="muted-note">Once the feed is in, this room shows real visitors, orders,
          repeat rate and average order value — straight from arcanepeptides.vercel.app.</p>
        <button class="wide-btn" type="button" data-goscreen="system">Connect the shop</button>`;
    }
    const aov = feed.orderCount ? feed.revenue / feed.orderCount : 0;
    const perCustomer = feed.customers ? feed.orderCount / feed.customers : 0;
    const conv = feed.visitors ? (feed.orderCount / feed.visitors) * 100 : null;
    return `
      <h3 class="sub-title">The funnel</h3>
      <p class="src-note"><span class="chip is-vital">live</span> Arcane Peptides · pulled ${esc(clockTime(feed.fetchedAt))}</p>
      <div class="stat-row">
        <div class="stat"><span class="stat-n mono is-arcane">${money(feed.revenue, 2)}</span><span class="stat-l">Revenue</span></div>
        <div class="stat"><span class="stat-n mono">${feed.orderCount}</span><span class="stat-l">Orders</span></div>
        <div class="stat"><span class="stat-n mono">${feed.customers}</span><span class="stat-l">Customers</span></div>
      </div>
      <div class="stat-row">
        <div class="stat"><span class="stat-n mono">${money(aov, 2)}</span><span class="stat-l">Average order</span></div>
        <div class="stat"><span class="stat-n mono">${perCustomer.toFixed(2)}</span><span class="stat-l">Orders per customer</span></div>
        <div class="stat"><span class="stat-n mono ${conv === null ? 'dim' : ''}">${conv === null ? '—' : `${conv.toFixed(1)}%`}</span><span class="stat-l">Visitor → order</span></div>
      </div>
      ${feed.pending ? `<p class="warn-note">${feed.pending} order${feed.pending === 1 ? '' : 's'} waiting to be packed.</p>` : ''}
      <h3 class="sub-title">Latest orders</h3>
      <div class="tbl">
        ${feed.dispatch.slice(0, 10).map((r) => `
          <div class="tbl-row is-2">
            <span class="mono dim">${esc(r.ref)}</span>
            <span>${esc(r.items)}</span>
            <span class="chip">${esc(r.stage)}</span>
          </div>`).join('') || '<div class="tbl-row is-2"><span class="mono dim">—</span><span>No orders in the feed.</span><span></span></div>'}
      </div>
      <button class="wide-btn" type="button" data-bridgepull="1">Pull again</button>`;
  }

}
