import Link from "next/link";

const destinations = [
  {
    href: "/tutors",
    title: "Painel administrativo",
    description: "Criar, editar, ativar e desativar tutores; gerar chaves e snippets de embed.",
  },
  {
    href: "/demo",
    title: "Demonstração do embed",
    description: "Página que simula o site de um integrador carregando o widget em um iframe.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-3">
        <p className="text-muted text-sm font-medium tracking-wide uppercase">
          DOT Digital Group · desafio técnico
        </p>
        <h1 className="text-3xl font-semibold text-balance sm:text-4xl">
          Plataforma de tutores personalizados
        </h1>
        <p className="text-muted max-w-2xl text-base">
          Configure tutores com persona, instruções e fontes de conhecimento, e distribua o chat
          para qualquer site através de um <code className="font-mono text-sm">&lt;iframe&gt;</code>
          .
        </p>
      </header>

      <nav aria-label="Seções" className="grid gap-4 sm:grid-cols-2">
        {destinations.map((destination) => (
          <Link
            key={destination.href}
            href={destination.href}
            className="border-border bg-surface hover:border-accent focus-visible:outline-accent group rounded-xl border p-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <h2 className="group-hover:text-accent font-medium transition-colors">
              {destination.title}
            </h2>
            <p className="text-muted mt-1 text-sm">{destination.description}</p>
          </Link>
        ))}
      </nav>
    </main>
  );
}
