"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Field, FieldShell, TextArea } from "@/components/ui/field";
import { SectionTitle } from "@/components/ui/page-header";
import { usePremiumMutations } from "@/features/premium/hooks/use-premium-mutations";
import { cn } from "@/lib/utils/cn";
import { Crown, Gift, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";

/**
 * Grant, extend, or revoke premium for one user.
 *
 * Four things were wrong beyond the styling:
 *
 * 1. The step-up prompt appeared twice — a "Verify" link in the status bar
 *    at the top, and an amber box at the bottom saying the same thing. One
 *    prompt, at the point of action.
 *
 * 2. The submit button disabled itself silently. `canSubmit` requires a
 *    non-empty note, but the only hint was a red asterisk on the label, so
 *    a dead button looked like a broken page. It now says what it is
 *    waiting for.
 *
 * 3. Revoke — described in its own copy as "immediately revoke all active
 *    admin entitlements" — fired on a single click, in the same position
 *    the grant button had occupied a moment earlier. It confirms now.
 *
 * 4. A `compact` prop threaded `mt-3`/`mt-5` ternaries through six places
 *    to produce two nearly identical layouts. There is one layout.
 */

type PremiumActionKind = "grant" | "extend" | "revoke";
type EntitlementKind = "MANUAL" | "PROMOTIONAL" | "CORRECTIVE";

const ACTIONS: {
  value: PremiumActionKind;
  label: string;
  icon: typeof Crown;
  description: string;
}[] = [
  {
    value: "grant",
    label: "Grant",
    icon: Crown,
    description: "Give this user premium access for a fixed number of days.",
  },
  {
    value: "extend",
    label: "Extend",
    icon: Gift,
    description: "Add more days on top of the access they already have.",
  },
  {
    value: "revoke",
    label: "Revoke",
    icon: XCircle,
    description:
      "End every admin-granted entitlement now. Paid subscriptions are not affected.",
  },
];

const DURATION_PRESETS = [7, 30, 90, 180, 365];

const KIND_OPTIONS = [
  { value: "MANUAL", label: "Manual — a standard admin grant" },
  { value: "PROMOTIONAL", label: "Promotional — a campaign or giveaway" },
  { value: "CORRECTIVE", label: "Corrective — fixing something that broke" },
];

interface PremiumActionPanelProps {
  userId: number | null;
  userName?: string;
  isPremium: boolean;
  isStepUpActive: boolean;
  stepUpToken: string | null | undefined;
  stepUpRedirectUrl: string;
}

export function PremiumActionPanel({
  userId,
  userName,
  isPremium,
  isStepUpActive,
  stepUpToken,
  stepUpRedirectUrl,
}: PremiumActionPanelProps) {
  const [actionType, setActionType] = useState<PremiumActionKind>(
    isPremium ? "extend" : "grant",
  );
  const [entitlementKind, setEntitlementKind] =
    useState<EntitlementKind>("MANUAL");
  const [durationDays, setDurationDays] = useState("30");
  const [note, setNote] = useState("");

  const { grantMutation, extendMutation, revokeMutation, isPending } =
    usePremiumMutations({
      userId,
      stepUpToken,
      onSuccess: () => setNote(""),
    });

  const activeAction =
    ACTIONS.find((action) => action.value === actionType) ?? ACTIONS[0];
  const isRevoke = actionType === "revoke";

  const days = Number.parseInt(durationDays, 10);
  const hasValidDuration = Number.isFinite(days) && days > 0;
  const hasNote = note.trim().length > 0;

  /**
   * Say which requirement is unmet, rather than leaving a dead button. The
   * order matters: verification first, because it blocks everything else.
   */
  const blockedReason = !userId
    ? "Select a user first."
    : !isStepUpActive
      ? "Verify with step-up before changing premium access."
      : !hasNote
        ? "Add a note explaining why. It is saved to the audit log."
        : !isRevoke && !hasValidDuration
          ? "Enter how many days this should last."
          : null;

  const canSubmit = !blockedReason && !isPending;

  function handleSubmit() {
    if (!userId || !canSubmit) return;

    const trimmedNote = note.trim();

    if (isRevoke) {
      revokeMutation.mutate({ note: trimmedNote });
      return;
    }

    grantOrExtend(trimmedNote);
  }

  function grantOrExtend(trimmedNote: string) {
    const payload = {
      kind: entitlementKind,
      durationDays: days,
      note: trimmedNote,
    };

    if (actionType === "grant") {
      grantMutation.mutate(payload);
    } else {
      extendMutation.mutate(payload);
    }
  }

  return (
    <section className="min-w-0 space-y-3">
      <SectionTitle
        title="Premium actions"
        description={
          userName ? `Change what ${userName.split(" ")[0]} has access to.` : undefined
        }
        action={
          isPremium ? (
            <Badge tone="premium">Has premium</Badge>
          ) : (
            <Badge tone="neutral">Free</Badge>
          )
        }
      />

      <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
        {/* ── Which action ─────────────────────────────────── */}
        <div
          role="group"
          aria-label="Premium action"
          className="grid grid-cols-3 gap-1 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-1"
        >
          {ACTIONS.map((action) => {
            const isActive = action.value === actionType;
            const Icon = action.icon;
            return (
              <button
                key={action.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActionType(action.value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-[var(--sb-radius-sm)] px-2 py-2",
                  "text-[length:var(--sb-text-sm)] font-medium",
                  "transition-colors duration-[var(--sb-duration-fast)]",
                  isActive
                    ? /* Revoke reads as destructive even before you commit. */
                      action.value === "revoke"
                      ? "bg-[var(--sb-danger-soft)] text-[var(--sb-danger)]"
                      : "bg-[var(--sb-surface-3)] text-[var(--sb-text)]"
                    : "text-[var(--sb-text-secondary)] hover:bg-[var(--sb-surface-2)] hover:text-[var(--sb-text)]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {action.label}
              </button>
            );
          })}
        </div>

        <p className="mt-2.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
          {activeAction.description}
        </p>

        {/* ── Fields ───────────────────────────────────────── */}
        <div className="mt-4 space-y-4">
          {!isRevoke ? (
            <>
              <FieldShell label="How long">
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_PRESETS.map((preset) => {
                    const isActive = durationDays === String(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setDurationDays(String(preset))}
                        className={cn(
                          "rounded-[var(--sb-radius-full)] border px-3 py-1.5",
                          "text-[length:var(--sb-text-xs)] font-medium",
                          "transition-colors duration-[var(--sb-duration-fast)]",
                          isActive
                            ? "border-[var(--sb-accent-ring)] bg-[var(--sb-accent-soft)] text-[var(--sb-accent-text)]"
                            : "border-[var(--sb-border)] bg-[var(--sb-surface-2)] text-[var(--sb-text-secondary)] hover:border-[var(--sb-border-hover)] hover:text-[var(--sb-text)]",
                        )}
                      >
                        {preset} days
                      </button>
                    );
                  })}
                </div>

                {/* Was a 7rem box wedged next to the word "or". */}
                <div className="mt-2">
                  <Field
                    value={durationDays}
                    onChange={(event) =>
                      setDurationDays(event.target.value.replace(/[^\d]/g, ""))
                    }
                    inputMode="numeric"
                    size="sm"
                    placeholder="Or type a number of days"
                    aria-label="Custom number of days"
                  />
                </div>
              </FieldShell>

              <FieldShell label="Why this grant exists">
                <CustomSelect
                  aria-label="Grant type"
                  value={entitlementKind}
                  onValueChange={(value) =>
                    setEntitlementKind(value as EntitlementKind)
                  }
                  options={KIND_OPTIONS}
                />
              </FieldShell>
            </>
          ) : null}

          <TextArea
            label="Note"
            hint="Required"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              isRevoke
                ? "Why is this access being taken away?"
                : "Why is this access being given?"
            }
          />

          {/* ── Commit ─────────────────────────────────────── */}
          {isRevoke ? (
            <ConfirmButton
              variant="danger"
              className="w-full"
              confirmLabel="Yes, revoke all entitlements"
              onConfirm={handleSubmit}
              disabled={!canSubmit}
              isLoading={isPending}
              icon={<XCircle className="h-4 w-4" />}
            >
              Revoke premium
            </ConfirmButton>
          ) : (
            <Button
              type="button"
              className="w-full"
              onClick={handleSubmit}
              disabled={!canSubmit}
              isLoading={isPending}
            >
              {!isPending ? <activeAction.icon className="h-4 w-4" /> : null}
              {actionType === "grant"
                ? `Grant ${hasValidDuration ? days : "—"} days`
                : `Extend by ${hasValidDuration ? days : "—"} days`}
            </Button>
          )}

          {/* One prompt, next to the control it unblocks. */}
          {blockedReason ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 py-2.5">
              <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
                {blockedReason}
              </p>
              {!isStepUpActive ? (
                <Button
                  asChild
                  href={`/step-up?next=${encodeURIComponent(
                    stepUpRedirectUrl,
                  )}&intent=Premium%20access%20change`}
                  variant="secondary"
                  size="sm"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verify
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
