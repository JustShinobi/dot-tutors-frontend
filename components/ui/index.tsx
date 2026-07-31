"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

/** Small presentational primitives shared by the admin screens. */

function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

// --- button ----------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:opacity-90",
  secondary: "border border-border bg-surface hover:border-accent",
  danger: "border border-danger text-danger hover:bg-danger/10",
  ghost: "hover:bg-surface",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "focus-visible:outline-accent inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        BUTTON_VARIANTS[variant],
        className,
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

// --- form fields -----------------------------------------------------------

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-muted text-xs">{hint}</p>}
      {error && (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL_CLASS =
  "border-border bg-background focus-visible:outline-accent w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-0 disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(CONTROL_CLASS, className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(CONTROL_CLASS, "font-mono", className)} />;
}

// --- feedback --------------------------------------------------------------

export function StatusBadge({ status }: { status: "active" | "inactive" }) {
  const active = status === "active";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        active ? "bg-accent/15 text-accent" : "bg-surface-strong text-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cx("h-1.5 w-1.5 rounded-full", active ? "bg-accent" : "bg-muted")}
      />
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

export function Alert({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "info";
  children: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cx(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "danger"
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-border bg-surface text-muted",
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-border bg-surface rounded-xl border border-dashed p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-muted mt-1 text-sm">{description}</p>
    </div>
  );
}
