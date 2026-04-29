"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { authApi } from "@/lib/api/auth";
import { buildBrowserDeviceFingerprint } from "@/lib/auth/device-fingerprint";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, ArrowRight, Fingerprint, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [otpMode, setOtpMode] = useState<{
    email: string;
    deviceId?: string;
    deviceName?: string;
    device?: Record<string, unknown>;
    verificationType: "EMAIL_VERIFICATION" | "DEVICE_REGISTRATION";
  } | null>(null);
  const [otp, setOtp] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

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
        await authApi.logout().catch(() => {});
        toast.error("Access denied", {
          description:
            "This portal is for administrators only. Redirecting you to StudyBond.",
          duration: 4000,
        });
        setTimeout(() => {
          window.location.href =
            process.env.NEXT_PUBLIC_WEB_URL || "https://studybond.app";
        }, 2000);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success(`Welcome back, ${response.user.fullName}`);
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error("Sign in failed", {
        description: (
          <ApiErrorMessage
            error={error}
            fallback="Please check your credentials."
          />
        ),
      });
    }
  };

  const onVerifyOtp = async () => {
    if (!otpMode) return;
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
          await authApi.logout().catch(() => {});
          toast.error("Access denied", {
            description:
              "This portal is for administrators only. Redirecting you to StudyBond.",
            duration: 4000,
          });
          setTimeout(() => {
            window.location.href =
              process.env.NEXT_PUBLIC_WEB_URL || "https://studybond.app";
          }, 2000);
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
      toast.error("Verification failed", {
        description: (
          <ApiErrorMessage
            error={error}
            fallback="Invalid code. Please try again."
          />
        ),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Brand mark */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[color:var(--accent-cyan)] to-[color:var(--accent-emerald)]">
          <span className="text-sm font-bold text-[color:var(--background)]">
            SB
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">StudyBond</p>
          <p className="text-[11px] text-[color:var(--muted-foreground)]">
            Admin workspace
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-white/[0.06] bg-[color:var(--panel)] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-2xl md:p-10">
        {!otpMode ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              Sign in to access the admin panel.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
              {/* Email field */}
              <div className="space-y-2">
                <label
                  className="text-xs font-medium text-[color:var(--muted-foreground)]"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@studybond.app"
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white outline-none transition-all duration-200 placeholder:text-[color:var(--muted-foreground)]/40 focus:border-[color:var(--accent-cyan)]/30 focus:bg-white/[0.04] focus:shadow-[0_0_0_3px_rgba(110,196,184,0.08)]"
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="text-xs text-[color:var(--accent-rose)]">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label
                  className="text-xs font-medium text-[color:var(--muted-foreground)]"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 pr-11 text-sm text-white outline-none transition-all duration-200 placeholder:text-[color:var(--muted-foreground)]/40 focus:border-[color:var(--accent-cyan)]/30 focus:bg-white/[0.04] focus:shadow-[0_0_0_3px_rgba(110,196,184,0.08)]"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[color:var(--muted-foreground)]/50 transition-colors hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-xs text-[color:var(--accent-rose)]">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[color:var(--accent-cyan)] to-[#5ab8ab] px-4 py-3.5 text-sm font-semibold text-[color:var(--background)] shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.1)_inset] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(110,196,184,0.25),0_0_0_1px_rgba(255,255,255,0.15)_inset] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  "Signing in..."
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--accent-cyan)]/16 bg-[color:var(--accent-cyan)]/8 text-[color:var(--accent-cyan)]">
                {otpMode.verificationType === "DEVICE_REGISTRATION" ? (
                  <Fingerprint className="h-5 w-5" />
                ) : (
                  <KeyRound className="h-5 w-5" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {otpMode.verificationType === "DEVICE_REGISTRATION"
                    ? "Verify this device"
                    : "Check your email"}
                </h1>
                <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">
                  {otpMode.verificationType === "DEVICE_REGISTRATION"
                    ? "Enter the code to approve this device."
                    : "We sent a verification code to your email."}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <div className="space-y-2">
                <label
                  className="text-xs font-medium text-[color:var(--muted-foreground)]"
                  htmlFor="otp"
                >
                  Verification code
                </label>
                <input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center text-lg tracking-[0.5em] text-white outline-none transition-all duration-200 placeholder:tracking-[0.5em] placeholder:text-[color:var(--muted-foreground)]/25 focus:border-[color:var(--accent-cyan)]/30 focus:bg-white/[0.04] focus:shadow-[0_0_0_3px_rgba(110,196,184,0.08)]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onVerifyOtp}
                  disabled={otp.length !== 6}
                  className="group relative inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[color:var(--accent-cyan)] to-[#5ab8ab] px-4 py-3.5 text-sm font-semibold text-[color:var(--background)] shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.1)_inset] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(110,196,184,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Verify
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpMode(null);
                    setOtp("");
                  }}
                  className="rounded-xl border border-white/[0.06] px-4 py-3 text-sm text-[color:var(--muted-foreground)] transition-colors hover:border-white/12 hover:text-white"
                >
                  Back
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer notes */}
      <div className="flex items-center justify-center gap-4 text-[11px] text-[color:var(--muted-foreground)]/60">
        <span>Role-based access</span>
        <span className="h-0.5 w-0.5 rounded-full bg-[color:var(--muted-foreground)]/30" />
        <span>Step-up verification</span>
        <span className="h-0.5 w-0.5 rounded-full bg-[color:var(--muted-foreground)]/30" />
        <span>Encrypted session</span>
      </div>
    </div>
  );
}
