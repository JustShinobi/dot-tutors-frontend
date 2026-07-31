"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button, Spinner } from "@/components/ui";

/** Shell for the authenticated screens. Redirects out when there is no valid session. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, profile, logout } = useAuth();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex flex-1 items-center justify-center" role="status" aria-live="polite">
        <Spinner />
        <span className="sr-only">Carregando</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-border bg-surface border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <nav className="flex items-center gap-4" aria-label="Principal">
            <Link href="/tutors" className="font-semibold">
              DOT Tutors
            </Link>
            <Link href="/tutors" className="text-muted hover:text-foreground text-sm">
              Tutores
            </Link>
            <Link href="/demo" className="text-muted hover:text-foreground text-sm">
              Demo do embed
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-muted hidden text-sm sm:inline">{profile?.email}</span>
            <Button variant="ghost" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
