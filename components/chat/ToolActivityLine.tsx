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

/**
 * Naming the source is the point: "procurando nas fontes" says the agent is busy, while
 * "procurando em *Politica de trabalho remoto*" says it is reading a specific document — which
 * is the difference between an answer that was looked up and one that was invented.
 *
 * `source` is absent when the tool takes no source, and when the model asked for an id that does
 * not exist. Both fall back to the generic wording rather than showing a broken name.
 */
const TOOLS_WITH_SOURCE: Record<string, string> = {
  get_source_outline: "Localizando a secao certa em",
  search_source: "Procurando em",
  fetch_source: "Lendo",
};

export function ToolActivityLine({ activity }: { activity: ToolActivity }) {
  const prefix = activity.tool ? TOOLS_WITH_SOURCE[activity.tool] : undefined;
  const generic = (activity.tool && TOOL_LABELS[activity.tool]) ?? "Consultando o material";

  return (
    <p className="text-muted flex items-center gap-2 px-1 text-xs" role="status" aria-live="polite">
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      {prefix && activity.source ? (
        <span>
          {prefix} <span className="font-medium">{activity.source}</span>
        </span>
      ) : (
        generic
      )}
      <span className="animate-pulse">&hellip;</span>
    </p>
  );
}
