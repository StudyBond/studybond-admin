"use client";

import { cn } from "@/lib/utils/cn";
import { Eye, EyeOff, Search } from "lucide-react";
import { forwardRef, useId, useState } from "react";

/**
 * Every control in the admin is built from `controlBase`, so a search box
 * and a text input placed side by side can never end up different heights
 * again. Heights match Button exactly: sm = 32px, md = 36px, lg = 44px.
 */
export const controlBase =
  "w-full rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] text-[var(--sb-text)] " +
  "transition-colors duration-[var(--sb-duration-fast)] outline-none " +
  "placeholder:text-[var(--sb-text-tertiary)] " +
  "hover:border-[var(--sb-border-hover)] " +
  "focus:border-[var(--sb-accent)] focus:ring-2 focus:ring-[var(--sb-accent-ring)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const controlSize = {
  sm: "h-8 px-2.5 text-[length:var(--sb-text-sm)]",
  md: "h-9 px-3 text-[length:var(--sb-text-base)]",
  lg: "h-11 px-3.5 text-[length:var(--sb-text-md)]",
};

const errorStyles =
  "border-[var(--sb-danger)] focus:border-[var(--sb-danger)] focus:ring-[var(--sb-danger-ring)]";

function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <label
        htmlFor={htmlFor}
        className="block text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]"
      >
        {children}
      </label>
      {hint ? (
        <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function ErrorText({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="text-[length:var(--sb-text-xs)] text-[var(--sb-danger)]">
      {children}
    </p>
  );
}

/* ── Text input ──────────────────────────────────────────────── */

type FieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string;
  error?: string;
  hint?: string;
  size?: keyof typeof controlSize;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, className, id, type, size = "md", ...props },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-1.5">
      {label ? (
        <Label htmlFor={fieldId} hint={hint}>
          {label}
        </Label>
      ) : null}
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          type={isPassword && showPassword ? "text" : type}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            controlBase,
            controlSize[size],
            isPassword && "pr-10",
            error && errorStyles,
            className,
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--sb-text-tertiary)] transition-colors hover:text-[var(--sb-text)]"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>
      {error ? <ErrorText id={errorId}>{error}</ErrorText> : null}
    </div>
  );
});

/* ── Search input ────────────────────────────────────────────── */

export const SearchField = forwardRef<
  HTMLInputElement,
  Omit<FieldProps, "type">
>(function SearchField({ className, size = "md", ...props }, ref) {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sb-text-tertiary)]" />
      <input
        ref={ref}
        type="search"
        className={cn(controlBase, controlSize[size], "pl-9", className)}
        {...props}
      />
    </div>
  );
});

/* ── Textarea ────────────────────────────────────────────────── */

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ label, error, hint, className, id, ...props }, ref) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;

    return (
      <div className="space-y-1.5">
        {label ? (
          <Label htmlFor={fieldId} hint={hint}>
            {label}
          </Label>
        ) : null}
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            controlBase,
            "min-h-24 resize-y px-3 py-2 text-[length:var(--sb-text-base)] leading-relaxed",
            error && errorStyles,
            className,
          )}
          {...props}
        />
        {error ? <ErrorText id={errorId}>{error}</ErrorText> : null}
      </div>
    );
  },
);

/* ── Label wrapper for CustomSelect and other non-input controls ─ */

export function FieldShell({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label?: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const generatedId = useId();
  const fieldId = htmlFor ?? generatedId;

  return (
    <div className="space-y-1.5">
      {label ? (
        <Label htmlFor={fieldId} hint={hint}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? <ErrorText id={`${fieldId}-error`}>{error}</ErrorText> : null}
    </div>
  );
}
