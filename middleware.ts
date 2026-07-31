import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-tutor framing policy for the widget.
 *
 * `Content-Security-Policy: frame-ancestors` is what actually stops an unauthorised site from
 * putting the widget in an iframe — and it is a *response header on the framed page*, so only
 * the server hosting that page can emit it. This is the reason the widget lives in this Next.js
 * app instead of a static bucket: the allowlist is per embed key and lives in the database, so
 * emitting the header requires a request-time lookup.
 *
 * It complements, rather than duplicates, the backend check: `frame-ancestors` stops the page
 * from *rendering* in a hostile site; `EmbedService.authorize` stops the session from *opening*.
 * The first is enforced by the browser, the second by the server. Neither alone is enough.
 *
 * **Why `script-src` is not locked down here.** An earlier version added `default-src 'self'`,
 * which looks thorough and silently broke the widget: it blocks the inline bootstrap scripts
 * Next.js injects for hydration, so the page froze on its server-rendered state and never
 * connected. Restricting scripts properly under Next requires per-request nonces threaded
 * through every script tag — real work, and listed in the README as a next step rather than
 * faked with a `'unsafe-inline'` that would grant back exactly what it pretends to restrict.
 */

const API_BASE_URL = (
  process.env.API_INTERNAL_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000"
).replace(/\/$/, "");

export const config = {
  matcher: "/embed/:embedKey*",
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const embedKey = request.nextUrl.pathname.split("/")[2];
  if (!embedKey) return response;

  const config = await fetchEmbedConfig(embedKey);
  const frameAncestors = resolveFrameAncestors(config);

  response.headers.set(
    "Content-Security-Policy",
    [
      // The directive that implements the requirement: who may frame this page.
      `frame-ancestors ${frameAncestors}`,
      // Cheap hardening that costs nothing here: the widget loads no plugins, has no forms
      // that post anywhere, and never needs to rewrite relative URLs.
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
    ].join("; "),
  );
  // Legacy header for browsers that predate frame-ancestors; ALLOW-FROM was never widely
  // supported, so the modern directive above is the one that does the work.
  response.headers.delete("X-Frame-Options");

  return response;
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
