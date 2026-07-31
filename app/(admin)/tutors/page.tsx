"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuthenticatedRequest } from "@/components/auth/AuthProvider";
import { Alert, Button, EmptyState, Input, Spinner, StatusBadge } from "@/components/ui";
import { listTutors, setTutorStatus } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import type { TutorPage, TutorStatus, TutorSummary } from "@/lib/types";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function TutorsPage() {
  const { token, handleError } = useAuthenticatedRequest();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TutorStatus | "">("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Debounce so typing does not fire one request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    () =>
      listTutors(token ?? "", {
        q: debouncedSearch || undefined,
        status: statusFilter,
        page,
        size: PAGE_SIZE,
      }),
    [token, debouncedSearch, statusFilter, page],
  );

  const { data, loading, error, patch } = useAsyncData<TutorPage>(load);

  async function toggleStatus(tutor: TutorSummary) {
    if (!token) return;
    setActionError(null);
    setBusyId(tutor.id);
    try {
      const next: TutorStatus = tutor.status === "active" ? "inactive" : "active";
      const updated = await setTutorStatus(token, tutor.id, next);
      patch((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === tutor.id ? { ...item, status: updated.status } : item,
        ),
      }));
    } catch (caught) {
      if (!handleError(caught)) {
        setActionError(caught instanceof ApiError ? caught.message : "Falha ao alterar o status.");
      }
    } finally {
      setBusyId(null);
    }
  }

  const tutors = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const loadError = error
    ? error instanceof ApiError
      ? error.message
      : "Falha ao carregar os tutores."
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tutores</h1>
          <p className="text-muted text-sm">
            {total} {total === 1 ? "tutor cadastrado" : "tutores cadastrados"}
          </p>
        </div>
        <Link
          href="/tutors/new"
          className="bg-accent text-accent-foreground focus-visible:outline-accent rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Novo tutor
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          type="search"
          placeholder="Buscar por titulo, descricao ou identificador"
          aria-label="Buscar tutores"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <select
          aria-label="Filtrar por status"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as TutorStatus | "");
            setPage(1);
          }}
          className="border-border bg-background focus-visible:outline-accent rounded-lg border px-3 py-2 text-sm focus-visible:outline-2"
        >
          <option value="">Todos os status</option>
          <option value="active">Somente ativos</option>
          <option value="inactive">Somente inativos</option>
        </select>
      </div>

      {(loadError || actionError) && <Alert>{loadError ?? actionError}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16" role="status" aria-live="polite">
          <Spinner />
          <span className="sr-only">Carregando tutores</span>
        </div>
      ) : tutors.length === 0 ? (
        <EmptyState
          title="Nenhum tutor encontrado"
          description="Crie um tutor para configurar persona, instrucoes e fontes de conhecimento."
        />
      ) : (
        <ul className="border-border divide-border divide-y rounded-xl border">
          {tutors.map((tutor) => (
            <li key={tutor.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/tutors/${tutor.id}`} className="hover:text-accent font-medium">
                    {tutor.title}
                  </Link>
                  <StatusBadge status={tutor.status} />
                </div>
                <p className="text-muted mt-0.5 truncate text-sm">
                  {tutor.description || "Sem descricao"}
                </p>
                <code className="text-muted font-mono text-xs">{tutor.slug}</code>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/tutors/${tutor.id}/embed`}
                  className="border-border hover:border-accent rounded-lg border px-3 py-1.5 text-sm"
                >
                  Embed
                </Link>
                <Button
                  variant="secondary"
                  loading={busyId === tutor.id}
                  onClick={() => toggleStatus(tutor)}
                >
                  {tutor.status === "active" ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Paginacao">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span className="text-muted text-sm">
            Pagina {page} de {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Proxima
          </Button>
        </nav>
      )}
    </div>
  );
}
