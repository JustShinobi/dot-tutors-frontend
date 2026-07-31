import { afterEach, describe, expect, it, vi } from "vitest";

import { streamChat, type ChatStreamHandlers } from "./embed";

/** Builds a Response whose body streams the given chunks, mimicking a real SSE connection. */
function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function handlers() {
  const calls = {
    tokens: [] as string[],
    toolsStarted: [] as (string | null)[],
    done: [] as { content: string; citations: unknown[] }[],
    errors: [] as { code: string; message: string }[],
  };
  const spy: ChatStreamHandlers = {
    onToken: (delta) => calls.tokens.push(delta),
    onToolStarted: (activity) => calls.toolsStarted.push(activity.tool),
    onToolFinished: () => undefined,
    onDone: ({ content, citations }) => calls.done.push({ content, citations }),
    onError: (error) => calls.errors.push(error),
  };
  return { calls, spy };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("streamChat", () => {
  it("monta a resposta a partir dos frames de token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          sseResponse([
            'event: token\ndata: {"delta":"Ola"}\n\n',
            'event: token\ndata: {"delta":", tudo bem?"}\n\n',
            'event: done\ndata: {"message_id":"m1","content":"Ola, tudo bem?","citations":[]}\n\n',
          ]),
        ),
      ),
    );
    const { calls, spy } = handlers();

    await streamChat("token", "oi", spy);

    expect(calls.tokens.join("")).toBe("Ola, tudo bem?");
    expect(calls.done).toHaveLength(1);
  });

  it("remonta um frame partido entre dois chunks da rede", async () => {
    // The decisive case: TCP does not respect message boundaries, so a naive parser that treats
    // each chunk as a whole frame drops data exactly when the answer is long.
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          sseResponse([
            'event: token\ndata: {"del',
            'ta":"partido"}\n\nevent: done\ndata: {"message_id":"m1","content":"partido","citations":[]}\n\n',
          ]),
        ),
      ),
    );
    const { calls, spy } = handlers();

    await streamChat("token", "oi", spy);

    expect(calls.tokens).toEqual(["partido"]);
    expect(calls.done[0].content).toBe("partido");
  });

  it("reporta a atividade de ferramenta antes da resposta", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          sseResponse([
            'event: tool_started\ndata: {"tool":"search_source","source":"Politica"}\n\n',
            'event: tool_finished\ndata: {"tool":"search_source","source":"Politica"}\n\n',
            'event: done\ndata: {"message_id":"m1","content":"ok","citations":[]}\n\n',
          ]),
        ),
      ),
    );
    const { calls, spy } = handlers();

    await streamChat("token", "oi", spy);

    expect(calls.toolsStarted).toEqual(["search_source"]);
  });

  it("entrega o evento de erro do backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          sseResponse(['event: error\ndata: {"code":"AGENT_TIMEOUT","message":"Demorou."}\n\n']),
        ),
      ),
    );
    const { calls, spy } = handlers();

    await streamChat("token", "oi", spy);

    expect(calls.errors).toEqual([{ code: "AGENT_TIMEOUT", message: "Demorou." }]);
  });

  it("ignora um frame malformado sem abortar a conversa", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          sseResponse([
            "event: token\ndata: nao-e-json\n\n",
            'event: token\ndata: {"delta":"segue"}\n\n',
            'event: done\ndata: {"message_id":"m1","content":"segue","citations":[]}\n\n',
          ]),
        ),
      ),
    );
    const { calls, spy } = handlers();

    await streamChat("token", "oi", spy);

    expect(calls.tokens).toEqual(["segue"]);
    expect(calls.errors).toHaveLength(0);
  });

  it("converte uma resposta HTTP de erro na mensagem do backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ error: { code: "RATE_LIMITED", message: "Muitas requisicoes." } }),
            { status: 429, headers: { "content-type": "application/json" } },
          ),
        ),
      ),
    );
    const { calls, spy } = handlers();

    await streamChat("token", "oi", spy);

    expect(calls.errors).toEqual([{ code: "RATE_LIMITED", message: "Muitas requisicoes." }]);
  });

  it("avisa quando o stream termina sem done nem error", async () => {
    // The failure this guards against: the backend dies mid-answer and closes the connection.
    // Without a terminal event the loop simply ends, no handler fires, and the message stays on
    // screen streaming forever — waiting for a token that is never coming.
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          sseResponse([
            'event: token\ndata: {"delta":"Comecei a resp"}\n\n',
            // and then nothing: no done, no error, connection closed
          ]),
        ),
      ),
    );
    const { calls, spy } = handlers();

    await streamChat("token", "oi", spy);

    expect(calls.tokens.join("")).toBe("Comecei a resp");
    expect(calls.errors).toEqual([
      {
        code: "STREAM_INCOMPLETE",
        message: "A resposta foi interrompida antes do fim. Tente novamente.",
      },
    ]);
  });

  it("nao reclama quando o proprio cliente cancelou o stream", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(sseResponse([]))),
    );
    const { calls, spy } = handlers();

    await streamChat("token", "oi", spy, controller.signal);

    expect(calls.errors).toEqual([]);
  });

  it("um frame de error tambem encerra o stream", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          sseResponse(['event: error\ndata: {"code":"AGENT_FAILED","message":"Falhou."}\n\n']),
        ),
      ),
    );
    const { calls, spy } = handlers();

    await streamChat("token", "oi", spy);

    // Exactly one error: the terminal frame, not that one plus an "incomplete" complaint.
    expect(calls.errors).toEqual([{ code: "AGENT_FAILED", message: "Falhou." }]);
  });

  it("envia o token de sessao no header, nunca na URL", async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve(
        sseResponse(['event: done\ndata: {"message_id":"m","content":"","citations":[]}\n\n']),
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const { spy } = handlers();

    await streamChat("token-secreto", "oi", spy);

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    // EventSource would force the token into the query string, where every proxy logs it.
    expect(url).not.toContain("token-secreto");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-secreto");
  });
});
