import { NextResponse, type NextRequest } from "next/server";

/**
 * Framing policy and Content-Security-Policy for the widget page.
 *
 * **`frame-ancestors`** is what actually stops an unauthorised site from putting the widget in
 * an iframe — and it is a *response header on the framed page*, so only the server hosting that
 * page can emit it. This is the reason the widget lives in this Next.js app instead of a static
 * bucket: the allowlist is per embed key and lives in the database, so emitting the header
 * requires a request-time lookup.
 *
 * It complements, rather than duplicates, the backend check: `frame-ancestors` stops the page
 * from *rendering* in a hostile site; `EmbedService.authorize` stops the session from *opening*.
 * The first is enforced by the browser, the second by the server. Neither alone is enough.
 *
 * **`script-src` uses a per-request nonce.** An earlier version tried `default-src 'self'`,
 * which looks thorough and silently broke the page: it blocks the inline bootstrap scripts
 * Next.js injects for hydration, so the widget froze on its server-rendered state. The fix is
 * not `'unsafe-inline'` — that would grant back exactly what the directive promises to
 * restrict. It is a fresh nonce per request, forwarded to Next through the `x-nonce` header so
 * it can stamp every script tag it emits.
 */

const API_BASE_URL = (
  process.env.API_INTERNAL_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000"
).replace(/\/$/, "");

/** The browser talks to the API directly from inside the iframe, so it must be connect-able. */
const PUBLIC_API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

const IS_DEV = process.env.NODE_ENV !== "production";

export const config = {
  matcher: "/embed/:embedKey*",
};

export async function middleware(request: NextRequest) {
  const embedKey = request.nextUrl.pathname.split("/")[2];
  const nonce = generateNonce();

  const config = embedKey ? await fetchEmbedConfig(embedKey) : null;
  const policy = buildPolicy({ frameAncestors: resolveFrameAncestors(config), nonce });

  const requestHeaders = new Headers(request.headers);
  // Next parses the CSP from the *request* headers to find the nonce and stamp it on every
  // script tag it renders. Setting it only on the response would leave those scripts unnonced —
  // the browser would refuse them and the widget would freeze on its server-rendered state,
  // which is the same symptom the `default-src 'self'` attempt produced.
  requestHeaders.set("Content-Security-Policy", policy);
  // Exposed separately so the app can read it via `headers()` if it ever renders its own
  // inline script.
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  // ALLOW-FROM was never widely supported; `frame-ancestors` above is what does the work, and
  // leaving a stale X-Frame-Options would only override it with something coarser.
  response.headers.delete("X-Frame-Options");

  return response;
}

function generateNonce(): string {
  // Web Crypto: the Edge runtime has no Node `crypto` module.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function buildPolicy({ frameAncestors, nonce }: { frameAncestors: string; nonce: string }): string {
  const scriptSrc = [
    `'nonce-${nonce}'`,
    // Lets a modern browser trust scripts loaded *by* a nonced script, which is how Next pulls
    // in its chunks. Older browsers ignore it and fall back to the nonce alone.
    "'strict-dynamic'",
    // Ignored wherever 'strict-dynamic' is honoured; kept as the fallback for those that do not.
    "'self'",
    // React Fast Refresh compiles with eval in development only.
    ...(IS_DEV ? ["'unsafe-eval'"] : []),
  ];

  return [
    `frame-ancestors ${frameAncestors}`,
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    // Tailwind injects style tags at runtime; a nonce cannot cover those.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src 'self' ${PUBLIC_API_BASE_URL}${IS_DEV ? " ws: http://localhost:*" : ""}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

interface EmbedConfig {
  allowed_origins: string[];
  allows_any_origin: boolean;
}

/**
 * An empty allowlist and an unreachable backend are *not* the same thing, and collapsing them
 * would be a real bug: the first means "any origin" (the documented local-development escape
 * hatch), the second means "we do not know". Returning `null` on failure keeps them apart.
 */
async function fetchEmbedConfig(embedKey: string): Promise<EmbedConfig | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/embed/config?embed_key=${encodeURIComponent(embedKey)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!response.ok) return null;

    return (await response.json()) as EmbedConfig;
  } catch {
    return null;
  }
}

function resolveFrameAncestors(config: EmbedConfig | null): string {
  // Unknown key, or backend down: refuse to be framed. A misconfiguration must fail closed
  // rather than silently make the widget embeddable anywhere.
  if (config === null) return "'none'";

  if (config.allows_any_origin) return "*";
  return config.allowed_origins.length > 0 ? config.allowed_origins.join(" ") : "'none'";
}
