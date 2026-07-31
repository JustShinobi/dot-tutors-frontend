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
| `pnpm test`                         | Vitest + Testing Library (41 testes)              |
| `pnpm test:e2e`                     | Playwright: 8 cenários por um `<iframe>` real     |
| `pnpm build`                        | Build de produção — parte do gate, não um detalhe |

Tudo roda no CI a cada push e pull request. O build entra no gate porque um erro de
Server/Client Component passa pelo `tsc` e só falha ali.

O E2E roda contra o **build de produção**, pelo mesmo motivo: a CSP do widget difere entre dev e
produção, e é a de produção que não pode quebrar a hidratação. Ele cobre o critério §7.3 através
de um iframe cross-document de verdade — um teste de componente renderizaria o widget inline e
pularia silenciosamente a CSP, a política de enquadramento e a requisição cross-origin, que são
justamente as camadas que só existem porque isto é incorporado.

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

A saída do modelo é influenciável pelas fontes de conhecimento do próprio tutor. Transformá-la em
markup seria a superfície de XSS mais óbvia do projeto.

A resposta é renderizada como **Markdown**, com `react-markdown` construindo elementos React a
partir da árvore sintática e **descartando HTML embutido** — o que só mudaria adicionando
`rehype-raw`, que é exatamente o plugin que transformaria uma fonte hostil em execução de script
dentro da página do integrador. Ele não está aqui e não pode entrar. Há também uma allowlist
explícita de elementos permitidos.

A alternativa anterior — texto puro — era segura e ilegível: modelos respondem em Markdown, então
o usuário via `**negrito**` e `*` literais. Segurança e legibilidade não estavam em conflito; só
a implementação errada de segurança estava. Testes cobrem os dois lados: `<img onerror>` e
`<script>` não viram elemento, e `**negrito**` vira `<strong>`.

### CSP com nonce por requisição

`frame-ancestors` decide quem pode enquadrar a página; `script-src` usa um **nonce novo a cada
requisição**, carimbado nas tags de script pelo próprio Next. Um script injetado não tem como
adivinhá-lo. O detalhe que faz funcionar é que a política precisa estar nos headers da
_requisição_, não só da resposta — é de lá que o Next extrai o nonce.

---

## Limitações conhecidas do MVP

- **`style-src` mantém `'unsafe-inline'`.** O Tailwind injeta estilos em runtime e um nonce não
  cobre isso. O vetor relevante (execução de script) está fechado.
- **Sessão do admin morre ao fechar a aba** (`sessionStorage`), sem refresh token.
- **Sem i18n.** Interface apenas em português.
- **O E2E stuba o backend.** Prova o contrato do iframe, não a integração com o modelo — essa é
  coberta pelos testes do backend e por validação manual.

---

## Próximos passos

- Refresh token para o admin.
- Temas configuráveis por tutor e i18n do widget.
- SDK JS e Web Component como alternativas ao iframe.
- E2E em mais navegadores (hoje só Chromium) e teste de acessibilidade automatizado.

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
