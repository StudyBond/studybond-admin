import { describe, expect, it } from "vitest";
import {
  fillQuestionsToken,
  hasQuestionsToken,
  SAMPLE_QUESTIONS_PHRASE,
} from "./stimulus-preview";

describe("stimulus preview token", () => {
  it("fills every occurrence, whatever the spacing or case", () => {
    expect(
      fillQuestionsToken("Use the diagram to answer {{QUESTIONS}}. See {{ questions }}.", "questions 21 to 23"),
    ).toBe("Use the diagram to answer questions 21 to 23. See questions 21 to 23.");
  });

  it("leaves text without the token alone, and other braces too", () => {
    expect(fillQuestionsToken("Option {{C}} is right.", SAMPLE_QUESTIONS_PHRASE)).toBe("Option {{C}} is right.");
  });

  it("detects the token, repeatedly (no stale regex state)", () => {
    expect(hasQuestionsToken("answer {{QUESTIONS}}")).toBe(true);
    expect(hasQuestionsToken("answer {{QUESTIONS}}")).toBe(true);
    expect(hasQuestionsToken("no token")).toBe(false);
  });
});
