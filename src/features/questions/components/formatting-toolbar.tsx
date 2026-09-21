"use client";

import { cn } from "@/lib/utils/cn";
import {
  Bold,
  Italic,
  Sigma,
  SquareRadical,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Formatting toolbar for a raw-text field.
 *
 * Built for a reviewer who does not want to remember LaTeX or Markdown
 * syntax. Two different behaviors live here on purpose:
 *
 * Text buttons (Bold, Italic, Underline, Strikethrough) wrap a selection —
 * select a word, click Bold, the word is bold. With nothing selected, the
 * cursor lands between the markers, so the next thing typed becomes bold
 * without the admin ever seeing `**`. This is the same behavior every
 * markdown toolbar uses (GitHub, GitLab, Word), so it needs no explanation.
 *
 * Math buttons (Fraction, Underbrace, the symbol palette) do not try to
 * detect whether the cursor is already inside a `$…$` span — that
 * detection is genuinely ambiguous and getting it wrong silently produces
 * broken LaTeX. Instead: the palette symbols (√, θ, π, Ω, ², …) are plain
 * Unicode characters, not LaTeX at all, so they render correctly with no
 * math mode required — this already matches how most of the real question
 * bank is written (`10⁻⁹`, `at²`). Fraction and Underbrace are the two
 * things Unicode cannot express, so those two insert their own complete
 * `$…$` span rather than assuming one already exists.
 */

type FormattingToolbarProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
  className?: string;
};

type Replacement = { text: string; selectStart: number; selectEnd: number };

/** Wraps the selection, or opens a gap for the next thing typed. */
function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
): Replacement {
  const selected = value.slice(start, end);
  const text =
    value.slice(0, start) + before + selected + after + value.slice(end);
  return selected
    ? {
        text,
        selectStart: start + before.length,
        selectEnd: start + before.length + selected.length,
      }
    : {
        text,
        selectStart: start + before.length,
        selectEnd: start + before.length,
      };
}

/** Inserts a complete template, cursor left at the first empty `{}`. */
function insertTemplate(
  value: string,
  start: number,
  end: number,
  template: string,
  cursorOffset: number,
): Replacement {
  const text = value.slice(0, start) + template + value.slice(end);
  return {
    text,
    selectStart: start + cursorOffset,
    selectEnd: start + cursorOffset,
  };
}

/** A literal character or short string, cursor placed right after it. */
function insertLiteral(
  value: string,
  start: number,
  end: number,
  literal: string,
): Replacement {
  const text = value.slice(0, start) + literal + value.slice(end);
  return {
    text,
    selectStart: start + literal.length,
    selectEnd: start + literal.length,
  };
}

const SYMBOLS: Array<{ char: string; label: string }> = [
  { char: "√", label: "Square root" },
  { char: "²", label: "Squared" },
  { char: "³", label: "Cubed" },
  { char: "⁻¹", label: "Inverse" },
  { char: "°", label: "Degree" },
  { char: "±", label: "Plus or minus" },
  { char: "×", label: "Times" },
  { char: "÷", label: "Divide" },
  { char: "≤", label: "Less than or equal" },
  { char: "≥", label: "Greater than or equal" },
  { char: "≈", label: "Approximately" },
  { char: "∞", label: "Infinity" },
  { char: "θ", label: "Theta" },
  { char: "π", label: "Pi" },
  { char: "Ω", label: "Omega" },
  { char: "Σ", label: "Sigma" },
  { char: "Δ", label: "Delta" },
  { char: "μ", label: "Mu" },
  { char: "α", label: "Alpha" },
  { char: "β", label: "Beta" },
];

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // mousedown, not click: a click first fires blur on the textarea,
      // which loses the selection this button needs to read.
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className="flex h-7 min-w-7 items-center justify-center rounded-[var(--sb-radius-sm)] px-1.5 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text-secondary)] transition-colors hover:bg-[var(--sb-surface-3)] hover:text-[var(--sb-text)]"
    >
      {children}
    </button>
  );
}

export function FormattingToolbar({
  textareaRef,
  value,
  onChange,
  className,
}: FormattingToolbarProps) {
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!symbolsOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!paletteRef.current?.contains(event.target as Node)) {
        setSymbolsOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSymbolsOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [symbolsOpen]);

  function apply(build: (start: number, end: number) => Replacement) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { text, selectStart, selectEnd } = build(
      textarea.selectionStart,
      textarea.selectionEnd,
    );
    onChange(text);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectStart, selectEnd);
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-0.5 rounded-t-[var(--sb-radius-sm)] border border-b-0 border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-1",
        className,
      )}
    >
      <ToolbarButton
        label="Bold"
        onClick={() => apply((s, e) => wrapSelection(value, s, e, "**", "**"))}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        onClick={() => apply((s, e) => wrapSelection(value, s, e, "*", "*"))}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        onClick={() =>
          apply((s, e) => wrapSelection(value, s, e, "<u>", "</u>"))
        }
      >
        <Underline className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        onClick={() => apply((s, e) => wrapSelection(value, s, e, "~~", "~~"))}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>

      <span className="mx-0.5 h-4 w-px shrink-0 bg-[var(--sb-border)]" />

      <ToolbarButton
        label="Fraction"
        onClick={() =>
          apply((s, e) =>
            insertTemplate(value, s, e, "$\\frac{}{}$", "$\\frac{".length),
          )
        }
      >
        <span className="text-[length:var(--sb-text-xs)] leading-none">
          a/b
        </span>
      </ToolbarButton>
      <ToolbarButton
        label="Underbrace (labels part of a formula)"
        onClick={() =>
          apply((s, e) =>
            insertTemplate(
              value,
              s,
              e,
              "$\\underbrace{}_{}$",
              "$\\underbrace{".length,
            ),
          )
        }
      >
        <SquareRadical className="h-3.5 w-3.5" />
      </ToolbarButton>

      <span className="mx-0.5 h-4 w-px shrink-0 bg-[var(--sb-border)]" />

      <div ref={paletteRef} className="relative">
        <ToolbarButton
          label="Symbols"
          onClick={() => setSymbolsOpen((open) => !open)}
        >
          <Sigma className="h-3.5 w-3.5" />
        </ToolbarButton>

        {symbolsOpen ? (
          <div className="sb-fade absolute left-0 top-full z-20 mt-1 grid w-56 grid-cols-5 gap-0.5 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] p-1.5 shadow-[var(--sb-shadow)]">
            {SYMBOLS.map((symbol) => (
              <button
                key={symbol.char}
                type="button"
                title={symbol.label}
                aria-label={symbol.label}
                onMouseDown={(event) => {
                  event.preventDefault();
                  apply((s, e) => insertLiteral(value, s, e, symbol.char));
                  setSymbolsOpen(false);
                }}
                className="flex h-8 items-center justify-center rounded-[var(--sb-radius-sm)] text-[length:var(--sb-text-md)] text-[var(--sb-text)] transition-colors hover:bg-[var(--sb-surface-3)]"
              >
                {symbol.char}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
