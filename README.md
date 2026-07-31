# DOT Tutors — Frontend

Frontend do desafio técnico **Plataforma de Tutores Personalizados** (DOT Digital Group, PRD
`20260520_DOT_PRD-TUTORES v1.0`).

Um único app Next.js entrega o **painel administrativo** de tutores e a **página do widget**
carregada dentro do `<iframe>` do integrador.

> **Backend companheiro:** [`dot-tutors-backend`](https://github.com/JustShinobi/dot-tutors-backend)

---

## Superfícies

| Rota                                     | Papel        | Observação                                                        |
| ---------------------------------------- | ------------ | ----------------------------------------------------------------- |
| `/`                                      | Índice       | Atalhos para o admin e para a demonstração                        |
| `/login`                                 | Admin        | Autenticação por JWT                                              |
| `/tutors`, `/tutors/new`, `/tutors/[id]` | Admin        | CRUD, ativação/desativação, fontes                                |
| `/tutors/[id]/embed`                     | Admin        | Chaves, origens permitidas, snippet copiável e prévia             |
| `/embed/[embedKey]`                      | **Widget**   | Renderiza **somente** o chat, para uso em `<iframe>` (PRD §4.2.1) |
| `/demo`                                  | Demonstração | Simula o site de um integrador embedando o widget (PRD §7.3)      |

---

## Como rodar localmente

Pré-requisitos: **Node.js 20+** e **pnpm**. O backend precisa estar rodando em
`http://localhost:8000`.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Aplicação em <http://localhost:3000>. Entre com as credenciais do seed do backend
(`admin@example.com`).

Para ver o widget em `/demo`, crie uma chave de embed no painel (**Tutores → tutor → Embed**),
com `http://localhost:3000` nas origens permitidas, e copie-a para `NEXT_PUBLIC_DEMO_EMBED_KEY`
no `.env.local`.

---

## Variáveis de ambiente

Ver [`.env.example`](.env.example). Apenas variáveis `NEXT_PUBLIC_*` chegam ao browser —
**nenhum segredo do backend é exposto aqui**. A chave de embed é pública por natureza: ela
aparece no HTML do site integrador, e o que protege o tutor é a allowlist de origens verificada
pelo backend.

`API_INTERNAL_BASE_URL` é usada apenas pelo servidor (middleware de CSP) e não vai ao cliente.

---

## Qualidade

```bash
pnpm verify        # lint + format:check + typecheck + test
```

| Comando                             | O que faz                                         |
| ----------------------------------- | ------------------------------------------------- |
| `pnpm lint`                         | ESLint (config do Next + integração com Prettier) |
| `pnpm format` / `pnpm format:check` | Prettier                                          |
| `pnpm typecheck`                    | `tsc --noEmit`                                    |
| `pnpm test`                         | Vitest + Testing Library                          |
| `pnpm build`                        | Build de produção — parte do gate, não um detalhe |

Tudo roda no CI a cada push e pull request. O build entra no gate porque um erro de
Server/Client Component passa pelo `tsc` e só falha ali.

---

## Decisões de arquitetura

### Um app para admin e widget

As duas superfícies têm requisitos opostos — o admin é autenticado e roda no domínio próprio; o
widget é anônimo e roda dentro do site de terceiros. Ainda assim, um único projeto, por um motivo
concreto: **`Content-Security-Policy: frame-ancestors` é um header de resposta da página
enquadrada**, então só o servidor que a hospeda pode emiti-lo. Como a allowlist é por chave de
embed e vive no banco, montar esse header exige uma consulta em tempo de requisição — que um
bucket estático não faria. O isolamento visual vem de um `layout.tsx` próprio do grupo de rotas
do widget, não de um deploy separado.

### `fetch` + `ReadableStream` em vez de `EventSource`

Não é preferência de estilo. `EventSource` só emite GET e não permite header `Authorization`, o
que forçaria o token de sessão para a query string — onde todo proxy do caminho o registra. O
parser de SSE é escrito à mão e só consome frames inteiros: TCP não respeita fronteira de
mensagem, e um parser que trata cada chunk como um frame perde dados justamente quando a resposta
é longa. Há teste para o frame partido ao meio.

### Nenhum cookie no fluxo de embed

Navegadores bloqueiam cookie de terceiro dentro de iframe (ITP no Safari, Chrome), então uma
sessão por cookie simplesmente não funcionaria para o integrador que este produto existe para
atender. O token vive em `sessionStorage` — isolado por aba e, em navegadores modernos,
particionado por site hospedeiro — e viaja no header `Authorization`. O token do admin segue a
mesma regra: como este app também serve o widget, manter credenciais fora de cookie garante que
nenhuma requisição carregue autoridade ambiente entre origens.

### Texto do modelo nunca vira HTML

A saída do modelo é influenciável pelas fontes de conhecimento do próprio tutor. Renderizá-la
como HTML seria a superfície de XSS mais óbvia do projeto. Ela é exibida como texto puro, com
quebras de linha preservadas por CSS — e há teste com `<img src=x onerror=...>` provando que não
vira elemento.

---

## Limitações conhecidas do MVP

- **CSP do widget sem `script-src`.** A diretiva que implementa o requisito — `frame-ancestors` —
  está lá, junto de `object-src`, `base-uri` e `form-action`. Restringir scripts sob Next exige
  nonce por requisição em cada tag; a primeira tentativa (`default-src 'self'`) bloqueou os
  scripts de hidratação e congelou o widget. Ficou como próximo passo em vez de ser fingido com
  `'unsafe-inline'`.
- **Altura fixa do iframe.** O widget não emite `postMessage` de redimensionamento.
- **Sem teste E2E de navegador.** O fluxo foi validado manualmente no navegador (widget em iframe
  real conversando com o Gemini); um Playwright cobrindo isso é próximo passo.
- **Sessão do admin morre ao fechar a aba** (`sessionStorage`), sem refresh token.
- **Sem i18n.** Interface apenas em português.

---

## Próximos passos

- CSP completa com nonce por requisição.
- `postMessage` de altura para o host ajustar o iframe.
- E2E com Playwright cobrindo `/demo` ponta a ponta.
- Refresh token para o admin.
- Temas configuráveis por tutor e i18n do widget.
- SDK JS e Web Component como alternativas ao iframe.

---

## Uso de agentes de codificação

Conforme a restrição de processo do PRD (§2) e o critério de aceite §7.6, **este código foi
produzido com auxílio de agentes de codificação**, e não por codificação integralmente manual.

- **Ferramenta:** Claude Code (Anthropic).
- **Papel humano:** arquitetura, decisões técnicas, revisão crítica de cada saída e validação por
  testes automatizados e execução real no navegador.
- **Registro das iterações:** [`docs/agent-log.md`](docs/agent-log.md) — inclui os casos em que a
  saída do agente foi **rejeitada ou corrigida**, como a CSP que parecia caprichada e congelava o
  widget, e o hook de carregamento que só ficou correto depois do segundo erro de lint.
- **Diretrizes fornecidas aos agentes:** [`AGENTS.md`](AGENTS.md).
