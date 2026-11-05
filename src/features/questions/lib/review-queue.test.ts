import { describe, expect, it } from "vitest";
import type { QuestionListItem, QuestionListResponse } from "@/lib/api/types";
import {
  compareInQueue,
  flatten,
  hasMoreAfter,
  keyOf,
  loadedFrom,
  neighbourOf,
  pickCurrent,
  type QueueOrder,
} from "@/features/questions/lib/review-queue";

/* Only ids and years matter to these rules. The rest of the row is filler. */
function rows(ids: number[]) {
  return ids.map((id) => ({ id, year: null })) as QuestionListItem[];
}

function dated(pairs: Array<[number, number | null]>) {
  return pairs.map(([id, year]) => ({ id, year })) as QuestionListItem[];
}

function sorted(list: QuestionListItem[], order: QueueOrder) {
  return [...list].sort((a, b) => compareInQueue(keyOf(a), keyOf(b), order));
}

describe("review queue order", () => {
  it("oldest first: next is the larger id, previous the smaller", () => {
    const list = rows([3, 4, 6, 7]);
    expect(neighbourOf(list, { id: 4 }, "oldest", 1)?.id).toBe(6);
    expect(neighbourOf(list, { id: 6 }, "oldest", -1)?.id).toBe(4);
  });

  it("newest first: next is the smaller id, previous the larger", () => {
    const list = rows([7, 6, 4, 3]);
    expect(neighbourOf(list, { id: 6 }, "newest", 1)?.id).toBe(4);
    expect(neighbourOf(list, { id: 4 }, "newest", -1)?.id).toBe(6);
  });

  it("returns nothing at either end of the list", () => {
    expect(neighbourOf(rows([3, 4]), { id: 4 }, "oldest", 1)).toBeUndefined();
    expect(neighbourOf(rows([3, 4]), { id: 3 }, "oldest", -1)).toBeUndefined();
  });

  it("latest exam year first, then by upload, with no year last", () => {
    const list = dated([[5, 2019], [2, null], [9, 2021], [3, 2019], [1, 2015], [7, null]]);
    expect(sorted(list, "year_desc").map((q) => q.id)).toEqual([9, 3, 5, 1, 2, 7]);
  });

  it("earliest exam year first, with no year still last", () => {
    const list = dated([[5, 2019], [2, null], [9, 2021], [3, 2019], [1, 2015]]);
    expect(sorted(list, "year_asc").map((q) => q.id)).toEqual([1, 3, 5, 9, 2]);
  });

  it("finds neighbours by year as well as id", () => {
    const list = dated([[9, 2021], [3, 2019], [5, 2019], [1, 2015], [2, null]]);
    expect(neighbourOf(list, { id: 3, year: 2019 }, "year_desc", 1)?.id).toBe(5);
    expect(neighbourOf(list, { id: 5, year: 2019 }, "year_desc", 1)?.id).toBe(1);
    expect(neighbourOf(list, { id: 1, year: 2015 }, "year_desc", 1)?.id).toBe(2);
    expect(neighbourOf(list, { id: 3, year: 2019 }, "year_desc", -1)?.id).toBe(9);
  });
});

describe("pickCurrent", () => {
  it("opens the first question when nothing is open yet, in either order", () => {
    expect(pickCurrent(rows([3, 4]), null, "oldest")?.id).toBe(3);
    expect(pickCurrent(rows([4, 3]), null, "newest")?.id).toBe(4);
  });

  it("keeps the open question while it is still in the list", () => {
    expect(pickCurrent(rows([3, 4, 6]), { id: 4 }, "oldest")?.id).toBe(4);
  });

  it("moves to the next question when the open one is published and leaves", () => {
    // Oldest first: 5 was published, so 6 is next.
    expect(pickCurrent(rows([3, 4, 6, 7]), { id: 5 }, "oldest")?.id).toBe(6);
  });

  it("moves to the next question in newest-first order too", () => {
    // Newest first: 5 was published, so the next one down, 4, is next.
    expect(pickCurrent(rows([9, 8, 6, 4]), { id: 5 }, "newest")?.id).toBe(4);
  });

  it("moves to the next in exam-year order when the open one leaves", () => {
    const list = dated([[9, 2021], [3, 2019], [1, 2015]]);
    // 5 (2019) was published: 3 came before it, so 1 is next.
    expect(pickCurrent(list, { id: 5, year: 2019 }, "year_desc")?.id).toBe(1);
  });

  it("opens the first loaded question for a start point whose year is unknown", () => {
    // The queue was loaded from that question on, so the first is where it stood.
    const list = dated([[4, 2018], [8, 2016]]);
    expect(pickCurrent(list, { id: 6 }, "year_desc")?.id).toBe(4);
  });

  it("falls back to the previous question when nothing comes after", () => {
    expect(pickCurrent(rows([1, 2, 3]), { id: 5 }, "oldest")?.id).toBe(3);
  });

  it("returns nothing when the list is empty", () => {
    expect(pickCurrent([], { id: 5 }, "oldest")).toBeNull();
    expect(pickCurrent([], null, "oldest")).toBeNull();
  });
});

function page(ids: number[], before: number | undefined, total: number) {
  return { questions: rows(ids), meta: { page: 1, limit: 100, total, totalPages: 1, before } } as QuestionListResponse;
}

describe("loaded batches", () => {
  it("joins the pages in order and tolerates no data yet", () => {
    expect(flatten([page([1, 2], 0, 3), page([3], 2, 3)]).map((q) => q.id)).toEqual([1, 2, 3]);
    expect(flatten(undefined)).toEqual([]);
  });

  it("keeps a question once when two batches both hold it", () => {
    expect(flatten([page([1, 2], 0, 3), page([2, 3], 1, 3)]).map((q) => q.id)).toEqual([1, 2, 3]);
  });

  it("counts from the first batch, for a queue opened part-way", () => {
    expect(loadedFrom([page([41, 42], 40, 90)])).toBe(40);
    expect(loadedFrom(undefined)).toBe(0);
  });

  it("knows whether more come after a batch", () => {
    expect(hasMoreAfter(page([41, 42], 40, 90), 2)).toBe(true);
    expect(hasMoreAfter(page([89, 90], 88, 90), 2)).toBe(false);
    // A short batch that started part-way through is not the end.
    expect(hasMoreAfter(page([1], 0, 90), 100)).toBe(true);
    // An older backend with no count before: a short batch is the end.
    expect(hasMoreAfter(page([1], undefined, 90), 100)).toBe(false);
  });
});
