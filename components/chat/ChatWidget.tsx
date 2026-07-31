"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { useAutoResize } from "@/lib/hooks/useAutoResize";
import { useEmbedSession } from "@/lib/hooks/useEmbedSession";

import { MessageBubble } from "./MessageBubble";
import { ToolActivityLine } from "./ToolActivityLine";

const MAX_MESSAGE_CHARS = 2_000;

/**
 * The whole widget, rendered alone inside the integrator's iframe (PRD 4.2.1).
 *
 * Fills the iframe exactly: the message list scrolls, the composer stays put. Nothing here
 * links out to the admin or assumes a page around it.
 */
export function ChatWidget({ embedKey }: { embedKey: string }) {
  const { status, tutor, messages, error, sending, activity, send, retry } =
    useEmbedSession(embedKey);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Optional for the host: ignoring the message keeps the fixed height from the snippet.
  // Enabled only once the conversation is on screen: while connecting, the component renders a
  // different tree and the refs below point at nothing.
  useAutoResize({
    embedKey,
    scrollRef: listRef,
    contentRef,
    chromeRefs: [headerRef, composerRef],
    enabled: status === "ready",
  });

  // Follow the conversation as it grows, including while tokens stream in.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, activity]);

  useEffect(() => {
    if (status === "ready") inputRef.current?.focus();
  }, [status]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft;
    setDraft("");
    void send(text);
  }

  if (status === "connecting") {
    return (
      <div
        className="text-muted flex h-full items-center justify-center text-sm"
        role="status"
        aria-live="polite"
      >
        Conectando ao tutor...
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p role="alert" className="text-muted text-center text-sm">
          {error ?? "Tutor indisponivel."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header ref={headerRef} className="border-border shrink-0 border-b px-4 py-3">
        <h1 className="truncate text-sm font-semibold">{tutor?.title}</h1>
        {tutor?.description && <p className="text-muted truncate text-xs">{tutor.description}</p>}
      </header>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-label="Conversa com o tutor"
      >
        {/* Unconstrained wrapper: its height is what the conversation would occupy, which is
            what `useAutoResize` reports to the host. */}
        <div ref={contentRef} className="space-y-3">
          {tutor?.greeting && messages.length === 0 && (
            <MessageBubble
              message={{
                id: "greeting",
                role: "assistant",
                content: tutor.greeting,
                citations: [],
              }}
            />
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} onRetry={retry} />
          ))}

          {activity && <ToolActivityLine activity={activity} />}
        </div>
      </div>

      <form
        ref={composerRef}
        onSubmit={handleSubmit}
        className="border-border shrink-0 border-t p-3"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="composer" className="sr-only">
            Sua mensagem
          </label>
          <textarea
            id="composer"
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={MAX_MESSAGE_CHARS}
            disabled={sending}
            placeholder="Escreva sua pergunta..."
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter breaks the line -- the convention every chat uses.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!sending && draft.trim()) handleSubmit(event);
              }
            }}
            className="border-border bg-background focus-visible:outline-accent max-h-32 min-h-9 flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus-visible:outline-2 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="bg-accent text-accent-foreground focus-visible:outline-accent shrink-0 rounded-lg px-3 py-2 text-sm font-medium hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Enviando" : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  );
}
