"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders the model's answer as Markdown — safely.
 *
 * The rule in AGENTS.md is that model output must never become raw HTML, and this respects it:
 * `react-markdown` builds React elements from a parsed AST and **discards embedded HTML** unless
 * `rehype-raw` is added. It is not here, and must not be: that single plugin is what would turn
 * a hostile knowledge source into script execution inside the integrator's page.
 *
 * The alternative — plain text, which this replaced — was safe and unreadable: models answer in
 * Markdown, so users saw literal `**bold**` and `*` bullets. Safety and legibility are not in
 * tension here; only the wrong implementation of safety was.
 */
export function AssistantText({ children }: { children: string }) {
  return (
    <div className="space-y-2 [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc">
      <Markdown
        remarkPlugins={[remarkGfm]}
        // Every element that reaches the DOM is one of these. Anything else in the source —
        // including an `<img onerror=...>` — never becomes an element.
        allowedElements={[
          "p",
          "br",
          "strong",
          "em",
          "del",
          "code",
          "pre",
          "ul",
          "ol",
          "li",
          "blockquote",
          "h1",
          "h2",
          "h3",
          "h4",
          "a",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
          "hr",
        ]}
        unwrapDisallowed
        components={{
          // Links open outside the iframe and cannot reach back into the host page.
          a: ({ href, children: label }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline underline-offset-2"
            >
              {label}
            </a>
          ),
          p: ({ children: text }) => <p className="whitespace-pre-wrap">{text}</p>,
          ul: ({ children: items }) => <ul className="space-y-1">{items}</ul>,
          ol: ({ children: items }) => <ol className="space-y-1">{items}</ol>,
          code: ({ children: text }) => (
            <code className="bg-surface-strong rounded px-1 py-0.5 font-mono text-[0.85em]">
              {text}
            </code>
          ),
          pre: ({ children: text }) => (
            <pre className="bg-surface-strong overflow-x-auto rounded-lg p-2 text-xs">{text}</pre>
          ),
          table: ({ children: rows }) => (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">{rows}</table>
            </div>
          ),
          th: ({ children: text }) => <th className="border-border border-b py-1 pr-3">{text}</th>,
          td: ({ children: text }) => <td className="py-1 pr-3 align-top">{text}</td>,
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
