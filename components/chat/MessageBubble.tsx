"use client";

import type { UiMessage } from "@/lib/hooks/useEmbedSession";

/**
 * One message.
 *
 * The assistant's text is rendered as **plain text**, never as HTML. Model output is
 * attacker-influenceable through the tutor's own knowledge sources, so injecting it into the DOM
 * would be the most obvious XSS hole in this project (see AGENTS.md). Line breaks are preserved
 * with CSS instead of markup.
 */
export function MessageBubble({ message }: { message: UiMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={isUser ? "max-w-[85%]" : "max-w-[92%] space-y-1.5"}>
        <div
          className={[
            "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
            isUser ? "bg-accent text-accent-foreground rounded-br-sm" : "bg-surface rounded-bl-sm",
            message.failed ? "text-danger" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {message.content}
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
