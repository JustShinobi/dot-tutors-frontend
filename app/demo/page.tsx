import Link from "next/link";

import { ResizingEmbed } from "@/components/embed/ResizingEmbed";

/**
 * A page pretending to be an integrator's website.
 *
 * Exists to prove acceptance criterion 7.3 — "página de widget carregável em iframe e capaz de
 * conversar com o backend" — with a real cross-document `<iframe>`, not a component rendered
 * inline. That distinction matters: an inline widget would silently skip the CSP, the `Origin`
 * check and the third-party storage rules that the embed path actually has to survive.
 */
export default function DemoPage() {
  const embedKey = process.env.NEXT_PUBLIC_DEMO_EMBED_KEY?.trim();
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
            <p className="font-medium">Configure uma chave de embed para ver o widget aqui.</p>
            <ol className="text-muted list-decimal space-y-1 pl-5">
              <li>
                Abra o{" "}
                <Link href="/tutors" className="text-accent underline">
                  painel de tutores
                </Link>
                , escolha um tutor e va em <strong>Embed</strong>.
              </li>
              <li>
                Crie uma chave com <code className="font-mono">{appBaseUrl}</code> nas origens
                permitidas.
              </li>
              <li>
                Copie a chave para <code className="font-mono">NEXT_PUBLIC_DEMO_EMBED_KEY</code> no{" "}
                <code className="font-mono">.env.local</code> e reinicie o servidor.
              </li>
            </ol>
          </div>
        )}
      </section>
    </main>
  );
}
