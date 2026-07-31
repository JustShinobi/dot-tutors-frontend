# AGENTS.md — diretrizes para agentes de codificação

Contrato de trabalho para qualquer agente de IA que altere este repositório. O PRD do desafio
(§2) **exige** que o desenvolvimento seja assistido por agentes; este arquivo é o que mantém o
resultado coerente entre iterações.

---

## Contexto do projeto

Frontend da plataforma de tutores personalizados. Um único app Next.js entrega **duas superfícies
com requisitos opostos**:

| Superfície | Rotas                  | Característica                                                                                                  |
| ---------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Admin**  | `/login`, `/tutors/**` | Autenticado com JWT, roda no domínio próprio, layout completo.                                                  |
| **Widget** | `/embed/[embedKey]`    | **Renderiza dentro do iframe de terceiros.** Sem navegação, sem cookie, sem segredo, 100% da altura disponível. |

Existe ainda `/demo`, uma página que simula o site de um integrador para provar o critério §7.3.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Vitest.

> Backend companheiro: [`dot-tutors-backend`](https://github.com/JustShinobi/dot-tutors-backend).

---

## Regras invioláveis

1. **Nenhum segredo no cliente.** Só `NEXT_PUBLIC_*` chega ao browser. A chave do LLM vive
   exclusivamente no backend. A embed key (`pk_...`) é **pública por design** — quem protege o
   tutor é a allowlist de origens no backend, não o sigilo da chave.
2. **A rota `/embed/**` não pode depender de cookie.** Navegadores bloqueiam cookies de terceiros
   em iframe (Safari/ITP, Chrome). O token de sessão vive em `sessionStorage` e viaja no header
   `Authorization`.
3. **A rota `/embed/**` renderiza somente o widget** (PRD §4.2.1): sem header, sem nav, sem link
   para o admin.
4. **Markdown vindo do LLM nunca é renderizado como HTML bruto.** Sem `dangerouslySetInnerHTML`,
   sem `rehype-raw` — é a superfície de XSS mais óbvia deste projeto.
5. **Nada de LTI, SSO ou OAuth educacional** — explicitamente fora de escopo (PRD §6).
6. **Não adicionar dependência não solicitada.** Se parecer necessária, justifique no commit antes
   de instalar.

---

## Convenções

- **Server Components por padrão.** `"use client"` apenas onde há estado, efeito ou evento.
- **Acesso à API centralizado em `lib/api/`.** Componentes não chamam `fetch` direto.
- **Tipos espelham os schemas do backend** em `lib/types.ts`. Sem `any`; `tsc --noEmit` precisa
  passar.
- **Acessibilidade não é opcional** no widget: `aria-live` na lista de mensagens, foco visível,
  labels reais, operável só com teclado.
- **Idioma:** código e identificadores em inglês; textos de interface e documentação em português.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`,
  `ci:`), atômicos.

---

## Antes de dar uma tarefa por concluída

```bash
pnpm verify   # lint + format:check + typecheck + test
```

Se falhar, a tarefa não está pronta.

---

## Registro de iterações

Alterações relevantes — especialmente quando a saída do agente foi **rejeitada ou corrigida** —
devem ser registradas em [`docs/agent-log.md`](docs/agent-log.md). Esse registro é entregável
avaliado (PRD §2 e §7.6).
