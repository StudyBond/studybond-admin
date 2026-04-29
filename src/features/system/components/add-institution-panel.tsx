"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { adminSystemApi } from "@/lib/api/admin-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AddInstitutionPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();

  const resetForm = () => {
    setCode("");
    setName("");
    setSlug("");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!stepUp?.stepUpToken) {
        throw new Error("Step-up verification required.");
      }

      return adminSystemApi.createInstitution(
        { code, name, slug },
        { stepUpToken: stepUp.stepUpToken }
      );
    },
    onSuccess: async (payload) => {
      toast.success(`Institution ${payload.institution.code} activated successfully.`);
      resetForm();
      router.refresh(); // Refresh client side so changes bounce back if we rely on RSCs elsewhere
    },
    onError: (error) => {
      toast.error("Could not register institution", {
        description: <ApiErrorMessage error={error} fallback="Check the code and slug are unique." />,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !slug) return;
    mutation.mutate();
  };

  return (
    <div className="mt-5 rounded-xl border border-white/8 bg-black/10 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[color:var(--accent-cyan)]">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Educational Network</p>
            <p className="max-w-xl mt-1 text-sm text-[color:var(--muted-foreground)]">
              Register a new university into the StudyBond infrastructure. Ensure the code matches our primary abbreviation standard (e.g. OAU, UNILAG).
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 lg:grid-cols-4 items-end bg-white/[0.02] p-4 rounded-xl border border-white/5">
          <div className="space-y-1.5">
            <label htmlFor="inst-code" className="text-xs font-medium text-white/50 uppercase tracking-wider block">
              Institution Code (OAU)
            </label>
            <input
              id="inst-code"
              type="text"
              required
              disabled={!isStepUpActive || mutation.isPending}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
              placeholder="e.g. OAU"
              className="w-full rounded-xl border border-white/[0.06] bg-black/20 px-3.5 py-2.5 text-sm text-white/90 outline-none transition hover:border-white/[0.1] focus:border-[color:var(--accent-cyan)]/50 focus:bg-white/[0.05] disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5 lg:col-span-1">
            <label htmlFor="inst-name" className="text-xs font-medium text-white/50 uppercase tracking-wider block">
              Full Name
            </label>
            <input
              id="inst-name"
              type="text"
              required
              disabled={!isStepUpActive || mutation.isPending}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Obafemi Awolowo University"
              className="w-full rounded-xl border border-white/[0.06] bg-black/20 px-3.5 py-2.5 text-sm text-white/90 outline-none transition hover:border-white/[0.1] focus:border-[color:var(--accent-cyan)]/50 focus:bg-white/[0.05] disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5 lg:col-span-1">
            <label htmlFor="inst-slug" className="text-xs font-medium text-white/50 uppercase tracking-wider block">
              URL Slug
            </label>
            <input
              id="inst-slug"
              type="text"
              required
              disabled={!isStepUpActive || mutation.isPending}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z-]/g, ""))}
              placeholder="e.g. obafemi-awolowo-university"
              className="w-full rounded-xl border border-white/[0.06] bg-black/20 px-3.5 py-2.5 text-sm text-white/90 outline-none transition hover:border-white/[0.1] focus:border-[color:var(--accent-cyan)]/50 focus:bg-white/[0.05] disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={!code || !name || !slug || !isStepUpActive || mutation.isPending}
            className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/50"
          >
            {mutation.isPending ? "Adding..." : "Add"}
            {!mutation.isPending && <Plus className="h-4 w-4" />}
          </button>
        </form>

        {!isStepUpActive && (
          <div className="mt-2 rounded-lg border border-[color:var(--accent-amber)]/25 bg-[color:var(--accent-amber)]/10 px-3 py-2 text-xs text-white">
            Step-up verification is required before making destructive or global platform changes.
          </div>
        )}
      </div>
    </div>
  );
}
