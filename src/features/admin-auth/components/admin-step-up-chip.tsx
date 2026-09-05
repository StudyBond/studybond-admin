"use client";

import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { useDismissable } from "@/lib/utils/use-dismissable";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";

/**
 * Whether sensitive actions are currently unlocked, for superadmins.
 *
 * Three problems, in order of how much they cost:
 *
 * 1. The popover opened on hover only, and the "Clear Session" button lived
 *    inside it. On a phone or tablet there is no hover, so there was no way
 *    to end an elevated session from the UI at all — the one control whose
 *    entire purpose is to close a security window. It opens on click now.
 *
 * 2. The chip read "Armed" and "Locked". Neither word appears anywhere else
 *    in the product, and a new admin has no way to learn that "Armed" means
 *    "you have verified and may now grant premium". It says "Verified" and
 *    "Verify" — the same words as the page it leads to.
 *
 * 3. Colours were hardcoded Tailwind emerald/amber with their own glow
 *    shadows, rather than the semantic success/warning tokens.
 */
export function AdminStepUpChip() {
  const { data: session, isLoading } = useAdminSession();
  const { isActive, stepUp, clear } = useAdminStepUp();
  const { isOpen, setIsOpen, ref } = useDismissable<HTMLDivElement>();

  if (isLoading || session?.user?.role !== "SUPERADMIN") {
    return null;
  }

  /* Not verified: nothing to explain in a popover, so it is simply the link
     to go and verify. */
  if (!isActive || !stepUp) {
    return (
      <Link
        href="/step-up?next=/premium"
        className={cn(
          "flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--sb-radius-full)] border px-3",
          "border-[var(--sb-warning-ring)] bg-[var(--sb-warning-soft)] text-[var(--sb-warning)]",
          "text-[length:var(--sb-text-xs)] font-medium",
          "transition-colors duration-[var(--sb-duration-fast)] hover:bg-[rgba(245,181,68,0.16)]",
        )}
        title="Sensitive actions need step-up verification"
      >
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Verify</span>
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cn(
          "flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--sb-radius-full)] border px-3",
          "border-[var(--sb-success-ring)] bg-[var(--sb-success-soft)] text-[var(--sb-success)]",
          "text-[length:var(--sb-text-xs)] font-medium",
          "transition-colors duration-[var(--sb-duration-fast)] hover:bg-[rgba(74,222,128,0.16)]",
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Verified</span>
      </button>

      {isOpen ? (
        <div
          className={cn(
            "sb-fade absolute right-0 top-full z-50 mt-2 w-72 p-3.5",
            "rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)]",
            "bg-[var(--sb-surface-2)] shadow-[var(--sb-shadow-xl)]",
          )}
        >
          <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
            Sensitive actions unlocked
          </p>
          <p className="mt-1 text-[length:var(--sb-text-base)] leading-relaxed text-[var(--sb-text-secondary)]">
            You can grant premium and change roles until{" "}
            {formatDateTime(stepUp.expiresAt)}. This applies to this browser
            only.
          </p>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3 w-full"
            onClick={() => {
              clear();
              setIsOpen(false);
            }}
          >
            Lock again now
          </Button>
        </div>
      ) : null}
    </div>
  );
}
