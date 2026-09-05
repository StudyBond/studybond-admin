"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { controlBase, controlSize } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

export interface CustomSelectOption {
  label: string;
  value: string;
}

export interface CustomSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: keyof typeof controlSize;
  "aria-label"?: string;
}

/**
 * Shares `controlBase` and `controlSize` with Field, so a select and a text
 * input placed next to each other are exactly the same height. They were
 * previously 44px and 36px respectively, which is why filter rows looked
 * ragged.
 *
 * Also adds arrow-key navigation — the old version was mouse-only.
 */
export function CustomSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select",
  className,
  disabled = false,
  size = "md",
  "aria-label": ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const selected = options.find((option) => option.value === value);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const padding = 12;
    const gap = 6;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(
      Math.max(rect.width, 200),
      window.innerWidth - padding * 2,
    );
    const left = Math.min(
      Math.max(rect.left, padding),
      window.innerWidth - width - padding,
    );
    const spaceBelow = window.innerHeight - rect.bottom - padding - gap;
    const spaceAbove = rect.top - padding - gap;
    const next = spaceBelow < 200 && spaceAbove > spaceBelow ? "top" : "bottom";

    setPlacement(next);
    setMenuStyle({
      left,
      top: next === "bottom" ? rect.bottom + gap : rect.top - gap,
      width,
      maxHeight: Math.max(
        120,
        Math.min(288, next === "bottom" ? spaceBelow : spaceAbove),
      ),
    });
  }, []);

  /**
   * Measuring and highlighting happen as part of opening, not as an effect
   * that reacts to having opened. Doing it in the effect meant three
   * setState calls fired synchronously on every open — a cascading render
   * that measured the trigger one frame after the menu had already painted,
   * which is what made the menu visibly jump into place on slower machines.
   */
  function openMenu() {
    updatePosition();
    setActiveIndex(options.findIndex((option) => option.value === value));
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => {
          const step = event.key === "ArrowDown" ? 1 : -1;
          const next = current + step;
          if (next < 0) return options.length - 1;
          if (next >= options.length) return 0;
          return next;
        });
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const option = options[activeIndex];
        if (option) {
          onValueChange(option.value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, options, value, activeIndex, onValueChange, updatePosition]);

  return (
    <div className={cn("relative min-w-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        className={cn(
          controlBase,
          controlSize[size],
          "flex items-center justify-between gap-2 text-left",
          isOpen &&
            "border-[var(--sb-accent)] ring-2 ring-[var(--sb-accent-ring)]",
          !selected && "text-[var(--sb-text-tertiary)]",
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--sb-text-tertiary)] transition-transform duration-[var(--sb-duration-fast)]",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-[90]"
                onClick={() => setIsOpen(false)}
              />
              <div
                role="listbox"
                aria-label={ariaLabel}
                style={menuStyle}
                className={cn(
                  "fixed z-[100] overflow-y-auto overscroll-contain rounded-[var(--sb-radius)] border border-[var(--sb-border-hover)] bg-[var(--sb-surface-3)] p-1 shadow-[var(--sb-shadow-xl)]",
                  placement === "top" && "-translate-y-full",
                )}
              >
                {options.map((option, index) => {
                  const isSelected = option.value === value;
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        onValueChange(option.value);
                        setIsOpen(false);
                        triggerRef.current?.focus();
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-[var(--sb-radius-sm)] px-2.5 py-1.5 text-left",
                        "text-[length:var(--sb-text-base)] transition-colors duration-[var(--sb-duration-fast)]",
                        isActive
                          ? "bg-[var(--sb-surface-hover)] text-[var(--sb-text)]"
                          : "text-[var(--sb-text-secondary)]",
                        isSelected && "font-medium text-[var(--sb-accent-text)]",
                      )}
                    >
                      <span className="flex-1 truncate">{option.label}</span>
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
