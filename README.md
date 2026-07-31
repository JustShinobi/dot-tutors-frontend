# DOT Tutors — Frontend

Frontend do desafio técnico **Plataforma de Tutores Personalizados** (DOT Digital Group, PRD
`20260520_DOT_PRD-TUTORES v1.0`).

Um único app Next.js entrega o **painel administrativo** de tutores e a **página do widget**
carregada dentro do `<iframe>` do integrador.

> **Backend companheiro:** [`dot-tutors-backend`](https://github.com/JustShinobi/dot-tutors-backend)

---

## Superfícies

| Rota                                     | Papel          | Observação                                                        |
| ---------------------------------------- | -------------- | ----------------------------------------------------------------- |
| `/`                                      | Índice do demo | Atalhos para o admin e para a demonstração                        |
| `/login`                                 | Admin          | Autenticação por JWT                                              |
| `/tutors`, `/tutors/new`, `/tutors/[id]` | Admin          | CRUD, ativação/desativação, fontes                                |
| `/tutors/[id]/embed`                     | Admin          | Chaves de embed, origens permitidas e snippet copiável            |
| `/embed/[embedKey]`                      | **Widget**     | Renderiza **somente** o chat, para uso em `<iframe>` (PRD §4.2.1) |
| `/demo`                                  | Demonstração   | Simula o site de um integrador embedando o widget (PRD §7.3)      |

---

## Como rodar localmente

Pré-requisitos: **Node.js 20+** e **pnpm**. O backend precisa estar rodando em
`http://localhost:8000`.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Aplicação em <http://localhost:3000>.

---

## Variáveis de ambiente

Ver [`.env.example`](.env.example). Apenas as variáveis `NEXT_PUBLIC_*` chegam ao browser —
nenhum segredo do backend é exposto aqui.

---

## Qualidade

```bash
pnpm verify
```

| Comando                             | O que faz                                         |
| ----------------------------------- | ------------------------------------------------- |
| `pnpm lint`                         | ESLint (config do Next + integração com Prettier) |
| `pnpm format` / `pnpm format:check` | Prettier                                          |
| `pnpm typecheck`                    | `tsc --noEmit`                                    |
| `pnpm test`                         | Vitest + Testing Library                          |

---

## Decisões de arquitetura

_Consolidado na entrega final._ Resumo das que afetam este repositório:

- **Um app para admin e widget**, em vez de dois projetos: o `middleware.ts` do Next consegue
  emitir `Content-Security-Policy: frame-ancestors` por tutor, o que um host puramente estático
  não faria.
- **Sem cookie no fluxo de embed**: navegadores bloqueiam cookies de terceiros dentro de iframe.
  O token de sessão fica em `sessionStorage` e viaja no header `Authorization`.
- **Streaming por SSE** consumido com `fetch` + `ReadableStream`, para exibir a resposta token a
  token e sinalizar quando o agente está consultando uma fonte.

---

## Uso de agentes de codificação

Conforme a restrição de processo do PRD (§2) e o critério de aceite §7.6, **este código foi
produzido com auxílio de agentes de codificação**, e não por codificação integralmente manual.

- Ferramenta utilizada: **Claude Code (Anthropic)**.
- Papel humano: arquitetura, decisões técnicas, revisão crítica de cada saída e validação por
  testes automatizados.
- Registro das iterações relevantes: [`docs/agent-log.md`](docs/agent-log.md).
- Diretrizes fornecidas aos agentes: [`AGENTS.md`](AGENTS.md).
