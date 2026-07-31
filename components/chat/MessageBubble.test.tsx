import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { UiMessage } from "@/lib/hooks/useEmbedSession";

import { MessageBubble } from "./MessageBubble";

const base: Pick<UiMessage, "id" | "citations"> = { id: "1", citations: [] };

describe("MessageBubble", () => {
  it("nunca transforma HTML da resposta do modelo em elemento", () => {
    // Model output is influenceable through the tutor's knowledge sources, so turning it into
    // markup would be the most obvious XSS hole in the project.
    const { container } = render(
      <MessageBubble
        message={{
          ...base,
          role: "assistant",
          content: '<img src=x onerror="alert(1)"> <script>alert(2)</script> texto',
        }}
      />,
    );

    // The property that matters is that no element was created. The characters still appear —
    // escaped, as visible text — and asserting their absence would be asserting the wrong thing.
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).toContain("&lt;img");
    expect(screen.getByText(/onerror/)).toBeInTheDocument();
  });

  it("renderiza markdown da resposta, porque e assim que o modelo escreve", () => {
    const { container } = render(
      <MessageBubble
        message={{
          ...base,
          role: "assistant",
          content: "O auxilio e de **R$ 150,00**.\n\n- primeiro\n- segundo",
        }}
      />,
    );

    expect(container.querySelector("strong")?.textContent).toBe("R$ 150,00");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    // O asterisco literal nao deve sobrar na tela.
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });

  it("abre links da resposta fora do iframe, sem acesso a janela hospedeira", () => {
    render(
      <MessageBubble
        message={{
          ...base,
          role: "assistant",
          content: "Veja [a politica](https://exemplo.com/politica).",
        }}
      />,
    );

    const link = screen.getByRole("link", { name: "a politica" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("mostra a mensagem do usuario literalmente, sem interpretar markdown", () => {
    const { container } = render(
      <MessageBubble message={{ ...base, role: "user", content: "eu escrevi **assim**" }} />,
    );

    expect(container.querySelector("strong")).toBeNull();
    expect(screen.getByText("eu escrevi **assim**")).toBeInTheDocument();
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
