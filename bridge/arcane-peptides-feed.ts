/**
 * Drop this into the Arcane Peptides app as
 *   app/api/leoos-feed/route.ts        (App Router)
 * or adapt it to pages/api/leoos-feed.ts (Pages Router).
 *
 * It is a READ. It selects, it never writes, and it exposes no customer
 * names, emails or addresses — only counts, totals and what is on the
 * shelf. Set ARCANE_FEED_KEY in the project's environment variables and
 * paste the same value into LEOOS under System → Arcane Peptides.
 *
 * Swap the three loaders below for however this app actually reads its
 * data (Prisma, Supabase, Drizzle, a plain SQL client). Nothing else
 * needs to change — LEOOS normalises the shapes it gets.
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
