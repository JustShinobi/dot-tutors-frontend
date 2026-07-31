"use client";

import { useCallback, useState } from "react";

import { useAuthenticatedRequest } from "@/components/auth/AuthProvider";
import { Alert, Button, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { addSource, getSourcesStatus, refreshSource, removeSource } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { SourceKind, SourceStatus, Tutor } from "@/lib/types";

/** Whether the agent can read this source, and how much of it there is. */
function SourceHealth({ status }: { status: SourceStatus }) {
  if (!status.available) {
    return (
      <span className="bg-danger/10 text-danger rounded-full px-2 py-0.5 text-[11px] font-medium">
        Nao foi possivel ler
      </span>
    );
  }

  const sections = status.section_count > 0 ? `, ${status.section_count} secoes` : "";
  return (
    <span className="text-muted border-border rounded-full border px-2 py-0.5 text-[11px]">
      {status.characters.toLocaleString("pt-BR")} caracteres{sections}
    </span>
  );
}

/** Manages the sources of an existing tutor, one request at a time. */
export function SourceList({ tutor, onChanged }: { tutor: Tutor; onChanged: () => void }) {
  const { token, handleError } = useAuthenticatedRequest();

  const [kind, setKind] = useState<SourceKind>("url");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * Ask the backend what it can actually read.
   *
   * A URL that the fetcher refuses looks identical here to one that works — the difference only
   * showed up mid-conversation, which is the worst possible moment to discover it.
   *
   * Loaded through `useAsyncData` rather than a hand-rolled effect: React 19 rejects a
   * synchronous `setState` in an effect body, and that hook already encodes the correct pattern.
   */
  const sourceCount = tutor.sources.length;
  const loadStatuses = useCallback(async () => {
    if (!token || sourceCount === 0) return {} as Record<string, SourceStatus>;
    const all = await getSourcesStatus(token, tutor.id);
    return Object.fromEntries(all.map((item) => [item.source_id, item]));
  }, [token, tutor.id, sourceCount]);

  const {
    data: statuses,
    loading: checking,
    patch: patchStatuses,
  } = useAsyncData<Record<string, SourceStatus>>(loadStatuses);

  async function handleRefresh(sourceId: string) {
    if (!token) return;
    setBusy(true);
    try {
      const updated = await refreshSource(token, tutor.id, sourceId);
      patchStatuses((current) => ({ ...current, [sourceId]: updated }));
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : "Falha ao reprocessar a fonte.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    if (!token) return;
    setError(null);

    if (!label.trim()) {
      setError("Informe um titulo para a fonte.");
      return;
    }

    setBusy(true);
    try {
      await addSource(token, tutor.id, {
        kind,
        label: label.trim(),
        ...(kind === "url" ? { url: url.trim() } : { content }),
      });
      setLabel("");
      setUrl("");
      setContent("");
      onChanged();
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : "Falha ao adicionar a fonte.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(sourceId: string) {
    if (!token) return;
    setBusy(true);
    try {
      await removeSource(token, tutor.id, sourceId);
      onChanged();
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : "Falha ao remover a fonte.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {tutor.sources.length === 0 ? (
        <EmptyState
          title="Nenhuma fonte configurada"
          description="Sem fontes, o tutor responde apenas com base nas instrucoes."
        />
      ) : (
        <ul className="border-border divide-border divide-y rounded-xl border">
          {tutor.sources.map((source) => {
            const status = statuses?.[source.id];
            return (
              <li key={source.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{source.label}</p>
                    {status && <SourceHealth status={status} />}
                  </div>
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted hover:text-accent block truncate text-xs"
                    >
                      {source.url}
                    </a>
                  ) : (
                    <p className="text-muted text-xs">Texto colado na configuracao</p>
                  )}
                  {status?.error && <p className="text-danger mt-1 text-xs">{status.error}</p>}
                </div>

                <div className="flex items-center gap-2">
                  {source.kind === "url" && (
                    <Button
                      variant="secondary"
                      loading={busy}
                      onClick={() => handleRefresh(source.id)}
                    >
                      Reprocessar
                    </Button>
                  )}
                  <Button variant="danger" loading={busy} onClick={() => handleRemove(source.id)}>
                    Remover
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {checking && (
        <p className="text-muted text-xs" role="status" aria-live="polite">
          Verificando o que o agente consegue ler...
        </p>
      )}

      {error && <Alert>{error}</Alert>}

      <div className="border-border space-y-3 rounded-xl border p-4">
        <Field label="Tipo" htmlFor="new-source-kind">
          <select
            id="new-source-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as SourceKind)}
            className="border-border bg-background focus-visible:outline-accent w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-2"
          >
            <option value="url">URL publica</option>
            <option value="inline_text">Texto colado</option>
          </select>
        </Field>

        <Field label="Titulo da fonte" htmlFor="new-source-label">
          <Input
            id="new-source-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </Field>

        {kind === "url" ? (
          <Field
            label="URL"
            htmlFor="new-source-url"
            hint="Enderecos de rede interna sao recusados pelo backend."
          >
            <Input
              id="new-source-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://exemplo.com/politica.md"
            />
          </Field>
        ) : (
          <Field label="Conteudo" htmlFor="new-source-content">
            <Textarea
              id="new-source-content"
              rows={6}
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </Field>
        )}

        <Button variant="secondary" loading={busy} onClick={handleAdd}>
          Adicionar fonte
        </Button>
      </div>
    </div>
  );
}
