"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useAuthenticatedRequest } from "@/components/auth/AuthProvider";
import { SourceList } from "@/components/tutors/SourceList";
import { TutorForm } from "@/components/tutors/TutorForm";
import { Alert, Button, Spinner, StatusBadge } from "@/components/ui";
import { deleteTutor, getTutor, setTutorStatus, updateTutor } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { Tutor, TutorInput } from "@/lib/types";

export default function TutorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, handleError } = useAuthenticatedRequest();

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ field: string; message: string }[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => getTutor(token ?? "", params.id), [token, params.id]);
  const { data: tutor, loading, error: loadError, reload, patch } = useAsyncData<Tutor>(load);

  function setTutor(updated: Tutor) {
    patch(() => updated);
  }

  async function handleSave(payload: TutorInput) {
    if (!token) return;
    setError(null);
    setFieldErrors([]);
    setSaved(false);
    try {
      setTutor(await updateTutor(token, params.id, payload));
      setSaved(true);
    } catch (caught) {
      if (handleError(caught)) return;
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFieldErrors(caught.fields);
      } else {
        setError("Nao foi possivel salvar.");
      }
    }
  }

  async function toggleStatus() {
    if (!token || !tutor) return;
    setBusy(true);
    try {
      setTutor(
        await setTutorStatus(token, tutor.id, tutor.status === "active" ? "inactive" : "active"),
      );
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : "Falha ao alterar o status.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!token || !tutor) return;
    const confirmed = window.confirm(
      `Remover "${tutor.title}" definitivamente? Fontes, chaves de embed e historico de conversas ` +
        "serao apagados. Para apenas tirar do ar, prefira desativar.",
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await deleteTutor(token, tutor.id);
      router.push("/tutors");
    } catch (caught) {
      if (!handleError(caught)) {
        setError(caught instanceof ApiError ? caught.message : "Falha ao remover o tutor.");
      }
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16" role="status" aria-live="polite">
        <Spinner />
        <span className="sr-only">Carregando tutor</span>
      </div>
    );
  }

  if (!tutor) {
    const message = loadError instanceof ApiError ? loadError.message : "Tutor nao encontrado.";
    return <Alert>{error ?? message}</Alert>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link href="/tutors" className="text-muted hover:text-foreground text-sm">
          &larr; Voltar para a lista
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{tutor.title}</h1>
            <StatusBadge status={tutor.status} />
          </div>
          <div className="flex gap-2">
            <Link
              href={`/tutors/${tutor.id}/embed`}
              className="border-border hover:border-accent rounded-lg border px-4 py-2 text-sm"
            >
              Chaves de embed
            </Link>
            <Button variant="secondary" loading={busy} onClick={toggleStatus}>
              {tutor.status === "active" ? "Desativar" : "Ativar"}
            </Button>
          </div>
        </div>
        <code className="text-muted font-mono text-xs">{tutor.slug}</code>
      </div>

      {saved && <Alert tone="info">Alteracoes salvas.</Alert>}

      <TutorForm
        initial={{
          title: tutor.title,
          description: tutor.description,
          greeting: tutor.greeting,
          system_instructions: tutor.system_instructions,
        }}
        submitLabel="Salvar alteracoes"
        onSubmit={handleSave}
        error={error}
        fieldErrors={fieldErrors}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Fontes de conhecimento</h2>
          <p className="text-muted text-sm">
            O agente escolhe quais consultar durante a conversa. Nada e indexado previamente.
          </p>
        </div>
        <SourceList tutor={tutor} onChanged={reload} />
      </section>

      <section className="border-danger/30 space-y-3 rounded-xl border p-4">
        <div>
          <h2 className="text-danger text-sm font-medium">Zona de risco</h2>
          <p className="text-muted text-xs">
            Desativar mantem o tutor e o historico, e o widget passa a informar indisponibilidade.
            Remover apaga tudo.
          </p>
        </div>
        <Button variant="danger" loading={busy} onClick={handleDelete}>
          Remover tutor
        </Button>
      </section>
    </div>
  );
}
