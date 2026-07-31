"use client";

import { useState } from "react";

import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import type { SourceInput, SourceKind } from "@/lib/types";

const MAX_SOURCES = 10;

interface SourceEditorProps {
  sources: SourceInput[];
  onChange: (sources: SourceInput[]) => void;
}

/** Builds the list of sources sent when creating a tutor. */
export function SourceEditor({ sources, onChange }: SourceEditorProps) {
  const [kind, setKind] = useState<SourceKind>("url");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);

    if (!label.trim()) {
      setError("Informe um titulo para a fonte.");
      return;
    }
    if (sources.length >= MAX_SOURCES) {
      setError(`Um tutor aceita no maximo ${MAX_SOURCES} fontes.`);
      return;
    }

    if (kind === "url") {
      if (!/^https?:\/\/.+/i.test(url.trim())) {
        setError("A URL precisa comecar com http:// ou https://.");
        return;
      }
      onChange([...sources, { kind, label: label.trim(), url: url.trim() }]);
    } else {
      if (!content.trim()) {
        setError("Cole o conteudo da fonte.");
        return;
      }
      onChange([...sources, { kind, label: label.trim(), content }]);
    }

    setLabel("");
    setUrl("");
    setContent("");
  }

  return (
    <div className="border-border space-y-4 rounded-xl border p-4">
      {sources.length > 0 && (
        <ul className="divide-border divide-y">
          {sources.map((source, index) => (
            <li key={`${source.label}-${index}`} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{source.label}</p>
                <p className="text-muted truncate text-xs">
                  {source.kind === "url" ? source.url : "Texto colado"}
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                onClick={() => onChange(sources.filter((_, position) => position !== index))}
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error && <Alert>{error}</Alert>}

      <div className="space-y-3">
        <Field label="Tipo de fonte" htmlFor="source-kind">
          <select
            id="source-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as SourceKind)}
            className="border-border bg-background focus-visible:outline-accent w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-2"
          >
            <option value="url">URL publica (texto, markdown, HTML ou JSON)</option>
            <option value="inline_text">Texto colado</option>
          </select>
        </Field>

        <Field label="Titulo da fonte" htmlFor="source-label">
          <Input
            id="source-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Politica de trabalho remoto"
          />
        </Field>

        {kind === "url" ? (
          <Field
            label="URL"
            htmlFor="source-url"
            hint="Precisa ser acessivel publicamente. Enderecos de rede interna sao recusados."
          >
            <Input
              id="source-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://exemplo.com/politica.md"
            />
          </Field>
        ) : (
          <Field
            label="Conteudo"
            htmlFor="source-content"
            hint="Use titulos markdown (##) para o agente conseguir navegar pelas secoes."
          >
            <Textarea
              id="source-content"
              rows={6}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={"# Politica\n\n## Ferias\n30 dias por periodo aquisitivo."}
            />
          </Field>
        )}

        <Button type="button" variant="secondary" onClick={add}>
          Adicionar fonte
        </Button>
      </div>
    </div>
  );
}
