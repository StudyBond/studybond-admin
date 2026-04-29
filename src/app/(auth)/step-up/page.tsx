"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { adminPremiumApi } from "@/lib/api/admin-premium";
import { clearAdminStepUp, writeAdminStepUp } from "@/lib/auth/admin-step-up";
import { formatDateTime, formatRelativeWindow } from "@/lib/utils/format";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Sparkles, TimerReset } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function StepUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isLoading } = useAdminSession();
  const { stepUp, isActive } = useAdminStepUp();
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengeExpiry, setChallengeExpiry] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  const nextPath = searchParams.get("next") || "/premium";
  const intent = searchParams.get("intent") || "Unlock premium actions";

  const requestChallenge = useMutation({
    mutationFn: () => adminPremiumApi.requestStepUp(),
    onSuccess: (payload) => {
      setChallengeId(payload.challengeId);
      setChallengeExpiry(payload.expiresAt);
      toast.success("Challenge sent", { description: payload.message });
    },
    onError: (error) => {
      toast.error("Could not request challenge", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const verifyChallenge = useMutation({
    mutationFn: () =>
      adminPremiumApi.verifyStepUp({
        challengeId: challengeId as string,
        otp,
      }),
    onSuccess: (payload) => {
      writeAdminStepUp(payload);
      toast.success("Step-up verified", {
        description: "Elevated access is now active for this session.",
      });
      router.push(nextPath);
      router.refresh();
    },
    onError: (error) => {
      toast.error("Verification failed", {
        description: (
          <ApiErrorMessage error={error} fallback="Invalid OTP. Please try again." />
        ),
      });
    },
  });

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <Surface glow="cyan" className="w-full max-w-2xl p-8 md:p-10">
          <StatusBadge tone="cyan">Loading</StatusBadge>
          <h1 className="mt-5 text-3xl font-semibold text-white">Step-up verification</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Verifying admin session...
          </p>
        </Surface>
      </main>
    );
  }

  if (session?.user?.role !== "SUPERADMIN") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <Surface glow="amber" className="w-full max-w-2xl p-8 md:p-10">
          <StatusBadge tone="amber">Restricted</StatusBadge>
          <h1 className="mt-5 text-3xl font-semibold text-white">Superadmin access required</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Step-up verification is only available to superadmins for sensitive operations like premium grants and revocations.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/8 px-4 py-3 text-sm text-white transition hover:border-white/14"
          >
            Return to dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Surface>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-6xl gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Surface glow="cyan" className="admin-enter p-8 md:p-10">
          <StatusBadge tone={isActive ? "emerald" : "cyan"}>
            {isActive ? "Step-up active" : "Step-up required"}
          </StatusBadge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">
            Verify your identity before proceeding.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Step-up verification adds an extra layer of security for sensitive admin actions.
            Request an OTP, verify it, and your elevated access will be active for this browser session.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-black/10 p-4">
              <p className="text-xs font-medium text-[color:var(--muted-foreground)]">Intent</p>
              <p className="mt-2 text-base font-semibold text-white">{intent}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/10 p-4">
              <p className="text-xs font-medium text-[color:var(--muted-foreground)]">Return to</p>
              <p className="mt-2 text-base font-semibold text-white">{nextPath}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/10 p-4">
              <p className="text-xs font-medium text-[color:var(--muted-foreground)]">Token status</p>
              <p className="mt-2 text-base font-semibold text-white">
                {isActive && stepUp ? formatRelativeWindow(stepUp.expiresAt) : "Inactive"}
              </p>
            </div>
          </div>

          {isActive && stepUp ? (
            <div className="mt-8 rounded-xl border border-[color:var(--accent-emerald)]/20 bg-[color:var(--accent-emerald)]/8 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Elevated access active</p>
                  <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                    Expires {formatDateTime(stepUp.expiresAt)}. Clear the token when you're finished with sensitive operations.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      clearAdminStepUp();
                      toast.success("Step-up token cleared");
                    }}
                    className="rounded-lg border border-white/8 px-3 py-1.5 text-xs font-medium text-white transition hover:border-white/14"
                  >
                    Clear token
                  </button>
                  <Link
                    href={nextPath}
                    className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--accent-emerald)] px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </Surface>

        <div className="grid gap-6">
          <Surface glow="amber" className="admin-enter p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/8 bg-white/[0.04] text-[color:var(--accent-amber)]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Request challenge</p>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Send a one-time code to your registered email.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => requestChallenge.mutate()}
              disabled={requestChallenge.isPending}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--accent-cyan)] px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {requestChallenge.isPending ? "Sending..." : "Request OTP"}
            </button>
            {challengeId ? (
              <p className="mt-4 text-xs text-[color:var(--muted-foreground)]">
                Challenge ready until {formatDateTime(challengeExpiry)}.
              </p>
            ) : null}
          </Surface>

          <Surface glow="rose" className="admin-enter p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/8 bg-white/[0.04] text-[color:var(--accent-rose)]">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Verify challenge</p>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Enter the OTP to activate elevated access.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <label className="block text-xs font-medium text-[color:var(--muted-foreground)]" htmlFor="step-up-otp">
                OTP code
              </label>
              <input
                id="step-up-otp"
                inputMode="numeric"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6 digits"
                className="w-full rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm tracking-[0.35em] text-white outline-none transition placeholder:tracking-normal placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-cyan)]/40"
              />
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => verifyChallenge.mutate()}
                disabled={!challengeId || otp.length !== 6 || verifyChallenge.isPending}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[color:var(--accent-emerald)] px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifyChallenge.isPending ? "Verifying..." : "Activate"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChallengeId(null);
                  setChallengeExpiry(null);
                  setOtp("");
                }}
                className="inline-flex items-center justify-center rounded-xl border border-white/8 px-4 py-3 text-sm text-white transition hover:border-white/14"
              >
                <TimerReset className="mr-2 h-4 w-4" />
                Reset
              </button>
            </div>
          </Surface>
        </div>
      </div>
    </main>
  );
}
