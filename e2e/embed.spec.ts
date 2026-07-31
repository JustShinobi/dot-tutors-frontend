import { expect, test } from "@playwright/test";

import { EMBED_KEY, TUTOR_TITLE, installFakeBackend } from "./fake-backend";

/**
 * Acceptance criterion §7.3 of the PRD: "página de widget carregável em iframe e capaz de
 * conversar com o backend".
 *
 * Every assertion here is made *through a real cross-document iframe*, which is the whole
 * point. A component test renders the widget inline and would silently skip the CSP, the
 * framing policy, the partitioned storage and the cross-origin request — precisely the layers
 * that only exist because this thing is embedded.
 */

test.beforeEach(async ({ page }) => {
  await installFakeBackend(page);
});

test("o widget carrega dentro do iframe da pagina do integrador", async ({ page }) => {
  await page.goto("/demo");

  const frame = page.frameLocator('[data-testid="widget-frame"]');

  await expect(frame.getByRole("heading", { name: TUTOR_TITLE })).toBeVisible();
  await expect(frame.getByText(/Posso ajudar com duvidas/)).toBeVisible();
  await expect(frame.getByLabel("Sua mensagem")).toBeEnabled();
});

test("a pagina hospedeira nao vaza o painel administrativo para dentro do widget", async ({
  page,
}) => {
  await page.goto("/demo");
  const frame = page.frameLocator('[data-testid="widget-glass"], [data-testid="widget-frame"]');

  // PRD §4.2.1: a rota do widget renderiza somente o chat.
  await expect(frame.getByRole("link", { name: /tutores/i })).toHaveCount(0);
  await expect(frame.getByRole("button", { name: /sair/i })).toHaveCount(0);
});

test("conversa ponta a ponta com streaming, atividade de ferramenta e citacao", async ({
  page,
}) => {
  await page.goto("/demo");
  const frame = page.frameLocator('[data-testid="widget-frame"]');

  await frame.getByLabel("Sua mensagem").fill("Qual o auxilio home office?");
  await frame.getByRole("button", { name: "Enviar" }).click();

  // A pergunta aparece imediatamente, antes de qualquer resposta.
  await expect(frame.getByText("Qual o auxilio home office?")).toBeVisible();

  // A resposta chega por SSE e e montada incrementalmente.
  await expect(frame.getByText(/R\$ 150,00 por mes/)).toBeVisible();

  // A fonte consultada e exibida: e o que separa uma resposta pesquisada de uma inventada.
  await expect(frame.getByRole("link", { name: "Politica de trabalho remoto" })).toHaveCount(0);
  await expect(frame.getByText("Politica de trabalho remoto")).toBeVisible();
});

test("o iframe recebe a politica de enquadramento do backend", async ({ page }) => {
  const response = await page.goto(`/embed/${EMBED_KEY}`);
  const csp = response?.headers()["content-security-policy"] ?? "";

  expect(csp).toContain("frame-ancestors http://localhost:3100");

  // O nonce e o que permite fechar script-src sem 'unsafe-inline'. A checagem e na diretiva,
  // nao na politica inteira: style-src usa 'unsafe-inline' de propósito, porque o Tailwind
  // injeta estilos em runtime e um nonce nao cobre isso.
  const scriptSrc = csp.split(";").find((directive) => directive.includes("script-src")) ?? "";
  expect(scriptSrc).toMatch(/'nonce-[^']+'/);
  expect(scriptSrc).not.toContain("'unsafe-inline'");
});

test("uma chave desconhecida recusa ser enquadrada", async ({ page }) => {
  // O stub de configuracao devolve 404 para qualquer chave que nao seja a conhecida.
  const response = await page.goto("/embed/pk_live_inexistente");

  // Falha fechada: uma configuracao errada nao pode tornar o widget embedavel em qualquer lugar.
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("o widget informa indisponibilidade quando o tutor esta desativado", async ({ page }) => {
  await installFakeBackend(page, {
    sessionFailure: {
      status: 409,
      code: "TUTOR_INACTIVE",
      message: "Este tutor esta indisponivel.",
    },
  });

  await page.goto("/demo");
  const frame = page.frameLocator('[data-testid="widget-frame"]');

  // `p[role=alert]`, não `getByRole`: o Next monta um anunciador de rota que também tem
  // role="alert" e tornaria o seletor ambíguo.
  await expect(frame.locator("p[role=alert]")).toContainText(/indisponivel/i);
  await expect(frame.getByLabel("Sua mensagem")).toHaveCount(0);
});

test("a origem nao autorizada recebe uma mensagem acionavel", async ({ page }) => {
  await installFakeBackend(page, {
    sessionFailure: {
      status: 403,
      code: "ORIGIN_NOT_ALLOWED",
      message: "Origem nao autorizada.",
    },
  });

  await page.goto("/demo");
  const frame = page.frameLocator('[data-testid="widget-frame"]');

  await expect(frame.locator("p[role=alert]")).toContainText(/nao esta autorizado/i);
});

test("a altura do conteudo e publicada para a pagina hospedeira", async ({ page }) => {
  await page.goto("/demo");

  const heights = await page.evaluate(async () => {
    const received: number[] = [];
    window.addEventListener("message", (event) => {
      const data = event.data as { type?: string; height?: number };
      if (data?.type === "dot-tutor:resize" && typeof data.height === "number") {
        received.push(data.height);
      }
    });

    const frame = document.querySelector<HTMLIFrameElement>('[data-testid="widget-frame"]');
    if (frame) frame.src = frame.src;

    await new Promise((resolve) => setTimeout(resolve, 3_000));
    return received;
  });

  expect(heights.length).toBeGreaterThan(0);
  expect(heights.every((height) => height > 0)).toBe(true);
});
