"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useEffect, useRef, useState } from "react";

/**
 * A destructive action that asks once before it fires.
 *
 * The admin had no confirmation anywhere. One click banned an account,
 * removed someone's device, or promoted a user to superadmin — the same
 * single click that opens a menu elsewhere in the app. These actions are
 * audited and mostly reversible, but they affect a real person immediately,
 * and "Ban user" sat directly below a free-text note field where the cursor
 * already was.
 *
 * A dialog would be heavier than this needs. The button arms instead: the
 * first click replaces it with "Confirm" and "Cancel" in the same slot, so
 * nothing moves on the page and the decision stays where the eye already is.
 *
 * Arming clears itself after a while — an armed destructive button left on
 * screen is a trap for whoever walks past next.
 */

const ARMED_TIMEOUT_MS = 6000;

export function ConfirmButton({
  children,
  confirmLabel = "Confirm",
  onConfirm,
  variant = "danger",
  size = "md",
  disabled,
  isLoading,
  className,
  icon,
}: {
  children: React.ReactNode;
  /** What the armed button says. Name the outcome: "Yes, ban", "Remove". */
  confirmLabel?: string;
  onConfirm: () => void;
  variant?: "danger" | "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  icon?: React.ReactNode;
}) {
  const [wasArmed, setWasArmed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* A request already in flight cannot be un-asked, so it is never armed —
     derived rather than synced through an effect. */
  const isArmed = wasArmed && !isLoading;

  useEffect(() => {
    if (!isArmed) return;

    timeoutRef.current = setTimeout(() => setWasArmed(false), ARMED_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isArmed]);

  if (!isArmed) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled || isLoading}
        isLoading={isLoading}
        onClick={() => setWasArmed(true)}
        className={className}
      >
        {icon}
        {children}
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        autoFocus
        onClick={() => {
          setWasArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size={size}
        onClick={() => setWasArmed(false)}
      >
        Cancel
      </Button>
    </div>
  );
}
