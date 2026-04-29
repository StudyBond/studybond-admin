"use client";

import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { formatRelativeWindow } from "@/lib/utils/format";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function AdminStepUpChip() {
  const { data: session, isLoading } = useAdminSession();
  const { isActive, stepUp, clear } = useAdminStepUp();

  if (isLoading || session?.user?.role !== "SUPERADMIN") {
    return null;
  }

  if (isActive && stepUp) {
    return (
      <div className="group relative z-50">
        <div className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 text-sm font-medium text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.15)] transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/20">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
          <span className="hidden sm:inline-block">Armed</span>
        </div>

        {/* Hover Popover */}
        <div className="invisible absolute right-0 top-full mt-3 w-72 origin-top-right translate-y-2 rounded-2xl border border-white/10 bg-[rgba(26,23,21,0.96)] p-3.5 shadow-[0_24px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-200 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">Sensitive actions armed</p>
              <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted-foreground)]">
                {formatRelativeWindow(stepUp.expiresAt)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={clear}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Clear Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative z-40">
      <Link
        href="/step-up?next=/premium"
        className="flex h-10 items-center justify-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 text-sm font-medium text-amber-100 transition-colors hover:border-amber-400/30 hover:bg-amber-400/20"
      >
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-300" />
        <span className="hidden sm:inline-block">Locked</span>
      </Link>

      {/* Hover Popover */}
      <div className="invisible absolute right-0 top-full mt-3 w-72 origin-top-right translate-y-2 rounded-2xl border border-white/10 bg-[rgba(26,23,21,0.96)] p-3.5 shadow-[0_24px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-200 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">Sensitive actions locked</p>
            <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted-foreground)]">
              Request step-up before accessing premium integrations or destructive actions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
