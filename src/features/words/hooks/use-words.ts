"use client";

import { adminWordsApi, type WordCardFilter } from "@/lib/api/admin-words";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useWordCards(filter: WordCardFilter) {
  return useQuery({
    queryKey: ["admin", "words", "list", filter],
    queryFn: () => adminWordsApi.list(filter),
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  });
}

export function useWordCard(id: number | null) {
  return useQuery({
    queryKey: ["admin", "words", "card", id ?? 0],
    queryFn: () => adminWordsApi.get(id as number),
    enabled: id !== null,
    staleTime: 15_000,
  });
}

export function useWordPlan(range: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "words", "plan", range.from ?? "", range.to ?? ""],
    queryFn: () => adminWordsApi.plan(range),
    staleTime: 15_000,
  });
}

/** Refreshes the cards, the open card and the plan after any change. */
export function useRefreshWords() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["admin", "words"] });
}
