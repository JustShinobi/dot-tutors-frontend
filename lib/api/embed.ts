/**
 * Embed runtime client.
 *
 * Uses `fetch` + `ReadableStream` rather than `EventSource`, for one decisive reason:
 * `EventSource` can only issue GET requests and cannot set an `Authorization` header. The
 * session token would have to travel in the query string — logged by every proxy along the way.
 */

import type { ChatMessage, Citation, EmbedSession } from "@/lib/types";

import { API_BASE_URL, ApiError, apiFetch } from "./client";

export function openSession(embedKey: string): Promise<EmbedSession> {
  return apiFetch<EmbedSession>("/api/v1/embed/session", {
    method: "POST",
    body: { embed_key: embedKey },
  });
}

export function listMessages(sessionToken: string): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>("/api/v1/embed/messages", { token: sessionToken });
}

// --- streaming -------------------------------------------------------------

export interface ToolActivity {
  tool: string | null;
  source: string | null;
}

export interface ChatStreamHandlers {
  onToken: (delta: string) => void;
  onToolStarted: (activity: ToolActivity) => void;
  onToolFinished: (activity: ToolActivity) => void;
  onDone: (payload: { messageId: string | null; content: string; citations: Citation[] }) => void;
  onError: (error: { code: string; message: string }) => void;
}

interface SseFrame {
  event: string;
  data: string;
}

export async function streamChat(
  sessionToken: string,
  message: string,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/embed/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ message, stream: true }),
      signal,
    });
  } catch {
    handlers.onError({ code: "NETWORK_ERROR", message: "Sem conexao com o tutor." });
    return;
  }

  if (!response.ok || !response.body) {
    handlers.onError(await describeFailure(response));
    return;
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += value;
      // A chunk can end mid-frame, so only whole frames (terminated by a blank line) are
      // consumed; the remainder stays in the buffer for the next read.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const raw of frames) {
        const frame = parseFrame(raw);
        if (frame) dispatch(frame, handlers);
      }
    }
  } catch {
    if (!signal?.aborted) {
      handlers.onError({ code: "STREAM_INTERRUPTED", message: "A conexao foi interrompida." });
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(raw: string): SseFrame | null {
  if (!raw.trim()) return null;

  let event = "message";
  const dataLines: string[] = [];

  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }

  return dataLines.length > 0 ? { event, data: dataLines.join("\n") } : null;
}

function dispatch(frame: SseFrame, handlers: ChatStreamHandlers): void {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(frame.data) as Record<string, unknown>;
  } catch {
    return; // A malformed frame must not abort a conversation that is otherwise fine.
  }

  switch (frame.event) {
    case "token":
      handlers.onToken(String(payload.delta ?? ""));
      break;
    case "tool_started":
      handlers.onToolStarted(toActivity(payload));
      break;
    case "tool_finished":
      handlers.onToolFinished(toActivity(payload));
      break;
    case "done":
      handlers.onDone({
        messageId: (payload.message_id as string | null) ?? null,
        content: String(payload.content ?? ""),
        citations: (payload.citations as Citation[] | undefined) ?? [],
      });
      break;
    case "error":
      handlers.onError({
        code: String(payload.code ?? "AGENT_FAILED"),
        message: String(payload.message ?? "Nao foi possivel responder agora."),
      });
      break;
  }
}

function toActivity(payload: Record<string, unknown>): ToolActivity {
  return {
    tool: (payload.tool as string | null) ?? null,
    source: (payload.source as string | null) ?? null,
  };
}

async function describeFailure(response: Response): Promise<{ code: string; message: string }> {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    if (body.error?.message) {
      return {
        code: body.error.code ?? "HTTP_ERROR",
        message: body.error.message,
      };
    }
  } catch {
    // fall through to the generic message
  }
  return {
    code: `HTTP_${response.status}`,
    message: "Nao foi possivel falar com o tutor agora.",
  };
}

export { ApiError };
