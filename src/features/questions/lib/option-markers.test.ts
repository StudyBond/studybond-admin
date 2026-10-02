import { describe, expect, it } from "vitest";
import { resolveOptionMarkers } from "./option-markers";

describe("option markers in the preview", () => {
  it("swaps a marker for the option's own letter", () => {
    expect(resolveOptionMarkers("The answer is **{{C}} — vulcanization**.")).toBe(
      "The answer is **C — vulcanization**.",
    );
  });

  it("swaps every marker, not just the first", () => {
    expect(resolveOptionMarkers("{{A}} and {{B}} are wrong; {{D}} and {{E}} too.")).toBe(
      "A and B are wrong; D and E too.",
    );
  });

  it("allows spaces inside the braces, as the server does", () => {
    expect(resolveOptionMarkers("Answer: {{ B }}.")).toBe("Answer: B.");
  });

  it("leaves the stimulus token alone", () => {
    // stimulus-preview.ts uses {{QUESTIONS}} in the same text.
    expect(resolveOptionMarkers("Use the diagram to answer {{QUESTIONS}}.")).toBe(
      "Use the diagram to answer {{QUESTIONS}}.",
    );
  });

  it("leaves a malformed marker alone so the reviewer can see it is wrong", () => {
    expect(resolveOptionMarkers("{{b}} and {{F}} and {{option B}}")).toBe(
      "{{b}} and {{F}} and {{option B}}",
    );
  });

  it("leaves LaTeX braces untouched", () => {
    const latex = "$$\\sqrt{\\frac{1}{2}}$$";
    expect(resolveOptionMarkers(latex)).toBe(latex);
  });

  it("passes empty and missing text straight through", () => {
    expect(resolveOptionMarkers("")).toBe("");
    expect(resolveOptionMarkers(null)).toBeNull();
    expect(resolveOptionMarkers(undefined)).toBeNull();
  });
});
