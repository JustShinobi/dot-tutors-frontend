"use client";

import { useState } from "react";

import { useAuthenticatedRequest } from "@/components/auth/AuthProvider";
import { Alert, Button, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { addSource, removeSource } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { SourceKind, Tutor } from "@/lib/types";

/** Manages the sources of an existing tutor, one request at a time. */
export function SourceList({ tutor, onChanged }: { tutor: Tutor; onChanged: () => void }) {
  const { token, handleError } = useAuthenticatedRequest();

  const [kind, setKind] = useState<SourceKind>("url");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
          {tutor.sources.map((source) => (
            <li key={source.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{source.label}</p>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-accent truncate text-xs"
                  >
                    {source.url}
                  </a>
                ) : (
                  <p className="text-muted text-xs">Texto colado na configuracao</p>
                )}
              </div>
              <Button variant="danger" loading={busy} onClick={() => handleRemove(source.id)}>
                Remover
              </Button>
            </li>
          ))}
        </ul>
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
