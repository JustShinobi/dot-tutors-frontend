import Link from "next/link";

import { ResizingEmbed } from "@/components/embed/ResizingEmbed";

/**
 * A page pretending to be an integrator's website.
 *
 * Exists to prove acceptance criterion 7.3 — "página de widget carregável em iframe e capaz de
 * conversar com o backend" — with a real cross-document `<iframe>`, not a component rendered
 * inline. That distinction matters: an inline widget would silently skip the CSP, the `Origin`
 * check and the third-party storage rules that the embed path actually has to survive.
 *
 * The key can come from the query string as well as the environment. Requiring a rebuild to
 * look at a different tutor made the fastest way to see this thing working a four-step chore;
 * `?key=` costs nothing, and the key is public by design — it is about to be printed in the
 * `src` of an iframe on this very page.
 */
export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const embedKey = key?.trim() || process.env.NEXT_PUBLIC_DEMO_EMBED_KEY?.trim();
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <p className="text-muted text-xs tracking-wide uppercase">Pagina de demonstracao</p>
      <h1 className="mt-2 text-3xl font-semibold">Portal do Colaborador</h1>
      <p className="text-muted mt-2">
        Esta pagina simula o site de um integrador. O tutor abaixo esta incorporado por{" "}
        <code className="font-mono text-sm">&lt;iframe&gt;</code>, exatamente como ficaria em um
        site de terceiro.
      </p>

      <div className="border-border mt-8 rounded-xl border p-4">
        <h2 className="text-sm font-medium">Comunicados</h2>
        <p className="text-muted mt-1 text-sm">
          Conteudo ficticio, apenas para dar contexto de pagina hospedeira ao widget.
        </p>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Precisa de ajuda?</h2>

        {embedKey ? (
          <ResizingEmbed
            embedUrl={`${appBaseUrl}/embed/${embedKey}`}
            embedKey={embedKey}
            title="Tutor de duvidas"
          />
        ) : (
          <div className="border-border bg-surface mt-3 space-y-2 rounded-xl border border-dashed p-6 text-sm">
            <p className="font-medium">Informe uma chave de embed para ver o widget aqui.</p>
            <ol className="text-muted list-decimal space-y-1 pl-5">
              <li>
                O seed do backend (<code className="font-mono">python -m scripts.seed</code>) ja
                cria uma chave e imprime o link pronto.
              </li>
              <li>
                Ou abra o{" "}
                <Link href="/tutors" className="text-accent underline">
                  painel de tutores
                </Link>
                , va em <strong>Embed</strong> e crie uma chave com{" "}
                <code className="font-mono">{appBaseUrl}</code> nas origens permitidas.
              </li>
              <li>
                Acesse <code className="font-mono">/demo?key=SUA_CHAVE</code> — ou defina{" "}
                <code className="font-mono">NEXT_PUBLIC_DEMO_EMBED_KEY</code> para fixa-la.
              </li>
            </ol>
          </div>
        )}
      </section>
    </main>
  );
}
