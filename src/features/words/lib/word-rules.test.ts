import { describe, expect, it } from "vitest";
import type { WordCard, WordPlan } from "@/lib/api/admin-words";
import {
  addDays,
  cameOutLine,
  canGoReady,
  cardState,
  changedFields,
  chunk,
  emptyForm,
  formatDay,
  formToFields,
  parseCardFile,
  parseSyllables,
  planRows,
  slugify,
  splitUnderline,
  toForm,
} from "./word-rules";

const card = (over: Partial<WordCard> = {}): WordCard => ({
  id: 7,
  kind: "WORD",
  status: "DRAFT",
  slug: "insolvent",
  headword: "insolvent",
  partOfSpeech: "adjective",
  sayAs: "in-SOL-vent",
  ipa: "/ɪnˈsɒlvənt/",
  syllables: ["in", "sol", "vent"],
  stressIndex: 1,
  meaning: "Not able to pay the money you owe.",
  examples: ["After the market fire, many traders were left insolvent."],
  builtFrom: null,
  comesFrom: null,
  opposite: "solvent",
  closeTo: null,
  watchOut: null,
  answerNote: null,
  trapOption: "D",
  theme: "money",
  questions: [
    { questionId: 4100, isMain: true, board: "JAMB", year: 1978, subject: "English", reviewStatus: "DRAFT", excerpt: "x" },
  ],
  shownOn: [],
  plannedFor: [],
  readyProblems: [],
  createdAt: "2026-11-19T10:00:00.000Z",
  updatedAt: "2026-11-19T10:00:00.000Z",
  ...over,
});

describe("slugify", () => {
  it("matches the backend rule", () => {
    expect(slugify("Neck and neck")).toBe("neck-and-neck");
    expect(slugify("cock-and-bull story")).toBe("cock-and-bull-story");
    expect(slugify("a pig's ear")).toBe("a-pigs-ear");
    expect(slugify("café")).toBe("cafe");
  });
});

describe("chunk", () => {
  it("splits a list into groups", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});

describe("parseCardFile", () => {
  const good = {
    kind: "WORD",
    headword: "insolvent",
    meaning: "Not able to pay.",
    questionMatches: [{ year: 1978, textIncludes: "The bill has to wait" }],
  };

  it("reads { cards: [...] } and a bare list", () => {
    expect(parseCardFile(JSON.stringify({ cards: [good] })).cards).toHaveLength(1);
    expect(parseCardFile(JSON.stringify([good])).problems).toEqual([]);
  });

  it("refuses broken files", () => {
    expect(parseCardFile("{nope").problems[0]).toMatch(/not valid JSON/);
    expect(parseCardFile(JSON.stringify({ words: [] })).problems[0]).toMatch(/"cards" list/);
    expect(parseCardFile(JSON.stringify({ cards: [] })).problems[0]).toMatch(/no cards/);
  });

  it("names the card that is missing something", () => {
    const { problems } = parseCardFile(JSON.stringify([{ ...good, kind: "PHRASE", questionMatches: [{ year: 1978 }] }]));
    expect(problems).toContain('"insolvent": kind must be WORD or IDIOM.');
    expect(problems).toContain('"insolvent": question 1 needs a year and textIncludes.');
  });

  it("finds the same link twice in one file", () => {
    const { problems } = parseCardFile(JSON.stringify([good, { ...good, headword: "Insolvent" }]));
    expect(problems).toContain("/insolvent is in the file 2 times.");
  });

  it("reads the real pipeline file's shape", () => {
    const real = {
      cards: [
        { ...good, questionMatches: [{ year: 1980, textIncludes: "never been a good mediator", isMain: true }, { year: 1981, textIncludes: "is an immature" }] },
      ],
    };
    expect(parseCardFile(JSON.stringify(real)).problems).toEqual([]);
  });
});

describe("showing a card", () => {
  it("labels the status", () => {
    expect(cardState(card({ status: "READY" }))).toEqual({ label: "Ready", tone: "success" });
    expect(cardState(card({ readyProblems: ["The main question is not published yet."] })).label).toBe("Draft · 1 to fix");
    expect(cardState(card()).label).toBe("Draft");
  });

  it("knows which drafts can go ready", () => {
    expect(canGoReady(card())).toBe(true);
    expect(canGoReady(card({ readyProblems: ["x"] }))).toBe(false);
    expect(canGoReady(card({ status: "READY" }))).toBe(false);
  });

  it("splits the tested word out of the stem", () => {
    expect(splitUnderline("The bill has to wait as we are now <u>insolvent</u>.")).toEqual([
      { text: "The bill has to wait as we are now ", underlined: false },
      { text: "insolvent", underlined: true },
      { text: ".", underlined: false },
    ]);
    // An excerpt cut in the middle of a tag drops the broken tag.
    expect(splitUnderline("we are now <u>insol...")).toEqual([{ text: "we are now insol...", underlined: false }]);
  });

  it("lists the years a word came out", () => {
    expect(cameOutLine(card())).toBe("JAMB 1978");
    const twice = card({
      questions: [
        { questionId: 2, isMain: false, board: "JAMB", year: 1982, subject: "English", reviewStatus: "PUBLISHED", excerpt: "" },
        { questionId: 1, isMain: true, board: "JAMB", year: 1978, subject: "English", reviewStatus: "PUBLISHED", excerpt: "" },
      ],
    });
    expect(cameOutLine(twice)).toBe("JAMB 1978, 1982");
    expect(cameOutLine(card({ questions: [] }))).toBe("No question linked");
  });

  it("formats days without shifting them", () => {
    expect(formatDay("2026-11-19")).toBe("Thu 19 Nov");
    expect(formatDay("2026-12-31", true)).toBe("Thu 31 Dec 2026");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-11-19", -7)).toBe("2026-11-12");
  });
});

describe("the card form", () => {
  it("reads syllables however they are typed", () => {
    expect(parseSyllables("in · sol · vent")).toEqual(["in", "sol", "vent"]);
    expect(parseSyllables("in-sol-vent")).toEqual(["in", "sol", "vent"]);
    expect(parseSyllables("  ")).toEqual([]);
  });

  it("round-trips a saved card with no changes", () => {
    const saved = card();
    const { fields } = formToFields(toForm(saved));
    expect(fields).not.toBeNull();
    expect(changedFields(saved, fields!)).toEqual({});
  });

  it("sends only what changed", () => {
    const saved = card();
    const form = toForm(saved);
    form.meaning = "  Unable to pay your debts. ";
    form.closeTo = "bankrupt";
    form.examples[1] = "The club is insolvent.";
    const { fields } = formToFields(form);
    expect(changedFields(saved, fields!)).toEqual({
      meaning: "Unable to pay your debts.",
      closeTo: "bankrupt",
      examples: ["After the market fire, many traders were left insolvent.", "The club is insolvent."],
    });
  });

  it("clears a field with null and drops the stress when syllables go", () => {
    const saved = card();
    const form = toForm(saved);
    form.opposite = "";
    form.syllables = "";
    const patch = changedFields(saved, formToFields(form).fields!);
    expect(patch).toEqual({ opposite: null, syllables: [], stressIndex: null });
  });

  it("sends the question links when they change", () => {
    const saved = card();
    const form = toForm(saved);
    form.questions.push({ questionId: "#4321", isMain: false });
    expect(changedFields(saved, formToFields(form).fields!).questions).toEqual([
      { questionId: 4100, isMain: true },
      { questionId: 4321, isMain: false },
    ]);
  });

  it("says what to fix first", () => {
    const form = emptyForm("IDIOM");
    form.syllables = "neck · and";
    form.questions = [
      { questionId: "12", isMain: true },
      { questionId: "abc", isMain: false },
    ];
    const { fields, errors } = formToFields(form);
    expect(fields).toBeNull();
    expect(errors.headword).toBeDefined();
    expect(errors.meaning).toBeDefined();
    expect(errors.syllables).toMatch(/Only words/);
    expect(errors.questions).toMatch(/"abc"/);
  });

  it("refuses two main questions", () => {
    const form = toForm(card());
    form.questions.push({ questionId: "99", isMain: true });
    expect(formToFields(form).errors.questions).toMatch(/only one/);
  });

  it("leaves the slug out of a new card when it is empty", () => {
    const form = emptyForm();
    form.headword = "penury";
    form.meaning = "Being very poor.";
    expect(formToFields(form).fields).not.toHaveProperty("slug");
  });
});

describe("planRows", () => {
  const plan: WordPlan = {
    today: "2026-11-19",
    days: [
      { date: "2026-11-19", kind: "WORD", cardId: 1, headword: "insolvent", status: "READY", cycle: 1, pinned: false, isPast: false },
      { date: "2026-11-19", kind: "IDIOM", cardId: 2, headword: "neck and neck", status: "READY", cycle: 1, pinned: false, isPast: false },
      { date: "2026-11-21", kind: "WORD", cardId: 3, headword: "penury", status: "READY", cycle: 1, pinned: true, isPast: false },
    ],
    cycles: { WORD: { cycle: 1, ready: 3, leftInCycle: 1 }, IDIOM: { cycle: 1, ready: 1, leftInCycle: 0 } },
  };

  it("gives one row per day, gaps included", () => {
    const rows = planRows(plan, "2026-11-18", "2026-11-21");
    expect(rows.map((row) => row.date)).toEqual(["2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"]);
    expect(rows[0]).toMatchObject({ isPast: true, word: null, idiom: null });
    expect(rows[1]).toMatchObject({ isToday: true });
    expect(rows[1].idiom?.headword).toBe("neck and neck");
    expect(rows[2].word).toBeNull();
    expect(rows[3].word?.pinned).toBe(true);
  });
});
