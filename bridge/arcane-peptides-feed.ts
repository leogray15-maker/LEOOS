/**
 * REFERENCE ONLY — this is now implemented.
 *
 * The live route is `app/api/leoos-feed/route.ts` in the arcane-peptides repo.
 * It reads Firestore with the Admin SDK, checks `x-arcane-key` against
 * `ARCANE_FEED_KEY`, and scopes CORS with `LEOOS_ORIGIN`. This file stays as
 * the written contract: the shape below is what `src/core/bridge.js` reads,
 * and any other shop can be wired up by matching it.
 *
 * One convention worth knowing: a stock row may omit `vials` (or send null)
 * when the shop doesn't count stock. That is "I don't know", not zero, and
 * LEOOS leaves the hand count in THE LAB alone. Send a number only when the
 * shop genuinely knows it.
 *
 * It is a READ. It selects, it never writes, and it exposes no customer
 * names, emails or addresses — only counts, totals and what is on the shelf.
 *
 * Swap the three loaders below for however a shop actually reads its data
 * (Prisma, Supabase, Drizzle, a plain SQL client). Nothing else needs to
 * change — LEOOS normalises the shapes it gets.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';   // never cache a live feed

/** LEOOS runs on a different origin, so the browser needs this. */
const cors = {
  'Access-Control-Allow-Origin': process.env.LEOOS_ORIGIN ?? '*',
  'Access-Control-Allow-Headers': 'x-arcane-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET(req: NextRequest) {
  const expected = process.env.ARCANE_FEED_KEY;
  if (!expected) {
    return NextResponse.json({ error: 'ARCANE_FEED_KEY is not set' }, { status: 500, headers: cors });
  }
  if (req.headers.get('x-arcane-key') !== expected) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401, headers: cors });
  }

  const [orders, products, customerCount] = await Promise.all([
    loadOrders(),
    loadProducts(),
    countCustomers(),
  ]);

  const paid = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded');

  return NextResponse.json({
    currency: 'GBP',
    revenue: round2(paid.reduce((n, o) => n + o.total, 0)),
    orderCount: paid.length,
    pending: orders.filter((o) => o.status === 'pending' || o.status === 'paid').length,
    customers: customerCount,

    // What is on the shelf. LEOOS shows these in THE LAB.
    stock: products.map((p) => ({
      code: p.name,
      size: p.size ?? '',
      vials: p.stock ?? 0,
      batch: p.batch ?? '',
      coa: p.coaUrl ? 'published' : 'none',
    })),

    // The order queue. LEOOS shows these under Dispatch. Reference and
    // line items only — no names, no addresses.
    orders: orders.slice(0, 40).map((o) => ({
      ref: o.reference ?? `#${o.id}`,
      items: o.items.map((i) => `${i.quantity}× ${i.name}`).join(', '),
      stage: o.status,
      total: round2(o.total),
    })),
  }, { headers: cors });
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ---------------------------------------------------------------------
 * Replace these three with the app's real data access.
 * ------------------------------------------------------------------ */

type Order = {
  id: string | number;
  reference?: string;
  status: string;
  total: number;
  items: { name: string; quantity: number }[];
};
type Product = {
  name: string; size?: string; stock?: number; batch?: string; coaUrl?: string | null;
};

async function loadOrders(): Promise<Order[]> {
  // e.g. return prisma.order.findMany({
  //   orderBy: { createdAt: 'desc' }, take: 200, include: { items: true },
  // });
  throw new Error('loadOrders: wire this to the shop database');
}

async function loadProducts(): Promise<Product[]> {
  // e.g. return prisma.product.findMany({ orderBy: { name: 'asc' } });
  throw new Error('loadProducts: wire this to the shop database');
}

async function countCustomers(): Promise<number> {
  // e.g. return prisma.customer.count();
  throw new Error('countCustomers: wire this to the shop database');
}
