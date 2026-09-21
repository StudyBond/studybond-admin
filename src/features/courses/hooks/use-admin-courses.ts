"use client";

import { adminCoursesApi } from "@/lib/api/admin-courses";
import { useQuery } from "@tanstack/react-query";

export function useAdminCourses(enabled = true) {
  return useQuery({
    queryKey: ["admin", "courses"],
    queryFn: adminCoursesApi.list,
    enabled,
    staleTime: 60_000,
  });
}

/** How often admins actually check this matters more than freshness, so this stays short-lived. */
export function useAdminUnmatchedCourses(enabled = true) {
  return useQuery({
    queryKey: ["admin", "courses", "unmatched"],
    queryFn: adminCoursesApi.listUnmatched,
    enabled,
    staleTime: 30_000,
  });
}
