import type { Page, Route } from "@playwright/test";

/**
 * Stubs the backend for the browser tests.
 *
 * Everything the widget needs is served from here, including a real `text/event-stream` body,
 * so the SSE parsing, the tool-activity line and the incremental rendering are exercised for
 * real — only the server and the model are replaced.
 */

export const EMBED_KEY = "pk_live_e2e";
export const TUTOR_TITLE = "Tutor de Politicas";

export interface FakeBackendOptions {
  /** Frames sent for `POST /embed/chat`, in order. */
  chatFrames?: string[];
  /** Makes `POST /embed/session` fail with this status and code. */
  sessionFailure?: { status: number; code: string; message: string };
}

const DEFAULT_CHAT_FRAMES = [
  'event: tool_started\ndata: {"tool":"search_source","source":"src-1"}\n\n',
  'event: tool_finished\ndata: {"tool":"search_source","source":"src-1"}\n\n',
  'event: token\ndata: {"delta":"O auxilio home office "}\n\n',
  'event: token\ndata: {"delta":"e de R$ 150,00 por mes."}\n\n',
  'event: done\ndata: {"message_id":"msg-1","content":"O auxilio home office e de R$ 150,00 por mes.","citations":[{"source_id":"src-1","label":"Politica de trabalho remoto","url":null,"snippet":"R$ 150,00"}],"tool_calls":[{"name":"search_source","source":"src-1","duration_ms":12,"ok":true}]}\n\n',
];

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    contentType: "application/json",
    // The widget calls the API cross-document from inside the iframe; without these the
    // browser would block the read and the test would fail for the wrong reason.
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(body),
  });
}

export async function installFakeBackend(
  page: Page,
  options: FakeBackendOptions = {},
): Promise<void> {
  const { chatFrames = DEFAULT_CHAT_FRAMES, sessionFailure } = options;

  await page.route("**/api/v1/embed/session", (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: preflightHeaders() });
    }
    if (sessionFailure) {
      return json(route, sessionFailure.status, {
        error: { code: sessionFailure.code, message: sessionFailure.message },
      });
    }
    return json(route, 201, {
      session_token: "token-de-teste",
      token_type: "bearer",
      expires_in: 1800,
      tutor: {
        id: "tutor-1",
        title: TUTOR_TITLE,
        description: "Responde sobre ferias e home office.",
        greeting: "Oi! Posso ajudar com duvidas sobre as politicas.",
      },
      history: [],
    });
  });

  await page.route("**/api/v1/embed/messages**", (route) => json(route, 200, []));

  await page.route("**/api/v1/embed/chat", (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: preflightHeaders() });
    }
    return route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
        "access-control-allow-origin": "*",
      },
      body: chatFrames.join(""),
    });
  });
}

function preflightHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Authorization, Content-Type",
  };
}
