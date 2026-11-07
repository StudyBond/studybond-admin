/**
 * remark-math only treats `$$` as display math when the dollar signs sit on
 * lines of their own. Question explanations usually write a display equation
 * on one line — `$$x = \frac{a}{b}$$` — which remark-math parses as inline
 * math, so fractions shrink and the equation hugs the left edge.
 *
 * This rewrites any line that is nothing but one `$$…$$` (optionally inside a
 * blockquote or a list indent) into the fenced form, so it renders full-size
 * and centred, the way the author meant it. A `$$…$$` in the middle of a
 * sentence is left alone, and so is a line holding two of them.
 *
 * Kept in step with studybond-web's copy of the same file.
 */
const ONE_LINE_DISPLAY_MATH =
  /^([ \t]*(?:>[ \t]*)*)\$\$((?:(?!\$\$).)+)\$\$[ \t]*$/gm;

export function promoteOneLineDisplayMath(markdown: string): string {
  return markdown.replace(
    ONE_LINE_DISPLAY_MATH,
    (_match, prefix: string, formula: string) => {
      // Blank lines around the fence, keeping any blockquote markers so the
      // quote does not end early.
      const blank = prefix.trimEnd();
      return [blank, `${prefix}$$`, `${prefix}${formula.trim()}`, `${prefix}$$`, blank].join(
        "\n",
      );
    },
  );
}
