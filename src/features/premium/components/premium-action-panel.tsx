"use client";

import Link from "next/link";
import { Surface } from "@/components/ui/surface";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { usePremiumMutations } from "@/features/premium/hooks/use-premium-mutations";
import {
  ArrowRight,
  Crown,
  Gift,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useState } from "react";

type PremiumActionKind = "grant" | "extend" | "revoke";
type EntitlementKind = "MANUAL" | "PROMOTIONAL" | "CORRECTIVE";

const actionConfig: Record<
  PremiumActionKind,
  {
    tone: "emerald" | "cyan" | "rose";
    icon: typeof Crown;
    label: string;
    description: string;
  }
> = {
  grant: {
    tone: "emerald",
    icon: Crown,
    label: "Grant premium",
    description: "Issue a new premium entitlement for this user.",
  },
  extend: {
    tone: "cyan",
    icon: Gift,
    label: "Extend premium",
    description: "Add more time to the user's existing premium access.",
  },
  revoke: {
    tone: "rose",
    icon: XCircle,
    label: "Revoke premium",
    description: "Immediately revoke all active admin entitlements.",
  },
};

const durationPresets = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "180 days", value: 180 },
  { label: "365 days", value: 365 },
];

interface PremiumActionPanelProps {
  userId: number | null;
  userName?: string;
  isPremium: boolean;
  isStepUpActive: boolean;
  stepUpToken: string | null | undefined;
  stepUpRedirectUrl: string;
  /** Compact mode hides the eyebrow and shows a more condensed layout */
  compact?: boolean;
}

export function PremiumActionPanel({
  userId,
  userName,
  isPremium,
  isStepUpActive,
  stepUpToken,
  stepUpRedirectUrl,
  compact = false,
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

  function handleSubmit() {
    if (!userId) return;

    const trimmedNote = note.trim();
    if (!trimmedNote) return;

    if (actionType === "revoke") {
      revokeMutation.mutate({ note: trimmedNote });
      return;
    }

    const days = Number.parseInt(durationDays, 10);
    if (!Number.isFinite(days) || days <= 0) return;

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

  const config = actionConfig[actionType];
  const canSubmit =
    userId &&
    isStepUpActive &&
    note.trim() &&
    !isPending &&
    (actionType === "revoke" || (durationDays && Number(durationDays) > 0));

  return (
    <Surface glow={config.tone} className="p-6">
      {!compact && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
              Premium actions
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              {userName
                ? `Manage ${userName.split(" ")[0]}'s access`
                : "Manage premium access"}
            </h2>
          </div>
          <StatusBadge tone={isPremium ? "emerald" : "slate"} pulse={isPremium}>
            {isPremium ? "premium active" : "free tier"}
          </StatusBadge>
        </div>
      )}

      {compact && (
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">
            Premium actions
          </h3>
          <StatusBadge tone={isPremium ? "emerald" : "slate"} pulse={isPremium}>
            {isPremium ? "premium" : "free"}
          </StatusBadge>
        </div>
      )}

      {/* Step-up status */}
      <div
        className={`${compact ? "mt-3" : "mt-5"} flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/10 px-4 py-3`}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck
            className={`h-4 w-4 ${isStepUpActive ? "text-[color:var(--accent-emerald)]" : "text-[color:var(--accent-amber)]"}`}
          />
          <span className="text-sm text-white">
            {isStepUpActive
              ? "Step-up verified"
              : "Step-up required for changes"}
          </span>
        </div>
        {!isStepUpActive && (
          <Link
            href={`/step-up?next=${encodeURIComponent(stepUpRedirectUrl)}&intent=Premium%20access%20change`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--accent-cyan)] transition hover:text-white"
          >
            Verify
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* Action type selector */}
      <div
        className={`${compact ? "mt-3" : "mt-5"} grid grid-cols-3 gap-1 rounded-xl border border-white/8 bg-black/10 p-1`}
      >
        {(["grant", "extend", "revoke"] as PremiumActionKind[]).map((value: any) => {
          const active = actionType === value;
          const cfg = actionConfig[value];
          return (
            <button
              key={value}
              type="button"
              onClick={() => setActionType(value)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium capitalize transition ${
                active
                  ? "bg-white text-[color:var(--background)] shadow-sm"
                  : "text-[color:var(--muted-foreground)] hover:bg-white/5 hover:text-white"
              }`}
            >
              <cfg.icon className="h-3.5 w-3.5" />
              {value}
            </button>
          );
        })}
      </div>

      {/* Action description  */}
      <p
        className={`${compact ? "mt-2" : "mt-3"} text-xs text-[color:var(--muted-foreground)]`}
      >
        {config.description}
      </p>

      {/* Form fields */}
      <div className={`${compact ? "mt-3" : "mt-5"} space-y-4`}>
        {actionType !== "revoke" && (
          <>
            {/* Duration presets */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-[color:var(--muted-foreground)]">
                Duration
              </span>
              <div className="flex flex-wrap gap-1.5">
                {durationPresets.map((preset: any) => {
                  const active = durationDays === String(preset.value);
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() =>
                        setDurationDays(String(preset.value))
                      }
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        active
                          ? "border-[color:var(--accent-cyan)]/30 bg-[color:var(--accent-cyan)]/10 text-white"
                          : "border-white/8 bg-black/10 text-[color:var(--muted-foreground)] hover:border-white/14 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs text-[color:var(--muted-foreground)]">
                  or
                </span>
                <input
                  value={durationDays}
                  onChange={(event) =>
                    setDurationDays(event.target.value.replace(/[^\d]/g, ""))
                  }
                  inputMode="numeric"
                  placeholder="Custom days"
                  className="w-28 rounded-lg border border-white/8 bg-black/10 px-3 py-2 text-xs text-white outline-none transition focus:border-[color:var(--accent-cyan)]/40"
                />
              </div>
            </div>

            {/* Grant type */}
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[color:var(--muted-foreground)]">
                Grant type
              </span>
              <CustomSelect
                value={entitlementKind}
                onValueChange={(val) => setEntitlementKind(val as EntitlementKind)}
                options={[
                  { value: "MANUAL", label: "Manual — Standard admin grant" },
                  { value: "PROMOTIONAL", label: "Promotional — Time-limited promotion" },
                  { value: "CORRECTIVE", label: "Corrective — Fix a billing issue" },
                ]}
              />
            </label>
          </>
        )}

        {/* Note */}
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[color:var(--muted-foreground)]">
            Admin note{" "}
            <span className="text-[color:var(--accent-rose)]">*</span>
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={compact ? 2 : 3}
            placeholder={
              actionType === "revoke"
                ? "Explain why this user's premium access is being revoked..."
                : "Explain why this entitlement is being issued..."
            }
            className="w-full rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-cyan)]/40"
          />
        </label>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            actionType === "revoke"
              ? "bg-[color:var(--accent-rose)] text-[color:var(--background)] hover:opacity-90"
              : "bg-[color:var(--accent-cyan)] text-[color:var(--background)] hover:opacity-90"
          }`}
        >
          {isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <config.icon className="h-4 w-4" />
          )}
          {isPending
            ? "Processing..."
            : actionType === "revoke"
              ? "Revoke all entitlements"
              : actionType === "grant"
                ? `Grant ${durationDays || "?"} days premium`
                : `Extend by ${durationDays || "?"} days`}
        </button>

        {/* Help text */}
        {!isStepUpActive && (
          <div className="rounded-xl border border-[color:var(--accent-amber)]/20 bg-[color:var(--accent-amber)]/8 p-3 text-xs text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--accent-amber)]" />
              <span>
                Complete{" "}
                <Link
                  href={`/step-up?next=${encodeURIComponent(stepUpRedirectUrl)}&intent=Premium%20access%20change`}
                  className="font-semibold text-[color:var(--accent-cyan)] underline underline-offset-2 transition hover:text-white"
                >
                  step-up verification
                </Link>{" "}
                before making premium changes.
              </span>
            </div>
          </div>
        )}
      </div>
    </Surface>
  );
}
