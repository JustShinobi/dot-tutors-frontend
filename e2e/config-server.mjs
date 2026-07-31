/**
 * Minimal stand-in for `GET /api/v1/embed/config`.
 *
 * This endpoint is consumed by the Next **middleware**, which runs on the server — so
 * Playwright's `page.route` cannot intercept it (that only sees browser traffic). Discovering
 * that is the reason this file exists: without a real listener the middleware's fetch fails,
 * the policy falls back to `frame-ancestors 'none'` (correctly, it fails closed) and every
 * iframe test fails for a reason that has nothing to do with what it is testing.
 *
 * The browser-side endpoints stay in `fake-backend.ts`, where each test can vary them.
 */

import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_BACKEND_PORT ?? 8000);
const KNOWN_KEY = "pk_live_e2e";
const ALLOWED_ORIGINS = [process.env.E2E_HOST_ORIGIN ?? "http://localhost:3100"];

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${PORT}`);

  if (url.pathname === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (url.pathname === "/api/v1/embed/config") {
    const key = url.searchParams.get("embed_key");

    if (key !== KNOWN_KEY) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { code: "EMBED_KEY_NOT_FOUND" } }));
      return;
    }

    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        allowed_origins: ALLOWED_ORIGINS,
        allows_any_origin: false,
        is_active: true,
      }),
    );
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: { code: "NOT_FOUND" } }));
});

server.listen(PORT, () => {
  console.log(`fake config server on http://localhost:${PORT}`);
});
