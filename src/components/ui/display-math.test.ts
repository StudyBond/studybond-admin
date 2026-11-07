import { describe, expect, it } from "vitest";
import { promoteOneLineDisplayMath } from "./display-math";

describe("promoteOneLineDisplayMath", () => {
  it("turns a one-line $$…$$ into a fenced display block", () => {
    const out = promoteOneLineDisplayMath("First:\n\n$$x = \\frac{a}{b}$$\n\nThen.");
    expect(out).toContain("\n$$\nx = \\frac{a}{b}\n$$\n");
    expect(out.startsWith("First:")).toBe(true);
    expect(out.endsWith("Then.")).toBe(true);
  });

  it("works when the equation line touches the text lines around it", () => {
    const out = promoteOneLineDisplayMath("Moles:\n$$n = 2$$\nso double it.");
    expect(out).toBe("Moles:\n\n$$\nn = 2\n$$\n\nso double it.");
  });

  it("keeps blockquote markers on every line it adds", () => {
    const out = promoteOneLineDisplayMath("> **Rule**\n> $$r \\propto \\frac{1}{\\sqrt{M}}$$");
    expect(out).toBe("> **Rule**\n>\n> $$\n> r \\propto \\frac{1}{\\sqrt{M}}\n> $$\n>");
  });

  it("leaves $$…$$ inside a sentence inline", () => {
    const text = "The rate is $$\\frac{1}{t}$$ here.";
    expect(promoteOneLineDisplayMath(text)).toBe(text);
  });

  it("leaves a line holding two $$…$$ alone", () => {
    const text = "$$a$$ and $$b$$";
    expect(promoteOneLineDisplayMath(text)).toBe(text);
  });

  it("leaves fenced blocks and single-dollar maths untouched", () => {
    const text = "$$\nx = 1\n$$\n\nInline $y$ stays.";
    expect(promoteOneLineDisplayMath(text)).toBe(text);
  });
});
