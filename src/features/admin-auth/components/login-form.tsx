"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authApi } from "@/lib/api/auth";
import { buildBrowserDeviceFingerprint } from "@/lib/auth/device-fingerprint";
import { cn } from "@/lib/utils/cn";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Fingerprint, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

/**
 * Admin sign-in, in two steps: credentials, then a one-time code when the
 * backend asks for one.
 *
 * What changed:
 *
 * 1. The inputs and buttons were hand-written — their own border, radius,
 *    focus ring and a second password-reveal toggle — while `Field` and
 *    `Button` already do all of it. The submit button was a cyan-to-#5ab8ab
 *    gradient, a treatment used nowhere else in the console.
 *
 * 2. The footer read "Role-based access · Step-up verification · Encrypted
 *    session". That is marketing copy, on the login screen of an internal
 *    tool, aimed at people who already work here. Removed.
 *
 * 3. The code step never said where the code was sent. It does now — that
 *    is the one fact you need at that moment, especially when the login
 *    email and your everyday address differ.
 *
 * 4. Verifying a code had no pending state, so a slow network looked like a
 *    dead button and invited a second submission.
 */

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const OTP_LENGTH = 6;

type OtpMode = {
  email: string;
  deviceId?: string;
  deviceName?: string;
  device?: Record<string, unknown>;
  verificationType: "EMAIL_VERIFICATION" | "DEVICE_REGISTRATION";
};

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [otpMode, setOtpMode] = useState<OtpMode | null>(null);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  /**
   * A learner account can hold valid credentials but has no business here.
   * Sign it straight back out and send the person to the app they wanted.
   */
  async function rejectNonAdmin() {
    await authApi.logout().catch(() => {});
    toast.error("This account is not an admin", {
      description: "Taking you to StudyBond instead.",
      duration: 4000,
    });
    setTimeout(() => {
      window.location.href =
        process.env.NEXT_PUBLIC_WEB_URL || "https://studybond.app";
    }, 2000);
  }

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const deviceFingerprint = buildBrowserDeviceFingerprint();
      const response = await authApi.login({ ...values, ...deviceFingerprint });

      if (response.requiresOTP) {
        setOtpMode({
          email: values.email,
          verificationType: response.verificationType,
          ...deviceFingerprint,
        });
        toast.info(response.message);
        return;
      }

      if (response.user.role === "USER") {
        await rejectNonAdmin();
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success(`Welcome back, ${response.user.fullName}`);
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error("Could not sign you in", {
        description: (
          <ApiErrorMessage
            error={error}
            fallback="Check your email and password, then try again."
          />
        ),
      });
    }
  };

  const onVerifyOtp = async () => {
    if (!otpMode || isVerifying) return;

    setIsVerifying(true);
    try {
      const response = await authApi.verifyOtp({
        email: otpMode.email,
        otp,
        deviceId: otpMode.deviceId,
        deviceName: otpMode.deviceName,
        device: otpMode.device,
      });

      if ("user" in response && response.user) {
        if (response.user.role === "USER") {
          await rejectNonAdmin();
          return;
        }

        await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        toast.success(`Verified. Welcome, ${response.user.fullName}`);
        router.push("/");
        router.refresh();
        return;
      }

      toast.success(response.message ?? "Verification complete.");
    } catch (error) {
      toast.error("That code did not work", {
        description: (
          <ApiErrorMessage
            error={error}
            fallback="Check the code and try again. Codes expire after a few minutes."
          />
        ),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const isDeviceCheck = otpMode?.verificationType === "DEVICE_REGISTRATION";

  return (
    <div className="space-y-5">
      {/* ── Wordmark ──────────────────────────────────────────
          Plain type. The old mark was a cyan-to-emerald gradient tile,
          the only gradient in the product. */}
      <div className="flex items-baseline gap-2">
        <p className="text-[length:var(--sb-text-lg)] font-semibold tracking-tight text-[var(--sb-text)]">
          StudyBond
        </p>
        <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
          Admin
        </p>
      </div>

      <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-5 shadow-[var(--sb-shadow-lg)] sm:p-6">
        {!otpMode ? (
          <>
            <h1 className="text-[length:var(--sb-text-xl)] font-semibold tracking-tight text-[var(--sb-text)]">
              Sign in
            </h1>
            <p className="mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
              Use your StudyBond admin account.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Field
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@studybond.app"
                size="lg"
                error={errors.email?.message}
                {...register("email")}
              />

              <Field
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                size="lg"
                error={errors.password?.message}
                {...register("password")}
              />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                {isSubmitting ? "Signing in" : "Sign in"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] text-[var(--sb-text-secondary)]">
                {isDeviceCheck ? (
                  <Fingerprint className="h-4 w-4" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-[length:var(--sb-text-lg)] font-semibold tracking-tight text-[var(--sb-text)]">
                  {isDeviceCheck ? "Approve this device" : "Enter your code"}
                </h1>
                {/* Which inbox to open — the one thing you need here. */}
                <p className="mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
                  We sent a {OTP_LENGTH}-digit code to{" "}
                  <span className="text-[var(--sb-text)]">{otpMode.email}</span>.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="otp"
                  className="block text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]"
                >
                  Verification code
                </label>
                <input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_LENGTH}
                  value={otp}
                  onChange={(event) =>
                    setOtp(
                      event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH),
                    )
                  }
                  /* Submitting on Enter matters more here than anywhere
                     else — the code arrives on a phone and gets typed fast. */
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && otp.length === OTP_LENGTH) {
                      void onVerifyOtp();
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
                onClick={onVerifyOtp}
                disabled={otp.length !== OTP_LENGTH || isVerifying}
                isLoading={isVerifying}
              >
                {isVerifying ? "Verifying" : "Verify"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setOtpMode(null);
                  setOtp("");
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Use a different account
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
