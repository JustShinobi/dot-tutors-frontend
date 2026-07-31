import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TutorForm } from "./TutorForm";

const VALID_INSTRUCTIONS = "Voce e um tutor de onboarding. Use as fontes configuradas.";

describe("TutorForm", () => {
  it("envia os campos ja normalizados", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<TutorForm submitLabel="Salvar" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/titulo/i), "  Tutor de Vendas  ");
    await user.type(screen.getByLabelText(/instrucoes/i), VALID_INSTRUCTIONS);
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Tutor de Vendas",
        system_instructions: VALID_INSTRUCTIONS,
        // An empty greeting becomes null, not "", so the backend stores absence rather than blank.
        greeting: null,
      }),
    );
  });

  it("bloqueia instrucoes curtas demais antes de chamar a API", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TutorForm submitLabel="Salvar" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/titulo/i), "Tutor");
    await user.type(screen.getByLabelText(/instrucoes/i), "curto");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(/ao menos 10 caracteres/i);
  });

  it("mostra o erro de campo devolvido pelo backend junto ao campo certo", () => {
    render(
      <TutorForm
        submitLabel="Salvar"
        onSubmit={vi.fn()}
        fieldErrors={[{ field: "title", message: "Titulo ja utilizado." }]}
      />,
    );

    expect(screen.getByText("Titulo ja utilizado.")).toBeInTheDocument();
  });

  it("preenche os campos ao editar um tutor existente", () => {
    render(
      <TutorForm
        submitLabel="Salvar"
        onSubmit={vi.fn()}
        initial={{
          title: "Tutor Existente",
          description: "Descricao",
          system_instructions: VALID_INSTRUCTIONS,
          greeting: "Ola!",
        }}
      />,
    );

    expect(screen.getByLabelText(/titulo/i)).toHaveValue("Tutor Existente");
    expect(screen.getByLabelText(/boas-vindas/i)).toHaveValue("Ola!");
  });

  it("so oferece o editor de fontes na criacao", () => {
    const { rerender } = render(<TutorForm submitLabel="Criar" onSubmit={vi.fn()} withSources />);
    expect(screen.getByText(/fontes de conhecimento/i)).toBeInTheDocument();

    rerender(<TutorForm submitLabel="Salvar" onSubmit={vi.fn()} />);
    expect(screen.queryByText(/fontes de conhecimento/i)).not.toBeInTheDocument();
  });
});
