# DOT Tutors — Frontend

Frontend do desafio técnico **Plataforma de Tutores Personalizados** (DOT Digital Group, PRD
`20260520_DOT_PRD-TUTORES v1.0`).

Um único app Next.js entrega o **painel administrativo** de tutores e a **página do widget**
carregada dentro do `<iframe>` do integrador.

> **Backend companheiro:** [`dot-tutors-backend`](https://github.com/JustShinobi/dot-tutors-backend)

---

## Arquitetura

```
┌───────────────────────────────────────────────────────────────┐
│  SITE DO INTEGRADOR (terceiro)                                │
│    <iframe src="https://SEU-APP/embed/pk_live_abc123">        │
└───────────────────────────┬───────────────────────────────────┘
                            │ (1) o navegador carrega o iframe
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  ESTE APP — Next.js 16 (App Router, TS, Tailwind)             │
│                                                               │
│  middleware.ts                                                │
│    └─ consulta GET /api/v1/embed/config?embed_key=…           │
│       e emite Content-Security-Policy: frame-ancestors <…>    │
│       (quem PODE enquadrar — decidido por chave, em runtime)  │
│                                                               │
│  /embed/[embedKey]   ← layout mínimo: só o widget             │
│  /login /tutors …    ← painel administrativo (JWT)            │
│  /demo               ← página que simula o site do cliente    │
└───────────────────────────┬───────────────────────────────────┘
                            │ (2) POST /api/v1/embed/session  { embed_key } + Origin
                            │ (3) POST /api/v1/embed/chat     (SSE) Bearer <session_token>
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  BACKEND — FastAPI (repo dot-tutors-backend)                  │
│  valida chave × Origin · emite token de sessão · roda o agente│
└───────────────────────────────────────────────────────────────┘
```

O widget fala direto com a API, sem BFF no meio. Um proxy intermediário bufferizaria o SSE e
reescreveria justamente o `Origin` que autoriza o embed.

---

## Superfícies

| Rota                                     | Papel        | Observação                                                        |
| ---------------------------------------- | ------------ | ----------------------------------------------------------------- |
| `/`                                      | Índice       | Atalhos para o admin e para a demonstração                        |
| `/login`                                 | Admin        | Autenticação por JWT                                              |
| `/tutors`, `/tutors/new`, `/tutors/[id]` | Admin        | CRUD, ativação/desativação, fontes e estado de leitura delas      |
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

O seed do backend já cria uma chave de embed e imprime o link pronto — abra
`/demo?key=SUA_CHAVE`. Para fixá-la, defina `NEXT_PUBLIC_DEMO_EMBED_KEY` no `.env.local`.

---

## Fluxo de embed ponta a ponta

Do "criar tutor" ao "iframe respondendo", com o que acontece em cada passo:

1. **Criar o tutor** em `/tutors/new`: título, instruções de comportamento e fontes (URL pública
   ou texto colado). Na tela de edição, cada fonte mostra quanto texto o agente conseguiu ler, ou
   o erro, se a URL for inalcançável. Uma URL quebrada aparece aqui, no cadastro, e não no meio de
   uma conversa com o usuário final.
2. **Gerar a chave** em `/tutors/[id]/embed`, com o domínio do integrador nas origens permitidas.
   A tela devolve o snippet pronto:

   ```html
   <iframe
     src="https://SEU-APP/embed/pk_live_abc123"
     title="Tutor: Guia de Produto"
     width="400"
     height="620"
     style="border:0;border-radius:12px"
     loading="lazy"
     referrerpolicy="strict-origin-when-cross-origin"
   ></iframe>
   ```

3. **O integrador cola o snippet.** Ao carregar, o `middleware.ts` deste app consulta a
   configuração da chave no backend e emite `frame-ancestors` com as origens permitidas — se o
   site não estiver na lista, o navegador recusa renderizar.
4. **O widget abre a sessão** (`POST /embed/session`) enviando a chave; o backend confere o header
   `Origin` contra a allowlist e devolve um token de sessão curto, o perfil público do tutor e o
   histórico.
5. **A conversa** vai por `POST /embed/chat` em SSE. Os tokens aparecem à medida que chegam, e a
   linha de atividade nomeia a fonte sendo consultada ("Procurando em _Política de trabalho
   remoto_…"), o que torna visível qual ferramenta o agente decidiu usar.
6. **As citações** aparecem como chips no rodapé da resposta, com link para a fonte.

Chave revogada, origem removida da allowlist ou tutor desativado: o widget informa a
indisponibilidade em texto claro, sem quebrar a página do integrador.

---

## Deploy com Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api-tutores.seu-dominio.com \
  --build-arg NEXT_PUBLIC_APP_BASE_URL=https://tutores.seu-dominio.com \
  -t dot-tutors-frontend .
docker run -p 3000:3000 dot-tutors-frontend
```

Dois detalhes que só aparecem em produção:

- **`NEXT_PUBLIC_*` é inlinado no bundle em tempo de build.** Mudar a URL da API exige um
  rebuild; reiniciar o container não adianta.
- **`API_INTERNAL_BASE_URL`** é a URL que o _servidor_ usa (o middleware de CSP). Em Docker
  aponta para o hostname do serviço (`http://api:8000`), não para o domínio público — assim o CSP
  continua sendo montado mesmo que o DNS público não resolva de dentro da rede de containers.

A pilha completa (banco + API + este app) está em `docker-compose.deploy.yml` no repositório do
backend. A imagem é construída e iniciada no CI a cada push.

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
| `pnpm test`                         | Vitest + Testing Library (50 testes)              |
| `pnpm test:e2e`                     | Playwright: 8 cenários por um `<iframe>` real     |
| `pnpm build`                        | Build de produção — parte do gate, não um detalhe |

Tudo roda no CI a cada push e pull request, mais um job que constrói a imagem Docker e verifica que
ela sobe e serve uma página. O `pnpm build` entra no gate porque um erro de fronteira entre Server
e Client Component passa pelo `tsc` e só estoura no build.

O E2E roda contra o build de produção pelo mesmo motivo: a CSP do widget difere entre dev e
produção, e é a de produção que precisa não quebrar a hidratação. O critério §7.3 é coberto por um
iframe cross-document real, porque um teste de componente renderizaria o widget inline e pularia a
CSP, a política de enquadramento e a requisição cross-origin — as três camadas que existem
exatamente por isto ser incorporado em site de terceiro.

---

## Decisões de arquitetura

### Um app para admin e widget

As duas superfícies têm requisitos opostos: o admin é autenticado e roda no domínio próprio, o
widget é anônimo e roda dentro do site de terceiros. Mesmo assim são um projeto só, e o motivo é
o `Content-Security-Policy: frame-ancestors`. Ele é um header de resposta da página enquadrada,
então só o servidor que a hospeda pode emiti-lo, e como a allowlist é por chave de embed e vive no
banco, montá-lo exige uma consulta em tempo de requisição — que hospedagem estática não faria. O
isolamento visual vem de um `layout.tsx` próprio do grupo de rotas do widget, não de um deploy
separado.

### `fetch` + `ReadableStream` em vez de `EventSource`

`EventSource` só emite GET e não aceita header `Authorization`, o que empurraria o token de sessão
para a query string, onde todo proxy do caminho o registra em log. O parser de SSE é escrito à mão
e só consome frames inteiros: TCP não respeita fronteira de mensagem, e um parser que trata cada
chunk como um frame perde dados justamente quando a resposta é longa. Há teste para o frame
partido ao meio.

### Nenhum cookie no fluxo de embed

Navegadores bloqueiam cookie de terceiro dentro de iframe (ITP no Safari, Chrome), então uma sessão
por cookie não funcionaria no cenário para o qual este produto existe. O token vive em
`sessionStorage`, isolado por aba e, em navegadores modernos, particionado por site hospedeiro, e
viaja no header `Authorization`. O token do admin segue a mesma regra: como este app também serve o
widget, manter as credenciais fora de cookie evita que qualquer requisição carregue autoridade
ambiente entre origens.

### Texto do modelo nunca vira HTML

A saída do modelo é influenciável pelas fontes de conhecimento do próprio tutor, então transformá-la
em markup é a superfície de XSS mais direta do projeto.

A resposta é renderizada como Markdown, com `react-markdown` construindo elementos React a partir
da árvore sintática e descartando HTML embutido, mais uma allowlist explícita dos elementos
permitidos. Isso só mudaria com `rehype-raw`, que é o plugin capaz de transformar uma fonte hostil
em execução de script dentro da página do integrador; ele não está no projeto e não deve entrar.

A primeira versão renderizava texto puro. Era segura e ilegível, porque modelos respondem em
Markdown e o usuário via `**negrito**` e `*` literais na tela. Testes cobrem os dois lados:
`<img onerror>` e `<script>` não viram elemento, `**negrito**` vira `<strong>`.

### CSP com nonce por requisição

`frame-ancestors` decide quem pode enquadrar a página; `script-src` usa um nonce novo a cada
requisição, carimbado nas tags de script pelo próprio Next, de modo que um script injetado não tem
como adivinhá-lo. O detalhe que faz isso funcionar é que a política precisa estar nos headers da
_requisição_, não só da resposta: é de lá que o Next extrai o nonce.

---

## Limitações conhecidas do MVP

- **`style-src` mantém `'unsafe-inline'`.** O Tailwind injeta estilos em runtime e o nonce não
  cobre esse caso. `script-src`, que é o vetor de execução, continua fechado.
- **Sessão do admin morre ao fechar a aba** (`sessionStorage`), sem refresh token.
- **Sem i18n.** Interface apenas em português.
- **O E2E stuba o backend.** Prova o contrato do iframe, não a integração com o modelo — essa é
  coberta pelos testes do backend e por validação manual.
- **`NEXT_PUBLIC_API_BASE_URL` é fixada no build.** Um mesmo artefato não serve dois ambientes;
  seria preciso ler a configuração em runtime a partir do servidor.

---

## Próximos passos

- Refresh token para o admin.
- Temas configuráveis por tutor e i18n do widget.
- SDK JS e Web Component como alternativas ao iframe.
- E2E em mais navegadores (hoje só Chromium) e teste de acessibilidade automatizado.
- Configuração de runtime em vez de build-time, para promover a mesma imagem entre ambientes.

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
