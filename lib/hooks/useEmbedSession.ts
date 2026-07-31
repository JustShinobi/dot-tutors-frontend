"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { listMessages, openSession, streamChat, type ToolActivity } from "@/lib/api/embed";
import type { Citation, TutorPublicProfile } from "@/lib/types";

/**
 * Conversation state for the widget.
 *
 * The session token is kept in `sessionStorage`, never in a cookie: browsers block third-party
 * cookies inside an iframe (Safari's ITP, Chrome), so a cookie-based session would simply not
 * work for the integrator this product exists to serve. Storage is keyed by embed key and, in
 * modern browsers, partitioned per top-level site — so two host pages never share a session.
 *
 * Reusing a stored token also means reloading the host page keeps the conversation, while
 * closing the tab ends it. That is the honest lifetime for an anonymous widget.
 */

export type WidgetStatus = "connecting" | "ready" | "unavailable";

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  streaming?: boolean;
  failed?: boolean;
}

interface StoredSession {
  token: string;
  tutor: TutorPublicProfile;
}

interface Bootstrap {
  status: WidgetStatus;
  token: string | null;
  tutor: TutorPublicProfile | null;
  messages: UiMessage[];
  error: string | null;
}

const UNAVAILABLE: Bootstrap = {
  status: "unavailable",
  token: null,
  tutor: null,
  messages: [],
  error: null,
};

function storageKey(embedKey: string): string {
  return `dot-tutors.embed.${embedKey}`;
}

function readStored(embedKey: string): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(embedKey));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeStored(embedKey: string, session: StoredSession): void {
  try {
    window.sessionStorage.setItem(storageKey(embedKey), JSON.stringify(session));
  } catch {
    // Private mode can refuse writes; the session still works for this page load.
  }
}

function clearStored(embedKey: string): void {
  try {
    window.sessionStorage.removeItem(storageKey(embedKey));
  } catch {
    // ignore
  }
}

async function bootstrap(embedKey: string): Promise<Bootstrap> {
  const stored = readStored(embedKey);

  if (stored) {
    try {
      const history = await listMessages(stored.token);
      return {
        status: "ready",
        token: stored.token,
        tutor: stored.tutor,
        messages: history.map(toUiMessage),
        error: null,
      };
    } catch {
      // Expired or revoked: fall through and open a fresh session.
      clearStored(embedKey);
    }
  }

  try {
    const session = await openSession(embedKey);
    writeStored(embedKey, { token: session.session_token, tutor: session.tutor });
    return {
      status: "ready",
      token: session.session_token,
      tutor: session.tutor,
      messages: session.history.map(toUiMessage),
      error: null,
    };
  } catch (caught) {
    return {
      ...UNAVAILABLE,
      error: describeBootstrapFailure(caught),
    };
  }
}

function toUiMessage(message: {
  id: string;
  role: string;
  content: string;
  citations: Citation[] | null;
}): UiMessage {
  return {
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
    citations: message.citations ?? [],
  };
}

function describeBootstrapFailure(caught: unknown): string {
  const code = (caught as { code?: string })?.code;
  switch (code) {
    case "TUTOR_INACTIVE":
      return "Este tutor esta indisponivel no momento.";
    case "ORIGIN_NOT_ALLOWED":
      return "Este site nao esta autorizado a carregar o tutor.";
    case "EMBED_KEY_NOT_FOUND":
    case "EMBED_KEY_REVOKED":
      return "A chave de incorporacao e invalida ou foi revogada.";
    case "RATE_LIMITED":
      return "Muitas tentativas. Aguarde um instante e recarregue.";
    default:
      return "Nao foi possivel iniciar a conversa.";
  }
}

export function useEmbedSession(embedKey: string) {
  const [state, setState] = useState<Bootstrap>({
    status: "connecting",
    token: null,
    tutor: null,
    messages: [],
    error: null,
  });
  const [sending, setSending] = useState(false);
  const [activity, setActivity] = useState<ToolActivity | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    bootstrap(embedKey).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [embedKey]);

  const send = useCallback(
    async (text: string) => {
      const token = state.token;
      if (!token || sending) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      const userId = `local-user-${Date.now()}`;
      const assistantId = `local-assistant-${Date.now()}`;

      setState((current) => ({
        ...current,
        messages: [
          ...current.messages,
          { id: userId, role: "user", content: trimmed, citations: [] },
          { id: assistantId, role: "assistant", content: "", citations: [], streaming: true },
        ],
      }));
      setSending(true);
      setActivity(null);

      const controller = new AbortController();
      abortRef.current = controller;

      const patchAssistant = (update: Partial<UiMessage>) => {
        setState((current) => ({
          ...current,
          messages: current.messages.map((message) =>
            message.id === assistantId ? { ...message, ...update } : message,
          ),
        }));
      };

      await streamChat(
        token,
        trimmed,
        {
          onToken: (delta) => {
            setState((current) => ({
              ...current,
              messages: current.messages.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + delta }
                  : message,
              ),
            }));
          },
          onToolStarted: setActivity,
          onToolFinished: () => setActivity(null),
          onDone: ({ messageId, content, citations }) => {
            setState((current) => ({
              ...current,
              messages: current.messages.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      // Adopt the persisted id so a later reload keeps the same identity.
                      id: messageId ?? assistantId,
                      // The final payload is authoritative, but an empty one must not wipe
                      // the text already streamed.
                      content: content || message.content,
                      citations,
                      streaming: false,
                    }
                  : message,
              ),
            }));
            setActivity(null);
          },
          onError: ({ code, message }) => {
            if (code === "SESSION_EXPIRED") clearStored(embedKey);
            patchAssistant({ content: message, streaming: false, failed: true });
            setActivity(null);
          },
        },
        controller.signal,
      );

      setSending(false);
      abortRef.current = null;
    },
    [state.token, sending, embedKey],
  );

  return {
    status: state.status,
    tutor: state.tutor,
    messages: state.messages,
    error: state.error,
    sending,
    activity,
    send,
  };
}
