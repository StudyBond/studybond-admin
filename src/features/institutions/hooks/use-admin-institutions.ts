"use client";

import { adminInstitutionsApi } from "@/lib/api/admin-institutions";
import { useQuery } from "@tanstack/react-query";

/**
 * An institution's setup changes perhaps twice a year, so these are held a
 * little longer than the console's usual 20-30 seconds. Every mutation
 * invalidates them explicitly.
 */
export function useAdminInstitutions(enabled = true) {
  return useQuery({
    queryKey: ["admin", "institutions"],
    queryFn: adminInstitutionsApi.list,
    enabled,
    staleTime: 60_000,
  });
}

export function useAdminInstitution(institutionId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["admin", "institution", institutionId],
    queryFn: () => adminInstitutionsApi.get(institutionId as number),
    enabled: enabled && typeof institutionId === "number" && institutionId > 0,
    staleTime: 60_000,
  });
}

export function useAdminSubjectCatalogue(enabled = true) {
  return useQuery({
    queryKey: ["admin", "subject-catalogue"],
    queryFn: adminInstitutionsApi.listSubjects,
    enabled,
    staleTime: 60_000,
  });
}
