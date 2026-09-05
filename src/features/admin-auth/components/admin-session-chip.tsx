"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { authApi } from "@/lib/api/auth";
import { cn } from "@/lib/utils/cn";
import { useDismissable } from "@/lib/utils/use-dismissable";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Who you are signed in as, and how to leave.
 *
 * The menu animated in with `animate-in fade-in zoom-in-95` — classes from
 * `tailwindcss-animate`, which is not a dependency of this project and is
 * not defined in globals.css either. They compiled to nothing.
 *
 * The role badge also painted SUPERADMIN in rose, the colour this design
 * system reserves for something being broken. Being a superadmin is not an
 * error state; it is the brand-toned fact that you hold the highest role.
 */
export function AdminSessionChip() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminSession();
  const { isOpen, setIsOpen, ref } = useDismissable<HTMLDivElement>();

  async function handleLogout() {
    try {
      await authApi.logout();
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Signed out");
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error("Could not sign you out", {
        description: (
          <ApiErrorMessage
            error={error}
            fallback="Your session may still be open."
          />
        ),
      });
    }
  }

  if (isLoading) {
    return <div className="sb-skeleton h-9 w-9 rounded-full" />;
  }

  const user = data?.user;
  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Account menu for ${user.fullName}`}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
          "transition-colors duration-[var(--sb-duration-fast)]",
          isOpen
            ? "border-[var(--sb-accent-ring)] bg-[var(--sb-accent-soft)] text-[var(--sb-accent-text)]"
            : "border-[var(--sb-border)] bg-[var(--sb-surface-2)] text-[var(--sb-text-secondary)] hover:border-[var(--sb-border-hover)] hover:text-[var(--sb-text)]",
        )}
      >
        <UserRound className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className={cn(
            "sb-fade absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden",
            "rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)]",
            "bg-[var(--sb-surface-2)] shadow-[var(--sb-shadow-xl)]",
          )}
        >
          <div className="border-b border-[var(--sb-border)] p-3">
            <p className="truncate text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
              {user.fullName}
            </p>
            <p className="mt-0.5 truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
              {user.email}
            </p>
            <div className="mt-2">
              <Badge tone={user.role === "USER" ? "neutral" : "brand"}>
                {user.role === "SUPERADMIN"
                  ? "Superadmin"
                  : user.role === "ADMIN"
                    ? "Admin"
                    : "User"}
              </Badge>
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2.5 text-left",
              "text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]",
              "transition-colors duration-[var(--sb-duration-fast)]",
              "hover:bg-[var(--sb-surface-3)] hover:text-[var(--sb-text)]",
            )}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
