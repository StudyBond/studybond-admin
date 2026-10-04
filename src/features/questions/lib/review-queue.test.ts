import { describe, expect, it } from "vitest";
import type { QuestionListItem } from "@/lib/api/types";
import {
  flatten,
  neighbourOf,
  pickCurrent,
} from "@/features/questions/lib/review-queue";

/* Only ids matter to these rules. The rest of the row is filler. */
function rows(ids: number[]) {
  return ids.map((id) => ({ id })) as QuestionListItem[];
}

describe("review queue order", () => {
  it("oldest first: next is the larger id, previous the smaller", () => {
    const list = rows([3, 4, 6, 7]);
    expect(neighbourOf(list, 4, "oldest", 1)?.id).toBe(6);
    expect(neighbourOf(list, 6, "oldest", -1)?.id).toBe(4);
  });

  it("newest first: next is the smaller id, previous the larger", () => {
    const list = rows([7, 6, 4, 3]);
    expect(neighbourOf(list, 6, "newest", 1)?.id).toBe(4);
    expect(neighbourOf(list, 4, "newest", -1)?.id).toBe(6);
  });

  it("returns nothing at either end of the list", () => {
    expect(neighbourOf(rows([3, 4]), 4, "oldest", 1)).toBeUndefined();
    expect(neighbourOf(rows([3, 4]), 3, "oldest", -1)).toBeUndefined();
  });
});

describe("pickCurrent", () => {
  it("opens the first question when nothing is open yet, in either order", () => {
    expect(pickCurrent(rows([3, 4]), null, "oldest")?.id).toBe(3);
    expect(pickCurrent(rows([4, 3]), null, "newest")?.id).toBe(4);
  });

  it("keeps the open question while it is still in the list", () => {
    expect(pickCurrent(rows([3, 4, 6]), 4, "oldest")?.id).toBe(4);
  });

  it("moves to the next question when the open one is published and leaves", () => {
    // Oldest first: 5 was published, so 6 is next.
    expect(pickCurrent(rows([3, 4, 6, 7]), 5, "oldest")?.id).toBe(6);
  });

  it("moves to the next question in newest-first order too", () => {
    // Newest first: 5 was published, so the next one down, 4, is next.
    expect(pickCurrent(rows([9, 8, 6, 4]), 5, "newest")?.id).toBe(4);
  });

  it("falls back to the previous question when nothing comes after", () => {
    expect(pickCurrent(rows([1, 2, 3]), 5, "oldest")?.id).toBe(3);
  });

  it("returns nothing when the list is empty", () => {
    expect(pickCurrent([], 5, "oldest")).toBeNull();
    expect(pickCurrent([], null, "oldest")).toBeNull();
  });
});

describe("flatten", () => {
  it("joins the pages in order and tolerates no data yet", () => {
    const pages = [
      { questions: rows([1, 2]) },
      { questions: rows([3]) },
    ] as never;
    expect(flatten(pages).map((q) => q.id)).toEqual([1, 2, 3]);
    expect(flatten(undefined)).toEqual([]);
  });
});
