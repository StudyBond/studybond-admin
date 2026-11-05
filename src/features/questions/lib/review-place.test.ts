import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  readPlace,
  toQueueQuery,
  writePlace,
  type ReviewPlace,
} from "@/features/questions/lib/review-place";

const read = (query: string) => readPlace(new URLSearchParams(query));

describe("review place in the address", () => {
  it("says nothing for an address with no place in it", () => {
    expect(read("")).toBeNull();
    expect(read("board=UI")).toBeNull();
    expect(read("question=12")).toBeNull();
  });

  it("round-trips a full place", () => {
    const place: ReviewPlace = {
      filters: {
        subject: "Physics",
        year: "2019",
        status: "DRAFT",
        pool: "REAL_BANK",
        picture: "needed",
        order: "year_desc",
      },
      view: "list",
      at: 412,
    };
    const query = writePlace(place, "JAMB").toString();
    expect(query).toBe(
      "board=JAMB&subject=Physics&year=2019&status=draft&pool=REAL_BANK&pictures=needed&sort=year_desc&view=list&at=412",
    );
    expect(readPlace(new URLSearchParams(query))).toEqual(place);
  });

  it("leaves defaults out, so a fresh queue has a short address", () => {
    const query = writePlace({ filters: DEFAULT_FILTERS, view: "queue", at: 7 }, "UI").toString();
    expect(query).toBe("board=UI&at=7");
  });

  it("falls back to the default for anything it does not recognise", () => {
    expect(read("year=soon&status=gone&pool=NOPE&pictures=x&sort=random&view=grid&at=-3")).toEqual({
      filters: DEFAULT_FILTERS,
      view: "queue",
      at: null,
    });
  });

  it("keeps the no-year choice", () => {
    expect(read("year=none")?.filters.year).toBe("none");
  });
});

describe("toQueueQuery", () => {
  it("asks for a year as a number and no year as its own flag", () => {
    expect(toQueueQuery({ ...DEFAULT_FILTERS, year: "2020" }, "UI")).toMatchObject({ year: 2020, noYear: undefined });
    expect(toQueueQuery({ ...DEFAULT_FILTERS, year: "none" }, "UI")).toMatchObject({ year: undefined, noYear: true });
  });

  it("leaves empty filters off", () => {
    expect(toQueueQuery(DEFAULT_FILTERS, "UI")).toEqual({
      institutionCode: "UI",
      reviewStatus: "DRAFT,VERIFIED",
      subject: undefined,
      year: undefined,
      noYear: undefined,
      questionPool: undefined,
      picture: undefined,
      order: "oldest",
    });
  });
});

describe("activeFilterCount", () => {
  it("counts the narrowing filters but not the sort", () => {
    expect(activeFilterCount({ ...DEFAULT_FILTERS, order: "newest" })).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, subject: "Physics", status: "DRAFT" })).toBe(2);
  });
});
