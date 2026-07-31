"use client";

import { useState, type FormEvent } from "react";

import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import type { SourceInput, TutorInput } from "@/lib/types";

import { SourceEditor } from "./SourceEditor";

const MIN_INSTRUCTIONS = 10;
const MAX_INSTRUCTIONS = 8_000;

export interface TutorFormProps {
  initial?: Partial<TutorInput>;
  /** Sources are only editable while creating; afterwards they are managed one by one. */
  withSources?: boolean;
  submitLabel: string;
  onSubmit: (payload: TutorInput) => Promise<void>;
  error?: string | null;
  fieldErrors?: { field: string; message: string }[];
}

export function TutorForm({
  initial,
  withSources = false,
  submitLabel,
  onSubmit,
  error,
  fieldErrors = [],
}: TutorFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [greeting, setGreeting] = useState(initial?.greeting ?? "");
  const [instructions, setInstructions] = useState(initial?.system_instructions ?? "");
  const [sources, setSources] = useState<SourceInput[]>(initial?.sources ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function fieldError(name: string): string | undefined {
    return fieldErrors.find((item) => item.field === name)?.message;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    if (instructions.trim().length < MIN_INSTRUCTIONS) {
      setLocalError(
        `As instrucoes precisam ter ao menos ${MIN_INSTRUCTIONS} caracteres: elas definem como o tutor responde.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        system_instructions: instructions.trim(),
        greeting: greeting.trim() || null,
        ...(withSources ? { sources } : {}),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {(error || localError) && <Alert>{error ?? localError}</Alert>}

      <Field label="Titulo" htmlFor="title" error={fieldError("title")}>
        <Input
          id="title"
          required
          minLength={3}
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Tutor de Onboarding"
        />
      </Field>

      <Field
        label="Descricao curta"
        htmlFor="description"
        hint="Aparece na listagem do painel. Nao e enviada ao modelo."
        error={fieldError("description")}
      >
        <Input
          id="description"
          maxLength={280}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ajuda novos colaboradores nas duvidas mais comuns"
        />
      </Field>

      <Field
        label="Mensagem de boas-vindas"
        htmlFor="greeting"
        hint="Primeira mensagem exibida no widget, antes de qualquer pergunta. Opcional."
        error={fieldError("greeting")}
      >
        <Input
          id="greeting"
          maxLength={500}
          value={greeting ?? ""}
          onChange={(event) => setGreeting(event.target.value)}
          placeholder="Ola! Posso ajudar com duvidas sobre o onboarding."
        />
      </Field>

      <Field
        label="Instrucoes de comportamento"
        htmlFor="instructions"
        hint={`Persona, tom e regras. ${instructions.length}/${MAX_INSTRUCTIONS} caracteres. Nao sao expostas ao usuario final.`}
        error={fieldError("system_instructions")}
      >
        <Textarea
          id="instructions"
          required
          rows={10}
          maxLength={MAX_INSTRUCTIONS}
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder={
            "Voce e um tutor de onboarding. Responda em portugues, de forma direta.\n\n" +
            "Consulte as fontes antes de responder e nunca invente informacao que nao esteja nelas."
          }
        />
      </Field>

      {withSources && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-medium">Fontes de conhecimento</h2>
            <p className="text-muted text-xs">
              O agente decide quais consultar em tempo de conversa. Podem ser adicionadas depois.
            </p>
          </div>
          <SourceEditor sources={sources} onChange={setSources} />
        </section>
      )}

      <div className="flex gap-3">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
