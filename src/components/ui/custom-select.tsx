"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CustomSelectOption {
  label: string;
  value: string;
}

export interface CustomSelectProps {
  value: string;
  onValueChange: (val: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  className,
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<"top" | "bottom">("bottom");
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedLabel = options.find((o: any) => o.value === value)?.label ?? placeholder;

  const updateMenuPosition = useCallback(() => {
    if (typeof window === "undefined" || !triggerRef.current) return;

    const viewportPadding = 12;
    const menuGap = 8;
    const defaultMenuMaxHeight = 320;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(Math.max(rect.width, 220), viewportWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      viewportWidth - width - viewportPadding,
    );
    const spaceBelow = viewportHeight - rect.bottom - viewportPadding - menuGap;
    const spaceAbove = rect.top - viewportPadding - menuGap;
    const placement =
      spaceBelow < 220 && spaceAbove > spaceBelow ? "top" : "bottom";
    const maxHeight = Math.max(
      120,
      Math.min(defaultMenuMaxHeight, placement === "bottom" ? spaceBelow : spaceAbove),
    );

    setMenuPlacement(placement);
    setMenuStyle({
      left,
      top: placement === "bottom" ? rect.bottom + menuGap : rect.top - menuGap,
      width,
      maxHeight,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updateMenuPosition]);

  return (
    <div className={cn("relative min-w-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/90 transition-all outline-none",
          !disabled && "hover:bg-white/[0.04]",
          isOpen && "ring-2 ring-[var(--accent-cyan)]/50 border-[var(--accent-cyan)]/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={cn("h-4 w-4 opacity-50 shrink-0 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} />
              <div
                role="listbox"
                className={cn(
                  "fixed z-[100] overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#121212] py-1 shadow-2xl",
                  menuPlacement === "top" && "-translate-y-full",
                )}
                style={menuStyle}
              >
                {options.map((option: any) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={value === option.value}
                    className={cn(
                      "relative flex w-full items-center px-4 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/10",
                      value === option.value && "bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] font-medium",
                    )}
                    onClick={() => {
                      onValueChange(option.value);
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    <span className="flex-1 truncate pr-6">{option.label}</span>
                    {value === option.value ? <Check className="absolute right-4 h-4 w-4 shrink-0" /> : null}
                  </button>
                ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
