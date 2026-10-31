"use client";

import { picturesApi } from "@/lib/api/pictures";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function usePictureSummary() {
  return useQuery({
    queryKey: ["admin", "pictures", "summary"],
    queryFn: () => picturesApi.summary(),
    staleTime: 15_000,
  });
}

export function usePictureList(subject: string | null, year: number | null) {
  return useQuery({
    queryKey: ["admin", "pictures", "list", subject ?? "", year ?? 0],
    queryFn: () => picturesApi.list(subject as string, year as number),
    enabled: Boolean(subject) && year !== null,
    staleTime: 15_000,
  });
}

/** One picture, for a link that opens it and for checking it from content review. */
export function usePicture(id: number | null) {
  return useQuery({
    queryKey: ["admin", "pictures", "task", id ?? 0],
    queryFn: () => picturesApi.get(id as number),
    enabled: id !== null,
    staleTime: 15_000,
  });
}

export function useHandwritingSheet() {
  return useQuery({
    queryKey: ["admin", "pictures", "handwriting-sheet"],
    queryFn: () => picturesApi.handwritingSheet(),
    staleTime: 60_000,
  });
}

/** Refreshes the counts and the list after any change to a picture. */
export function useRefreshPictures() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "pictures"] });
}
