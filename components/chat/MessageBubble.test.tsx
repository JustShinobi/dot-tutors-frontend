import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { UiMessage } from "@/lib/hooks/useEmbedSession";

import { MessageBubble } from "./MessageBubble";

const base: Pick<UiMessage, "id" | "citations"> = { id: "1", citations: [] };

describe("MessageBubble", () => {
  it("renderiza o texto do modelo como texto puro, nunca como HTML", () => {
    // Model output is influenceable through the tutor's knowledge sources, so injecting it into
    // the DOM would be the most obvious XSS hole in the project.
    const { container } = render(
      <MessageBubble
        message={{
          ...base,
          role: "assistant",
          content: '<img src=x onerror="alert(1)"> **negrito**',
        }}
      />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(
      screen.getByText(/<img src=x onerror="alert\(1\)"> \*\*negrito\*\*/),
    ).toBeInTheDocument();
  });

  it("lista as fontes consultadas com link seguro", () => {
    render(
      <MessageBubble
        message={{
          ...base,
          role: "assistant",
          content: "resposta",
          citations: [
            {
              source_id: "s1",
              label: "Politica de ferias",
              url: "https://exemplo.com/politica",
              snippet: "trecho",
            },
          ],
        }}
      />,
    );

    const link = screen.getByRole("link", { name: "Politica de ferias" });
    expect(link).toHaveAttribute("href", "https://exemplo.com/politica");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("mostra a fonte sem link quando ela e texto colado", () => {
    render(
      <MessageBubble
        message={{
          ...base,
          role: "assistant",
          content: "resposta",
          citations: [{ source_id: "s1", label: "FAQ interno", url: null, snippet: "t" }],
        }}
      />,
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("FAQ interno")).toBeInTheDocument();
  });

  it("indica que a resposta esta sendo escrita antes do primeiro token", () => {
    render(
      <MessageBubble message={{ ...base, role: "assistant", content: "", streaming: true }} />,
    );

    expect(screen.getByLabelText("Escrevendo")).toBeInTheDocument();
  });
});
