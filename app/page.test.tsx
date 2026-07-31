import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("aponta para as duas superficies do projeto", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: /painel administrativo/i })).toHaveAttribute(
      "href",
      "/tutors",
    );
    expect(screen.getByRole("link", { name: /demonstração do embed/i })).toHaveAttribute(
      "href",
      "/demo",
    );
  });

  it("declara um unico titulo de nivel 1", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
