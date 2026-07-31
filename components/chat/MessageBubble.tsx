"use client";

import type { UiMessage } from "@/lib/hooks/useEmbedSession";

import { AssistantText } from "./AssistantText";

/**
 * One message.
 *
 * The user's own text is rendered verbatim; the assistant's goes through `AssistantText`, which
 * parses Markdown into React elements and never emits raw HTML. Model output is
 * attacker-influenceable through the tutor's own knowledge sources, so turning it into markup
 * would be the most obvious XSS hole in this project (see AGENTS.md).
 */
export function MessageBubble({ message }: { message: UiMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={isUser ? "max-w-[85%]" : "max-w-[92%] space-y-1.5"}>
        <div
          className={[
            "rounded-2xl px-3 py-2 text-sm",
            // Only the user's message needs CSS to preserve line breaks; the assistant's goes
            // through the Markdown renderer, which produces real paragraphs.
            isUser || message.failed ? "whitespace-pre-wrap" : "",
            isUser ? "bg-accent text-accent-foreground rounded-br-sm" : "bg-surface rounded-bl-sm",
            message.failed ? "text-danger" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isUser || message.failed ? (
            message.content
          ) : (
            <AssistantText>{message.content}</AssistantText>
          )}
          {message.streaming && !message.content && (
            <span className="text-muted" aria-label="Escrevendo">
              &hellip;
            </span>
          )}
        </div>

        {message.citations.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Fontes consultadas">
            {message.citations.map((citation) => (
              <li key={citation.source_id}>
                {citation.url ? (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={citation.snippet}
                    className="border-border text-muted hover:border-accent hover:text-accent inline-block rounded-full border px-2 py-0.5 text-[11px]"
                  >
                    {citation.label}
                  </a>
                ) : (
                  <span
                    title={citation.snippet}
                    className="border-border text-muted inline-block rounded-full border px-2 py-0.5 text-[11px]"
                  >
                    {citation.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
