import type { AdminQuestionsFilters } from "@/features/questions/hooks/use-admin-questions";
import { QUEUE_ORDERS, type QueueOrder } from "@/features/questions/lib/review-queue";
import { QUESTION_POOL_OPTIONS } from "@/lib/utils/questions";

/**
 * Where a reviewer is in content review: the filters, the view, and the
 * question open. Kept in the page address, so a reload or a shared link
 * opens on the same question, and saved per board in the browser, so coming
 * back from the sidebar picks up where the reviewer stopped.
 *
 * The address and the saved copy are the same query string, read by the
 * same code. Anything it does not recognise falls back to the default, so an
 * old or hand-edited link still opens.
 */

export type ReviewStatusScope = "DRAFT,VERIFIED" | "DRAFT" | "VERIFIED";
export type PictureFilter = "" | "needed" | "to_check";
export type ReviewView = "queue" | "list";

export type ReviewFilters = {
  subject: string;
  /** A year, "none" for questions with no year, or "" for any. */
  year: string;
  status: ReviewStatusScope;
  pool: string;
  picture: PictureFilter;
  order: QueueOrder;
};

export type ReviewPlace = {
  filters: ReviewFilters;
  view: ReviewView;
  /** The question open, or null for the start of the queue. */
  at: number | null;
};

export const DEFAULT_FILTERS: ReviewFilters = {
  subject: "",
  year: "",
  status: "DRAFT,VERIFIED",
  pool: "",
  picture: "",
  order: "oldest",
};

export const NO_YEAR = "none";

const STATUS_IN_URL: Record<ReviewStatusScope, string | null> = {
  "DRAFT,VERIFIED": null,
  DRAFT: "draft",
  VERIFIED: "verified",
};

/** The keys this page owns in the address. `board` and `question` are read elsewhere. */
const PLACE_KEYS = ["subject", "year", "status", "pool", "pictures", "sort", "view", "at"];

function positiveInt(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return number > 0 ? number : null;
}

/** The place in a query string, or null when it says nothing about one. */
export function readPlace(params: URLSearchParams): ReviewPlace | null {
  if (!PLACE_KEYS.some((key) => params.has(key))) return null;

  const year = params.get("year") ?? "";
  const status = params.get("status");
  const pool = params.get("pool") ?? "";
  const picture = params.get("pictures");
  const order = params.get("sort");

  return {
    filters: {
      subject: (params.get("subject") ?? "").trim(),
      year: year === NO_YEAR || positiveInt(year) ? year : "",
      status: status === "draft" ? "DRAFT" : status === "verified" ? "VERIFIED" : "DRAFT,VERIFIED",
      pool: QUESTION_POOL_OPTIONS.some((option) => option.value === pool) ? pool : "",
      picture: picture === "needed" || picture === "to_check" ? picture : "",
      order: QUEUE_ORDERS.includes(order as QueueOrder) ? (order as QueueOrder) : DEFAULT_FILTERS.order,
    },
    view: params.get("view") === "list" ? "list" : "queue",
    at: positiveInt(params.get("at")),
  };
}

/** The place as a query string. Defaults are left out, so a fresh queue has a clean address. */
export function writePlace(place: ReviewPlace, board: string) {
  const params = new URLSearchParams();
  params.set("board", board);
  const { filters } = place;
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.year) params.set("year", filters.year);
  const status = STATUS_IN_URL[filters.status];
  if (status) params.set("status", status);
  if (filters.pool) params.set("pool", filters.pool);
  if (filters.picture) params.set("pictures", filters.picture);
  if (filters.order !== DEFAULT_FILTERS.order) params.set("sort", filters.order);
  if (place.view === "list") params.set("view", "list");
  if (place.at !== null) params.set("at", String(place.at));
  return params;
}

/** How many of the narrowing filters are set. Sort is not one: it changes the order, not what is shown. */
export function activeFilterCount(filters: ReviewFilters) {
  return [
    filters.subject,
    filters.year,
    filters.status !== DEFAULT_FILTERS.status,
    filters.pool,
    filters.picture,
  ].filter(Boolean).length;
}

/** The filters as the question list asks for them. */
export function toQueueQuery(
  filters: ReviewFilters,
  institutionCode: string,
): Omit<AdminQuestionsFilters, "afterId" | "page" | "limit"> {
  return {
    institutionCode,
    reviewStatus: filters.status,
    subject: filters.subject || undefined,
    year: filters.year && filters.year !== NO_YEAR ? Number(filters.year) : undefined,
    noYear: filters.year === NO_YEAR ? true : undefined,
    questionPool: filters.pool || undefined,
    picture: filters.picture || undefined,
    order: filters.order,
  };
}

const STORAGE_PREFIX = "studybond-admin:review-place:";

/** The place last saved for this board, if any. */
export function loadSavedPlace(board: string): ReviewPlace | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_PREFIX + board);
    return saved ? readPlace(new URLSearchParams(saved)) : null;
  } catch {
    // Storage can throw in private mode. Starting at the top is fine.
    return null;
  }
}

export function savePlace(place: ReviewPlace, board: string) {
  try {
    const params = writePlace(place, board);
    params.delete("board");
    window.localStorage.setItem(STORAGE_PREFIX + board, params.toString());
  } catch {
    // Remembering the place is a convenience, not a requirement.
  }
}
