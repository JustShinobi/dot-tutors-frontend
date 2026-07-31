import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToolActivityLine } from "./ToolActivityLine";

describe("ToolActivityLine", () => {
  it("nomeia a fonte que o agente esta consultando", () => {
    // This line is where the agentic strategy stops being an implementation detail: naming the
    // document is what distinguishes an answer that was looked up from one that was invented.
    render(
      <ToolActivityLine
        activity={{ tool: "search_source", source: "Politica de trabalho remoto" }}
      />,
    );

    expect(screen.getByText(/Procurando em/)).toBeInTheDocument();
    expect(screen.getByText("Politica de trabalho remoto")).toBeInTheDocument();
  });

  it("cai no texto generico quando a ferramenta nao tem fonte", () => {
    render(<ToolActivityLine activity={{ tool: "list_sources", source: null }} />);

    expect(screen.getByText(/Verificando as fontes disponiveis/)).toBeInTheDocument();
  });

  it("cai no texto generico quando o modelo inventou um id de fonte", () => {
    // The backend resolves the id to a label and sends null when it does not exist, so the user
    // never sees a raw identifier.
    render(<ToolActivityLine activity={{ tool: "search_source", source: null }} />);

    expect(screen.getByText(/Procurando nas fontes/)).toBeInTheDocument();
  });

  it("anuncia a atividade para leitores de tela sem roubar o foco", () => {
    render(<ToolActivityLine activity={{ tool: "fetch_source", source: "Manual" }} />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
