# Registro de iterações com agentes de codificação

Exigência de processo do PRD (§2) e critério de aceite §7.6. Registra as iterações relevantes do
desenvolvimento assistido por agente — **incluindo os casos em que a saída do agente foi rejeitada
ou corrigida**.

Ferramenta: **Claude Code (Anthropic)**.

---

## #1 — Um app ou dois para admin e widget?

**Contexto.** O admin e o widget têm requisitos opostos: o admin é autenticado e roda no domínio
próprio; o widget é anônimo, roda dentro do iframe de terceiros e não pode carregar navegação nem
cookie. A separação em dois projetos parecia mais limpa.

**Revisão humana.** Um host estático separado para o widget não consegue emitir
`Content-Security-Policy: frame-ancestors` **por tutor** — e esse header é o que impede um site
não autorizado de embedar o widget. Emitir isso exige um servidor que consulte a allowlist da
embed key no momento da requisição.

**Decisão.** Um único app Next.js, com o `middleware.ts` responsável pelo CSP dinâmico das rotas
`/embed/**`. O isolamento visual é feito por um `layout.tsx` próprio do grupo de rotas do widget,
não por um deploy separado.

---

## #2 — `pnpm install` abortando no scaffold

**Problema.** O `create-next-app` completou a cópia dos arquivos mas o `pnpm install` abortou:
a partir do pnpm 11, scripts de build de dependências (`sharp`, `unrs-resolver`) são bloqueados por
padrão como proteção de cadeia de suprimentos, e o processo termina com erro.

**Correção.** As duas dependências foram aprovadas **explicitamente** em `pnpm-workspace.yaml`, com
comentário dizendo para que cada uma serve, em vez de desligar a verificação globalmente. Manter a
proteção ativa e liberar caso a caso é o comportamento correto — e deixa registrado no repositório
por que aquelas duas foram liberadas.

---

## #3 — Higienização do scaffold gerado

**Contexto.** O `create-next-app` entrega uma página inicial de demonstração, `lang="en"`,
`title: "Create Next App"` e um `body { font-family: Arial }` que ignora a fonte carregada logo
acima.

**Revisão.** Deixar sobras do gerador em um teste técnico é ruído que o avaliador lê como falta de
cuidado. O scaffold foi revisado e não apenas aceito: `lang="pt-BR"`, metadata real com
`robots: noindex` (é um ambiente de demonstração), tokens de tema em CSS custom properties — porque
o widget precisa se adaptar ao esquema de cores do site host — e uma home que aponta para as duas
superfícies do projeto.
