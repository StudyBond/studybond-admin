"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { authApi } from "@/lib/api/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

export function AdminSessionChip() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminSession();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Signed out");
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error("Logout failed", {
        description: (
          <ApiErrorMessage error={error} fallback="Could not end the admin session." />
        ),
      });
    }
  };

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="h-10 w-10 animate-pulse rounded-full border border-white/8 bg-white/5" />
    );
  }

  const user = data?.user;

  if (!user) {
    return null;
  }

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[color:var(--accent-cyan)] transition-all duration-300",
          isOpen
            ? "border-[color:var(--accent-cyan)] bg-[color:var(--accent-cyan)]/10 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
            : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]"
        )}
      >
        <UserRound className="h-[18px] w-[18px]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-64 origin-top-right animate-in fade-in zoom-in-95 rounded-2xl border border-white/10 bg-[rgba(26,23,21,0.96)] p-2 shadow-[0_24px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <div className="px-3 py-3">
            <p className="truncate text-[15px] font-semibold text-white">{user.fullName}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <StatusBadge tone={user.role === "SUPERADMIN" ? "rose" : "cyan"}>{user.role}</StatusBadge>
              <span className="truncate text-xs text-[color:var(--muted-foreground)]">{user.email}</span>
            </div>
          </div>
          <div className="my-1 h-px w-full bg-white/5" />
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[color:var(--muted-foreground)] transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
