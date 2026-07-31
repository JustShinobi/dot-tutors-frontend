"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuthenticatedRequest } from "@/components/auth/AuthProvider";
import { TutorForm } from "@/components/tutors/TutorForm";
import { createTutor } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { TutorInput } from "@/lib/types";

export default function NewTutorPage() {
  const router = useRouter();
  const { token, handleError } = useAuthenticatedRequest();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ field: string; message: string }[]>([]);

  async function handleSubmit(payload: TutorInput) {
    if (!token) return;
    setError(null);
    setFieldErrors([]);
    try {
      const created = await createTutor(token, payload);
      router.push(`/tutors/${created.id}`);
    } catch (caught) {
      if (handleError(caught)) return;
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFieldErrors(caught.fields);
      } else {
        setError("Nao foi possivel criar o tutor.");
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/tutors" className="text-muted hover:text-foreground text-sm">
          &larr; Voltar para a lista
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Novo tutor</h1>
      </div>

      <TutorForm
        withSources
        submitLabel="Criar tutor"
        onSubmit={handleSubmit}
        error={error}
        fieldErrors={fieldErrors}
      />
    </div>
  );
}
