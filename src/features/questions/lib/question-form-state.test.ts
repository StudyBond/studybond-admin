import { describe, expect, it } from "vitest";
import type { QuestionRecord } from "@/lib/api/types";
import {
  availableLetters,
  buildPayload,
  createInitialState,
  kindOfQuestion,
  validateForm,
  type FormState,
} from "./question-form-state";

const REAL = {
  optionA: "a",
  optionB: "b",
  optionC: "c",
  optionD: "d",
  correctAnswer: "B",
};
const BLANK = {
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAnswer: "",
};

function record(overrides: Record<string, unknown> = {}): QuestionRecord {
  return {
    id: 10,
    institutionCode: "ui",
    questionText: "Which part is labelled X?",
    subject: "Biology",
    questionType: "real_past_question",
    questionPool: "REAL_BANK",
    reviewStatus: "PUBLISHED",
    parentQuestionId: null,
    optionE: null,
    ...REAL,
    ...overrides,
  } as unknown as QuestionRecord;
}

function state(overrides: Partial<FormState> = {}): FormState {
  return createInitialState(
    null,
    {
      questionText: "Q",
      subject: "Biology",
      optionA: "a",
      optionB: "b",
      optionC: "c",
      optionD: "d",
      ...overrides,
    },
  );
}

describe("kindOfQuestion", () => {
  it("is standalone for an ordinary question and for nothing at all", () => {
    expect(kindOfQuestion(record())).toBe("standalone");
    expect(kindOfQuestion(null)).toBe("standalone");
  });

  it("is child when it has a parent", () => {
    expect(kindOfQuestion(record({ parentQuestionId: 5 }))).toBe("child");
  });

  it("is parent when it has questions attached, or when it is a blank row", () => {
    expect(kindOfQuestion(record({ ...BLANK, childCount: 2 }))).toBe("parent");
    expect(kindOfQuestion(record({ ...BLANK }))).toBe("parent");
    expect(kindOfQuestion(record({ childCount: 1 }))).toBe("parent");
  });
});

describe("createInitialState", () => {
  it("starts a new question as standalone, and applies overrides on top", () => {
    expect(createInitialState().kind).toBe("standalone");
    expect(createInitialState(null, { kind: "parent" }).kind).toBe("parent");
  });

  it("keeps a sensible answer letter for a shared row whose answer is blank", () => {
    expect(createInitialState(record({ ...BLANK })).correctAnswer).toBe("A");
  });

  it("loads the team notes apart from the learner notes", () => {
    const loaded = createInitialState(
      record({
        internalNotes: "Option D was written to fill a gap.",
        explanation: { additionalNotes: "Source: JAMB UTME 1983.", explanationText: "x" },
      }),
    );
    expect(loaded.internalNotes).toBe("Option D was written to fill a gap.");
    expect(loaded.additionalNotes).toBe("Source: JAMB UTME 1983.");
  });
});

describe("buildPayload", () => {
  it("sends an ordinary question with its own answer and no parent", () => {
    const payload = buildPayload(state({ correctAnswer: "C" })) as Record<string, unknown>;
    expect(payload.correctAnswer).toBe("C");
    expect(payload.parentQuestionId).toBeNull();
    expect(payload.optionA).toBe("a");
  });

  it("sends the parent id for a question that uses a shared diagram", () => {
    const payload = buildPayload(state({ kind: "child", parentQuestionId: "50" })) as Record<string, unknown>;
    expect(payload.parentQuestionId).toBe(50);
    expect(payload.correctAnswer).toBe("A");
  });

  it("drops a leftover parent id when the row is switched back to ordinary", () => {
    const payload = buildPayload(state({ kind: "standalone", parentQuestionId: "50" })) as Record<string, unknown>;
    expect(payload.parentQuestionId).toBeNull();
  });

  it("empties options and answer for a shared diagram, and leaves the explanation alone", () => {
    const payload = buildPayload(
      state({ kind: "parent", explanationText: "should not be sent", additionalNotes: "nor this", correctAnswer: "D" }),
    ) as Record<string, unknown>;

    expect(payload).toMatchObject({ optionA: "", optionB: "", optionC: "", optionD: "", optionE: null, parentQuestionId: null });
    expect(payload.correctAnswer).toBeUndefined();
    expect(payload).not.toHaveProperty("explanationText");
    expect(payload).not.toHaveProperty("additionalNotes");
  });

  it("moves a shared diagram out of the free pool", () => {
    const payload = buildPayload(state({ kind: "parent", questionPool: "FREE_EXAM" })) as Record<string, unknown>;
    expect(payload.questionPool).toBe("REAL_BANK");
    const ordinary = buildPayload(state({ questionPool: "FREE_EXAM" })) as Record<string, unknown>;
    expect(ordinary.questionPool).toBe("FREE_EXAM");
  });

  it("sends team notes as null when empty, so clearing the box clears them", () => {
    expect((buildPayload(state({ internalNotes: "  " })) as Record<string, unknown>).internalNotes).toBeNull();
    expect((buildPayload(state({ internalNotes: "check D" })) as Record<string, unknown>).internalNotes).toBe("check D");
  });
});

describe("validateForm", () => {
  it("accepts a complete ordinary question", () => {
    expect(validateForm(state())).toEqual({});
  });

  it("asks for the text and the subject", () => {
    const errors = validateForm(state({ questionText: " ", subject: "" }));
    expect(errors.questionText).toBeDefined();
    expect(errors.subject).toBeDefined();
  });

  it("needs all four options for an ordinary question", () => {
    expect(validateForm(state({ optionC: "" })).options).toBeDefined();
  });

  it("does not let E be the answer while E is empty", () => {
    expect(validateForm(state({ correctAnswer: "E" })).correctAnswer).toBeDefined();
    expect(validateForm(state({ correctAnswer: "E", optionE: "e" })).correctAnswer).toBeUndefined();
  });

  it("refuses {{QUESTIONS}} on a question, but not on a shared diagram", () => {
    expect(validateForm(state({ explanationText: "See {{QUESTIONS}}." })).questionText).toBeDefined();
    expect(validateForm(state({ kind: "parent", questionText: "Answer {{QUESTIONS}}." })).questionText).toBeUndefined();
  });

  it("needs a diagram picked for a question that uses one", () => {
    expect(validateForm(state({ kind: "child" })).parent).toBeDefined();
    expect(validateForm(state({ kind: "child", parentQuestionId: "50" })).parent).toBeUndefined();
  });

  it("needs no options or answer for a shared diagram, but still its text and subject", () => {
    const blank = state({ kind: "parent", optionA: "", optionB: "", optionC: "", optionD: "" });
    expect(validateForm(blank)).toEqual({});
    expect(validateForm({ ...blank, questionText: "" }).questionText).toBeDefined();
  });
});

describe("availableLetters", () => {
  it("adds E only when it has text", () => {
    expect(availableLetters({ optionE: "" })).toEqual(["A", "B", "C", "D"]);
    expect(availableLetters({ optionE: "e" })).toEqual(["A", "B", "C", "D", "E"]);
  });
});
