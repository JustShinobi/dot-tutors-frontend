"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui";

/** A read-only code block with a copy button and a transient confirmation. */
export function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2_000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be denied (insecure origin, permission). Selecting the text is
      // still possible, so failing silently is better than an alarming error.
      setCopied(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <Button variant="secondary" onClick={copy}>
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <pre className="border-border bg-surface overflow-x-auto rounded-lg border p-3 text-xs">
        <code>{value}</code>
      </pre>
      <span aria-live="polite" className="sr-only">
        {copied ? "Conteudo copiado" : ""}
      </span>
    </div>
  );
}
