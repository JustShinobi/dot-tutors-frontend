import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "./client";

function mockFetch(response: Response | Error) {
  const impl =
    response instanceof Error ? () => Promise.reject(response) : () => Promise.resolve(response);
  vi.stubGlobal("fetch", vi.fn(impl));
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("decodifica o corpo em caso de sucesso", async () => {
    mockFetch(jsonResponse(200, { id: "1" }));

    await expect(apiFetch<{ id: string }>("/x")).resolves.toEqual({ id: "1" });
  });

  it("trata 204 como ausencia de corpo", async () => {
    mockFetch(new Response(null, { status: 204 }));

    await expect(apiFetch("/x", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("converte o envelope de erro do backend em ApiError", async () => {
    mockFetch(
      jsonResponse(404, {
        error: { code: "TUTOR_NOT_FOUND", message: "Tutor nao encontrado.", request_id: "abc" },
      }),
    );

    const caught = await apiFetch("/x").catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(ApiError);
    const error = caught as ApiError;
    expect(error.status).toBe(404);
    expect(error.code).toBe("TUTOR_NOT_FOUND");
    // The backend's own wording is preferred over anything invented here.
    expect(error.message).toBe("Tutor nao encontrado.");
    expect(error.requestId).toBe("abc");
  });

  it("expoe os erros de campo da validacao", async () => {
    mockFetch(
      jsonResponse(422, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Dados invalidos.",
          details: { fields: [{ field: "title", message: "obrigatorio" }] },
        },
      }),
    );

    const error = (await apiFetch("/x").catch((caught: unknown) => caught)) as ApiError;

    expect(error.fields).toEqual([{ field: "title", message: "obrigatorio" }]);
  });

  it("marca 401 para a UI conseguir deslogar", async () => {
    mockFetch(jsonResponse(401, { error: { code: "UNAUTHENTICATED", message: "Sem token." } }));

    const error = (await apiFetch("/x").catch((caught: unknown) => caught)) as ApiError;

    expect(error.isUnauthenticated).toBe(true);
  });

  it("transforma falha de rede em um codigo proprio", async () => {
    mockFetch(new TypeError("Failed to fetch"));

    const error = (await apiFetch("/x").catch((caught: unknown) => caught)) as ApiError;

    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.message).toMatch(/backend esta rodando/i);
  });

  it("envia o token como Bearer", async () => {
    mockFetch(jsonResponse(200, {}));

    await apiFetch("/x", { token: "jwt-de-teste" });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer jwt-de-teste");
  });

  it("nao envia Authorization quando nao ha token", async () => {
    mockFetch(jsonResponse(200, {}));

    await apiFetch("/x");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
