"use client";

import type { ToolActivity } from "@/lib/api/embed";

/**
 * Shows what the agent is doing while it is doing it.
 *
 * This is the one place where the agentic knowledge strategy becomes visible to a user instead
 * of staying an implementation detail: "consulting the sources" is the difference between an
 * answer that was looked up and one that was invented.
 */

const TOOL_LABELS: Record<string, string> = {
  list_sources: "Verificando as fontes disponiveis",
  get_source_outline: "Localizando a secao certa",
  search_source: "Procurando nas fontes",
  fetch_source: "Lendo o documento",
};

export function ToolActivityLine({ activity }: { activity: ToolActivity }) {
  const label = (activity.tool && TOOL_LABELS[activity.tool]) ?? "Consultando o material";

  return (
    <p className="text-muted flex items-center gap-2 px-1 text-xs" role="status" aria-live="polite">
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      {label}
      <span className="animate-pulse">&hellip;</span>
    </p>
  );
}
