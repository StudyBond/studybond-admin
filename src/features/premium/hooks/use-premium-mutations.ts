"use client";

import { adminPremiumApi } from "@/lib/api/admin-premium";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { createElement } from "react";

type EntitlementKind = "MANUAL" | "PROMOTIONAL" | "CORRECTIVE";

interface GrantPayload {
  kind: EntitlementKind;
  durationDays: number;
  note: string;
}

interface RevokePayload {
  note: string;
}

interface UsePremiumMutationsOptions {
  userId: number | null;
  stepUpToken: string | null | undefined;
  onSuccess?: () => void;
}

export function usePremiumMutations({
  userId,
  stepUpToken,
  onSuccess,
}: UsePremiumMutationsOptions) {
  const queryClient = useQueryClient();

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "premium-users"] }),
      queryClient.invalidateQueries({
        queryKey: ["admin", "premium-history", userId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["admin", "premium-insights"],
      }),
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", "360", userId],
      }),
    ]);
  }

  const grantMutation = useMutation({
    mutationFn: (payload: GrantPayload) => {
      if (!userId) throw new Error("Select a user first.");
      if (!stepUpToken)
        throw new Error(
          "Step-up verification required. Complete step-up first.",
        );
      return adminPremiumApi.grantPremium(userId, payload, { stepUpToken });
    },
    onSuccess: async (result) => {
      toast.success(result.message);
      await invalidateAll();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Grant failed", {
        description: createElement(ApiErrorMessage, {
          error,
          fallback: "Please try again.",
        }),
      });
    },
  });

  const extendMutation = useMutation({
    mutationFn: (payload: GrantPayload) => {
      if (!userId) throw new Error("Select a user first.");
      if (!stepUpToken)
        throw new Error(
          "Step-up verification required. Complete step-up first.",
        );
      return adminPremiumApi.extendPremium(userId, payload, { stepUpToken });
    },
    onSuccess: async (result) => {
      toast.success(result.message);
      await invalidateAll();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Extension failed", {
        description: createElement(ApiErrorMessage, {
          error,
          fallback: "Please try again.",
        }),
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (payload: RevokePayload) => {
      if (!userId) throw new Error("Select a user first.");
      if (!stepUpToken)
        throw new Error(
          "Step-up verification required. Complete step-up first.",
        );
      return adminPremiumApi.revokePremium(userId, payload, { stepUpToken });
    },
    onSuccess: async (result) => {
      toast.success(result.message);
      await invalidateAll();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Revocation failed", {
        description: createElement(ApiErrorMessage, {
          error,
          fallback: "Please try again.",
        }),
      });
    },
  });

  const isPending =
    grantMutation.isPending ||
    extendMutation.isPending ||
    revokeMutation.isPending;

  return {
    grantMutation,
    extendMutation,
    revokeMutation,
    isPending,
  };
}
