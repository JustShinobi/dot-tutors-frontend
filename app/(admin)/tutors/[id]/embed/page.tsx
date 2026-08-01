"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";

import { useAuthenticatedRequest } from "@/components/auth/AuthProvider";
import { CopyBlock } from "@/components/embed/CopyBlock";
import { Alert, Button, EmptyState, Field, Input, Spinner } from "@/components/ui";
import {
  createEmbedKey,
  getEmbedSnippet,
  getTutor,
  listEmbedKeys,
  revokeEmbedKey,
} from "@/lib/api/admin";
import { describeError } from "@/lib/api/describe";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { EmbedKey, EmbedSnippet, Tutor } from "@/lib/types";

export default function EmbedPage() {
  const params = useParams<{ id: string }>();
  const { token, handleError } = useAuthenticatedRequest();

  const [chosenKeyId, setChosenKeyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [label, setLabel] = useState("");
  // Sugerida a partir da URL publica desta instalacao, e nao de um localhost fixo. O campo e
  // enviado como esta, e o backend so aplica `EMBED_DEFAULT_ORIGINS` quando ele chega vazio —
  // entao um valor fixo aqui vencia a configuracao do ambiente e toda chave criada pelo painel
  // em producao nascia com uma allowlist que nao corresponde a nenhum dominio real. O widget
  // respondia 403 na abertura da sessao, sem indicar o motivo.
  const [origins, setOrigins] = useState(
    process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000",
  );

  const load = useCallback(async (): Promise<{ tutor: Tutor; keys: EmbedKey[] }> => {
    const [tutor, keys] = await Promise.all([
      getTutor(token ?? "", params.id),
      listEmbedKeys(token ?? "", params.id),
    ]);
    return { tutor, keys };
  }, [token, params.id]);

  const { data, loading, error: loadError, reload } = useAsyncData(load);

  const tutor = data?.tutor ?? null;
  const keys = data?.keys ?? [];
  // Falls back to the first usable key so the snippet is visible without an extra click.
  const selected = chosenKeyId ?? keys.find((key) => key.is_active)?.id ?? null;

  const loadSnippet = useCallback(
    () =>
      selected
        ? getEmbedSnippet(token ?? "", params.id, selected)
        : Promise.resolve(null as EmbedSnippet | null),
    [token, params.id, selected],
  );

  const { data: snippet } = useAsyncData<EmbedSnippet | null>(loadSnippet);

  const message =
    error ?? (loadError ? describeError(loadError, "Falha ao carregar as chaves.") : null);

  async function handleCreate() {
    if (!token) return;
    setError(null);
    setBusy(true);
    try {
      const allowed = origins
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean);

      const created = await createEmbedKey(token, params.id, {
        label: label.trim(),
        allowed_origins: allowed,
      });
      setLabel("");
      setChosenKeyId(created.id);
      reload();
    } catch (caught) {
      if (!handleError(caught)) {
        setError(describeError(caught, "Falha ao criar a chave."));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (!token) return;
    if (!window.confirm("Revogar esta chave? Sites que a usam deixarao de abrir novas sessoes.")) {
      return;
    }
    setBusy(true);
    try {
      await revokeEmbedKey(token, keyId);
      if (chosenKeyId === keyId) setChosenKeyId(null);
      reload();
    } catch (caught) {
      if (!handleError(caught)) {
        setError(describeError(caught, "Falha ao revogar a chave."));
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16" role="status" aria-live="polite">
        <Spinner />
        <span className="sr-only">Carregando</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/tutors/${params.id}`} className="text-muted hover:text-foreground text-sm">
          &larr; Voltar para o tutor
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Incorporacao</h1>
        <p className="text-muted text-sm">{tutor?.title}</p>
      </div>

      {message && <Alert>{message}</Alert>}

      <Alert tone="info">
        A chave de embed e <strong>publica por natureza</strong>: ela aparece no HTML do site
        integrador e qualquer visitante consegue le-la. O que protege o tutor e a lista de origens
        autorizadas, verificada a cada abertura de sessao. Nenhuma credencial do modelo de linguagem
        trafega pelo navegador.
      </Alert>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Chaves</h2>

        {keys.length === 0 ? (
          <EmptyState
            title="Nenhuma chave criada"
            description="Crie uma chave para gerar o snippet de incorporacao."
          />
        ) : (
          <ul className="border-border divide-border divide-y rounded-xl border">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-wrap items-center gap-3 p-3">
                <input
                  type="radio"
                  name="embed-key"
                  id={`key-${key.id}`}
                  checked={selected === key.id}
                  onChange={() => setChosenKeyId(key.id)}
                  disabled={!key.is_active}
                  className="accent-accent"
                />
                <label htmlFor={`key-${key.id}`} className="min-w-0 flex-1 cursor-pointer">
                  <span className="block truncate font-mono text-xs">{key.public_key}</span>
                  <span className="text-muted block truncate text-xs">
                    {key.label || "sem rotulo"} &middot;{" "}
                    {key.allowed_origins.length > 0
                      ? key.allowed_origins.join(", ")
                      : "qualquer origem (somente desenvolvimento)"}
                  </span>
                </label>
                {key.is_active ? (
                  <Button variant="danger" loading={busy} onClick={() => handleRevoke(key.id)}>
                    Revogar
                  </Button>
                ) : (
                  <span className="text-muted text-xs">Revogada</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="border-border space-y-3 rounded-xl border p-4">
          <Field label="Rotulo" htmlFor="key-label" hint="Para voce identificar onde ela e usada.">
            <Input
              id="key-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Site institucional"
            />
          </Field>
          <Field
            label="Origens permitidas"
            htmlFor="key-origins"
            hint="Uma por linha, no formato https://site.com. Sem caminho e sem barra final."
          >
            <Input
              id="key-origins"
              value={origins}
              onChange={(event) => setOrigins(event.target.value)}
            />
          </Field>
          <Button variant="secondary" loading={busy} onClick={handleCreate}>
            Criar chave
          </Button>
        </div>
      </section>

      {snippet && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Snippet de incorporacao</h2>

          <CopyBlock label="Cole no HTML do seu site" value={snippet.iframe_html} />
          <CopyBlock label="URL do widget" value={snippet.embed_url} />

          <ul className="text-muted list-disc space-y-1 pl-5 text-sm">
            {snippet.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Previa</h3>
            <iframe
              src={snippet.embed_url}
              title={`Previa do tutor ${snippet.tutor_title}`}
              width={400}
              height={560}
              className="border-border rounded-xl border"
            />
          </div>
        </section>
      )}
    </div>
  );
}
