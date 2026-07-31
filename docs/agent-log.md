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

---

## #4 — O lint do React 19 rejeitou o padrão de carregamento das telas

**Problema.** `react-hooks/set-state-in-effect` acusou quatro pontos do painel: chamar `setState`
de forma síncrona dentro de um efeito. É uma regra nova e está certa — o padrão causa renders em
cascata.

**Iteração.** A saída fácil seria suprimir a regra em cada arquivo. Em vez disso, o padrão correto
foi implementado uma vez, num hook `useAsyncData`, e as três telas passaram a usá-lo.

**O que a revisão melhorou.** A primeira versão do hook guardava o loader num `useRef` para poder
receber um array de dependências próprio — e o lint reclamou de novo, agora por acessar ref durante
o render. Isso expôs que o `useRef` era desnecessário: os chamadores já memoizam o loader com
`useCallback`, então **as dependências dele são as do hook**. Remover o ref eliminou o array
duplicado e a supressão `exhaustive-deps` que normalmente acompanha esse padrão. O segundo erro de
lint levou a um desenho melhor do que o que eu tinha antes do primeiro.

---

## #5 — Uma CSP "completa" que congelava o widget

**Problema.** O middleware do widget emitia
`frame-ancestors <lista>; default-src 'self'; connect-src ...; img-src ...; style-src ...`.
Parecia um cabeçalho caprichado. Resultado: o widget ficava eternamente em "Conectando ao
tutor...", sem nenhum erro visível no console da página hospedeira.

**Diagnóstico.** Sem `script-src`, o `default-src 'self'` passa a valer para scripts — e bloqueia
os scripts inline que o Next.js injeta para hidratar a página. O componente cliente nunca montava,
então a interface ficava parada no HTML renderizado no servidor. O sintoma (travado em
"Conectando") não apontava para o CSP em nada.

**Correção.** O middleware ficou com o que de fato implementa o requisito — `frame-ancestors`, que
decide quem pode enquadrar a página — mais três diretivas que não custam nada aqui (`object-src`,
`base-uri`, `form-action`). Travar `script-src` sob Next exige nonce por requisição em cada tag de
script; isso virou item de "próximos passos" no README, em vez de ser fingido com um
`'unsafe-inline'` que devolveria justamente o que a diretiva promete restringir.

**Lição.** Cabeçalho de segurança copiado por reflexo é dívida disfarçada de rigor. Uma CSP só vale
depois de carregar a página de verdade — e o teste tem que ser o caminho real, dentro do iframe.
