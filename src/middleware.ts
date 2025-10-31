import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Compatibility shim for Next.js 16 "proxy.ts" rename.
 *
 * OpenNext (<= 1.11.0) currently expects a `middleware` entrypoint. When you
 * rename your file to `proxy.ts` (Next 16), OpenNext's generated handler may
 * fail because it doesn't find the legacy `middleware` file. To remain
 * compatible with both setups, this shim dynamically imports `./proxy` (if
 * present) and delegates calls to it. If no proxy is present, it falls back to
 * a no-op pass-through response.
 */

export async function middleware(request: NextRequest) {
  try {
    // Try to load the Next 16 `proxy.ts` module and delegate to any exported
    // handler (`middleware`, `proxy`, or default). This uses dynamic import so
    // build-time bundlers will still include this file but runtime will only
    // attempt to load `./proxy` when the middleware runs.
    const mod = await import('./proxy').catch(() => null) as any;

    if (mod) {
      if (typeof mod.middleware === 'function') return mod.middleware(request);
      if (typeof mod.proxy === 'function') return mod.proxy(request);
      if (typeof mod.default === 'function') return mod.default(request);
    }
  } catch (err) {
    // If anything goes wrong, fall through to the default pass-through.
    // We don't want middleware errors to block pages during deployment.
    // eslint-disable-next-line no-console
    console.warn('middleware shim: delegating to proxy failed', err);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};