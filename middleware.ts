import { NextRequest, NextResponse } from 'next/server';

// Token bucket rate limiter
// Capacity: 40, refill: 5 tokens every 5 seconds per IP
const CAPACITY = 40;
const REFILL_AMOUNT = 5;
const REFILL_INTERVAL_MS = 5000;

const buckets = new Map<string, { tokens: number; lastRefill: number }>();

function consumeToken(ip: string): boolean {
  const now = Date.now();
  let bucket = buckets.get(ip);

  if (!bucket) {
    buckets.set(ip, { tokens: CAPACITY - 1, lastRefill: now });
    return true;
  }

  const refills = Math.floor((now - bucket.lastRefill) / REFILL_INTERVAL_MS);
  if (refills > 0) {
    bucket.tokens = Math.min(CAPACITY, bucket.tokens + refills * REFILL_AMOUNT);
    bucket.lastRefill += refills * REFILL_INTERVAL_MS;
  }

  if (bucket.tokens <= 0) return false;
  bucket.tokens--;
  return true;
}

export function middleware(req: NextRequest) {
  // Apply rate limiting to API routes only
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!consumeToken(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const localhost = isDev ? ' http://localhost:* ws://localhost:*' : '';

  const csp = [
    "default-src 'self'",
    // unsafe-inline is ignored by CSP Level 3 browsers when a nonce is present,
    // but keeps older browsers working
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' res.cloudinary.com cdn.jsdelivr.net data: blob:${localhost}`,
    `connect-src 'self' ws: wss:${localhost}`,
    `font-src 'self'${localhost}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
