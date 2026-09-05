"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { adminPremiumApi } from "@/lib/api/admin-premium";
import { clearAdminStepUp, writeAdminStepUp } from "@/lib/auth/admin-step-up";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, ShieldOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Step-up verification.
 *
 * This is a two-step task: ask for a code, then type it in. The old page
 * spent a 1152px two-column layout on it — a `text-4xl` headline, three
 * info boxes (one of which displayed the raw return path, "/premium"), and
 * two side-by-side cards titled "Request challenge" and "Verify challenge".
 * Both cards were always visible, so the verify half sat there with a dead
 * button and no explanation before any code had been requested. Four accent
 * colours appeared on one screen: cyan and amber and rose glows, an emerald
 * button, a cyan button.
 *
 * It now reads top to bottom, one step at a time, on the same centred card
 * as the sign-in screen next door — which is the other place an admin types
 * a six-digit code, and should not look like a different product.
 *
 * "Resend code" is new. Codes expire, and the old page's only recovery was
 * a "Reset" button that cleared the challenge without sending another.
 */

const OTP_LENGTH = 6;

export default function StepUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isLoading } = useAdminSession();
  const { stepUp, isActive } = useAdminStepUp();

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengeExpiry, setChallengeExpiry] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  const nextPath = searchParams.get("next") || "/premium";
  /**
   * Callers pass a noun phrase ("Premium access change", "System settings"),
   * so it has to read as the subject of a sentence rather than be spliced
   * mid-clause. Kept capitalised for that reason.
   */
  const intent = searchParams.get("intent") || "This change";

  const requestChallenge = useMutation({
    mutationFn: () => adminPremiumApi.requestStepUp(),
    onSuccess: (payload) => {
      setChallengeId(payload.challengeId);
      setChallengeExpiry(payload.expiresAt);
      setOtp("");
      toast.success("Code sent", { description: payload.message });
    },
    onError: (error) => {
      toast.error("Could not send a code", {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
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
      toast.success("Verified", {
        description: "You can make the change now.",
      });
      router.push(nextPath);
      router.refresh();
    },
    onError: (error) => {
      toast.error("That code did not work", {
        description: (
          <ApiErrorMessage
            error={error}
            fallback="Check the code and try again. Codes expire after a few minutes."
          />
        ),
      });
    },
  });

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-[28rem] space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-56 w-full" />
        </div>
      </main>
    );
  }

  if (session?.user?.role !== "SUPERADMIN") {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="sb-enter w-full max-w-[28rem] rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] shadow-[var(--sb-shadow-lg)]">
          <EmptyState
            icon={<ShieldOff className="h-4 w-4" />}
            title="Superadmin only"
            description="Step-up verification exists to guard superadmin actions, so there is nothing here for your role to unlock."
            action={
              <Button asChild href="/" variant="secondary" size="sm">
                Back to dashboard
              </Button>
            }
          />
        </div>
      </main>
    );
  }

  const hasChallenge = Boolean(challengeId);

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="sb-enter w-full max-w-[28rem] space-y-5">
        <div className="flex items-baseline gap-2">
          <p className="text-[length:var(--sb-text-lg)] font-semibold tracking-tight text-[var(--sb-text)]">
            StudyBond
          </p>
          <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            Admin
          </p>
        </div>

        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-5 shadow-[var(--sb-shadow-lg)] sm:p-6">
          {/* ── Already verified ───────────────────────────── */}
          {isActive && stepUp ? (
            <>
              <Badge tone="success" dot>
                Verified
              </Badge>
              <h1 className="mt-3 text-[length:var(--sb-text-xl)] font-semibold tracking-tight text-[var(--sb-text)]">
                You are cleared to continue
              </h1>
              <p className="mt-1.5 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
                This lasts until {formatDateTime(stepUp.expiresAt)}, in this
                browser only. Clear it when you have finished.
              </p>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button asChild href={nextPath} className="sm:flex-1">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    clearAdminStepUp();
                    toast.success("Verification cleared");
                  }}
                >
                  Clear now
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-[length:var(--sb-text-xl)] font-semibold tracking-tight text-[var(--sb-text)]">
                One more check
              </h1>
              <p className="mt-1.5 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
                {/* Names what you were trying to do, in the calling page's words. */}
                <span className="text-[var(--sb-text)]">{intent}</span> needs a
                second check. We will email you a code to confirm it is really
                you. Verifying lasts for this browser session only.
              </p>

              {/* ── Step 1 ─────────────────────────────────── */}
              {!hasChallenge ? (
                <Button
                  type="button"
                  size="lg"
                  className="mt-6 w-full"
                  onClick={() => requestChallenge.mutate()}
                  disabled={requestChallenge.isPending}
                  isLoading={requestChallenge.isPending}
                >
                  {requestChallenge.isPending ? "Sending" : "Email me a code"}
                </Button>
              ) : (
                /* ── Step 2 ───────────────────────────────
                   Only rendered once a code actually exists, so there is
                   no dead input sitting there unexplained. */
                <div className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <label
                        htmlFor="step-up-otp"
                        className="block text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]"
                      >
                        Verification code
                      </label>
                      {challengeExpiry ? (
                        <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                          Valid until {formatDateTime(challengeExpiry)}
                        </span>
                      ) : null}
                    </div>
                    <input
                      id="step-up-otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      maxLength={OTP_LENGTH}
                      value={otp}
                      onChange={(event) =>
                        setOtp(
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, OTP_LENGTH),
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          otp.length === OTP_LENGTH &&
                          !verifyChallenge.isPending
                        ) {
                          verifyChallenge.mutate();
                        }
                      }}
                      placeholder="000000"
                      className={cn(
                        "sb-nums w-full rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)]",
                        "px-3.5 py-3 text-center text-[length:var(--sb-text-xl)] tracking-[0.4em] text-[var(--sb-text)]",
                        "outline-none transition-colors duration-[var(--sb-duration-fast)]",
                        "placeholder:text-[var(--sb-text-tertiary)]",
                        "hover:border-[var(--sb-border-hover)]",
                        "focus:border-[var(--sb-accent)] focus:ring-2 focus:ring-[var(--sb-accent-ring)]",
                      )}
                    />
                  </div>

                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    onClick={() => verifyChallenge.mutate()}
                    disabled={
                      otp.length !== OTP_LENGTH || verifyChallenge.isPending
                    }
                    isLoading={verifyChallenge.isPending}
                  >
                    {verifyChallenge.isPending ? "Verifying" : "Verify"}
                  </Button>

                  {/* The old page could only clear the challenge, never
                      send a new one — which left an expired code as a
                      dead end. */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => requestChallenge.mutate()}
                    disabled={requestChallenge.isPending}
                    isLoading={requestChallenge.isPending}
                  >
                    {requestChallenge.isPending
                      ? "Sending a new code"
                      : "Send a new code"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <Button asChild href="/" variant="ghost" size="sm" className="w-full">
          Back to dashboard
        </Button>
      </div>
    </main>
  );
}
