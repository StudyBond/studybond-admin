import { apiClient } from "@/lib/api/client";
import type { SuccessEnvelope } from "@/lib/api/types";

/**
 * Word + Idiom of the Day, admin side: /api/admin/word-cards.
 *
 * The generated OpenAPI file in this repo is older than these routes, and
 * syncing it would pull in other unfinished backend work. So the types are
 * written here by hand, copied from the backend's words.schema.ts. Move
 * them to lib/api/types.ts once the contract is synced.
 */

export type WordKind = "WORD" | "IDIOM";
export type WordCardStatus = "DRAFT" | "READY";
export type OptionLetter = "A" | "B" | "C" | "D" | "E";

export type WordCardQuestion = {
  questionId: number;
  isMain: boolean;
  board: string | null;
  year: number | null;
  subject: string;
  reviewStatus: string;
  /** The question text, cut to 160 characters. The tested word sits in <u>...</u>. */
  excerpt: string;
};

export type WordCard = {
  id: number;
  kind: WordKind;
  status: WordCardStatus;
  slug: string;
  headword: string;
  partOfSpeech: string | null;
  sayAs: string | null;
  ipa: string | null;
  syllables: string[];
  stressIndex: number | null;
  meaning: string;
  examples: string[];
  builtFrom: string | null;
  comesFrom: string | null;
  opposite: string | null;
  closeTo: string | null;
  watchOut: string | null;
  answerNote: string | null;
  trapOption: string | null;
  theme: string | null;
  questions: WordCardQuestion[];
  /** Past days and today, newest first. */
  shownOn: string[];
  /** Future days already planned, soonest first. */
  plannedFor: string[];
  /** What still blocks READY. Empty means it can go READY. */
  readyProblems: string[];
  createdAt: string;
  updatedAt: string;
};

export type WordCardList = {
  cards: WordCard[];
  total: number;
  page: number;
  limit: number;
  counts: { readyWords: number; readyIdioms: number; draftWords: number; draftIdioms: number };
};

export type WordCardFilter = {
  kind?: WordKind;
  status?: WordCardStatus;
  search?: string;
  page?: number;
  limit?: number;
};

/** The fields an admin can write. Null clears a field. */
export type WordCardFields = {
  kind: WordKind;
  headword: string;
  slug?: string;
  partOfSpeech?: string | null;
  sayAs?: string | null;
  ipa?: string | null;
  syllables?: string[];
  stressIndex?: number | null;
  meaning: string;
  examples?: string[];
  builtFrom?: string | null;
  comesFrom?: string | null;
  opposite?: string | null;
  closeTo?: string | null;
  watchOut?: string | null;
  answerNote?: string | null;
  trapOption?: OptionLetter | null;
  theme?: string | null;
  questions?: { questionId: number; isMain: boolean }[];
};

export type WordCardPatch = Partial<WordCardFields>;

/** One card as the content pipeline writes it: questions are found by year and a piece of their text. */
export type UploadCard = Omit<WordCardFields, "questions"> & {
  questionMatches: {
    board?: string;
    subject?: string;
    year: number;
    textIncludes: string;
    isMain?: boolean;
  }[];
};

export type UploadResultRow = {
  slug: string;
  headword: string;
  action: "CREATE" | "UPDATE" | "ERROR";
  cardId: number | null;
  questionIds: number[];
  errors: string[];
};

export type UploadResult = {
  dryRun: boolean;
  results: UploadResultRow[];
  created: number;
  updated: number;
  failed: number;
};

export type PlanDay = {
  date: string;
  kind: WordKind;
  cardId: number;
  headword: string;
  status: WordCardStatus;
  cycle: number;
  pinned: boolean;
  isPast: boolean;
};

export type PlanCycle = { cycle: number; ready: number; leftInCycle: number };

export type WordPlan = {
  /** Today in Lagos, YYYY-MM-DD. */
  today: string;
  days: PlanDay[];
  cycles: { WORD: PlanCycle; IDIOM: PlanCycle };
};

const BASE = "/api/admin/word-cards";

async function call<T>(input: string, init?: RequestInit): Promise<T> {
  const envelope = await apiClient<SuccessEnvelope<T>>(input, init);
  return envelope.data;
}

export const adminWordsApi = {
  list(filter: WordCardFilter = {}) {
    const search = new URLSearchParams();
    if (filter.kind) search.set("kind", filter.kind);
    if (filter.status) search.set("status", filter.status);
    if (filter.search) search.set("search", filter.search);
    search.set("page", String(filter.page ?? 1));
    search.set("limit", String(filter.limit ?? 100));
    return call<WordCardList>(`${BASE}?${search.toString()}`);
  },
  get(id: number) {
    return call<WordCard>(`${BASE}/${id}`);
  },
  create(fields: WordCardFields) {
    return call<WordCard>(BASE, { method: "POST", body: JSON.stringify(fields) });
  },
  update(id: number, patch: WordCardPatch) {
    return call<WordCard>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  },
  setStatus(id: number, status: WordCardStatus) {
    return call<WordCard>(`${BASE}/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
  },
  remove(id: number) {
    return call<{ deleted: boolean }>(`${BASE}/${id}`, { method: "DELETE" });
  },
  upload(cards: UploadCard[], dryRun: boolean) {
    return call<UploadResult>(`${BASE}/upload`, { method: "POST", body: JSON.stringify({ dryRun, cards }) });
  },
  plan(range: { from?: string; to?: string } = {}) {
    const search = new URLSearchParams();
    if (range.from) search.set("from", range.from);
    if (range.to) search.set("to", range.to);
    const query = search.toString();
    return call<WordPlan>(`${BASE}/plan${query ? `?${query}` : ""}`);
  },
  planNow() {
    return call<WordPlan>(`${BASE}/plan/refresh`, { method: "POST" });
  },
  pin(date: string, kind: WordKind, cardId: number) {
    return call<WordPlan>(`${BASE}/plan/${date}/${kind}`, { method: "PUT", body: JSON.stringify({ cardId }) });
  },
  swap(date: string, kind: WordKind) {
    return call<WordPlan>(`${BASE}/plan/${date}/${kind}`, { method: "DELETE" });
  },
};
