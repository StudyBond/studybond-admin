"use client";

import { ImageLightbox } from "@/components/ui/image-lightbox";
import { cn } from "@/lib/utils/cn";
import "katex/dist/katex.min.css";
import React, { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/**
 * Renders question text exactly as a learner sees it.
 *
 * Ported from studybond-web's MathMarkdown, not re-implemented from
 * scratch: same libraries, same versions, same LaTeX-delimiter
 * normalization, same sanitize schema, same auto-image-linking. A reviewer
 * checking "does this render correctly" has to be looking at the real
 * thing, not an admin's best guess at what the real thing does — a second,
 * slightly-different renderer would be worse than no preview at all, since
 * it would build false confidence.
 *
 * What changed from the source: class names, since this needs to sit
 * inside the admin's own light-on-`--sb-*` system rather than the web
 * app's hand-rolled white/opacity scale — the content itself renders
 * identically either way. `--sb-accent` is already the same token in both
 * apps, so the one color the two surfaces share needed no translation.
 * Every element override is also properly typed against react-markdown's
 * own `Components` type rather than cast through `any` — the source file
 * does that throughout, which this repo's lint treats as an error, not a
 * warning.
 */

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "u",
    "ins",
    "del",
    "s",
    "mark",
    "sub",
    "sup",
    "img",
    "br",
    "span",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "math",
    "annotation",
    "semantics",
    "mrow",
    "mi",
    "mn",
    "mo",
    "mfrac",
    "msup",
    "msub",
    "msubsup",
    "munder",
    "mover",
    "munderover",
    "msqrt",
    "mroot",
    "mtext",
    "mspace",
    "mtable",
    "mtr",
    "mtd",
    "mstyle",
    "merror",
    "mpadded",
    "mphantom",
    "mfenced",
    "menclose",
    "svg",
    "path",
    "use",
    "g",
    "defs",
    "rect",
    "line",
    "circle",
  ],
  attributes: {
    ...defaultSchema.attributes,
    span: ["className", "class", "style"],
    div: ["className", "class", "style"],
    th: ["align"],
    td: ["align"],
    u: [],
    ins: [],
    del: [],
    s: [],
    mark: [],
    sub: [],
    sup: [],
    img: ["src", "alt", "title", "width", "height"],
    math: ["xmlns", "display"],
    annotation: ["encoding"],
    semantics: [],
    mrow: [],
    mi: [],
    mn: [],
    mo: [],
    mfrac: ["linethickness"],
    msup: [],
    msub: [],
    msubsup: [],
    munder: [],
    mover: [],
    munderover: [],
    msqrt: [],
    mroot: [],
    mtext: [],
    mspace: ["width", "height", "depth"],
    mtable: ["columnalign", "rowspacing", "columnspacing"],
    mtr: [],
    mtd: ["columnalign"],
    mstyle: [
      "mathsize",
      "mathcolor",
      "mathbackground",
      "displaystyle",
      "scriptlevel",
    ],
    merror: [],
    mpadded: [],
    mphantom: [],
    mfenced: ["open", "close", "separators"],
    menclose: ["notation"],
    svg: [
      "xmlns",
      "width",
      "height",
      "viewBox",
      "preserveAspectRatio",
      "aria-hidden",
      "focusable",
      "role",
      "style",
    ],
    path: ["d", "stroke", "fill", "stroke-width", "stroke-linecap", "stroke-linejoin"],
    use: ["x", "y", "width", "height"],
    g: ["transform", "fill", "stroke", "class"],
    defs: [],
    rect: ["x", "y", "width", "height", "fill", "stroke"],
    line: ["x1", "y1", "x2", "y2", "stroke", "stroke-width"],
    circle: ["cx", "cy", "r", "fill", "stroke"],
  },
  protocols: { ...defaultSchema.protocols },
};

const IMAGE_EXT_PATTERN = /\.(?:png|jpe?g|gif|webp|svg|bmp|ico|avif)(?:\?[^\s)]*)?$/i;
const IMAGE_HOST_PATTERN =
  /(?:lh3\.googleusercontent\.com|res\.cloudinary\.com|i\.imgur\.com|drive\.google\.com)/i;

type MathMarkdownProps = {
  content: string | null | undefined;
  className?: string;
  variant?: "default" | "question" | "explanation" | "option";
};

const VARIANT_CLASSES: Record<NonNullable<MathMarkdownProps["variant"]>, string> = {
  default: "prose prose-sm max-w-none text-white/90",
  question:
    "prose prose-base max-w-none text-white font-medium leading-relaxed",
  explanation: "prose prose-sm max-w-none text-white/80 leading-relaxed",
  option: "prose prose-sm max-w-none text-inherit leading-relaxed [&>p]:mb-0",
};

export const MathMarkdown = React.memo(function MathMarkdown({
  content,
  className,
  variant = "default",
}: MathMarkdownProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const normalizeImageUrl = React.useCallback(
    (url: string | null | undefined): string | null => {
      if (!url) return null;
      if (url.includes("drive.google.com")) {
        let fileId: string | null = null;
        const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileDMatch?.[1]) {
          fileId = fileDMatch[1];
        } else {
          const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          if (idMatch?.[1]) fileId = idMatch[1];
        }
        if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}=s0`;
      }
      return url;
    },
    [],
  );

  const isImageUrl = React.useCallback((url: string): boolean => {
    return IMAGE_EXT_PATTERN.test(url) || IMAGE_HOST_PATTERN.test(url);
  }, []);

  const processedContent = React.useMemo(() => {
    if (!content) return "";

    let processed = content
      .replace(/\\\((.*?)\\\)/g, (_, formula) => `$${formula}$`)
      .replace(/\\\[(.*?)\\\]/g, (_, formula) => `\n$$\n${formula}\n$$\n`)
      .trim();

    processed = processed.replace(
      /(!?\[[^\]]*\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<]+)/gi,
      (match, markdownLinkOrImage, markdownUrl, bareUrl) => {
        if (markdownLinkOrImage) {
          if (markdownUrl && isImageUrl(markdownUrl)) {
            const normalized = normalizeImageUrl(markdownUrl) || markdownUrl;
            const prefix = match.startsWith("!") ? "!" : "";
            const altText = match.slice(prefix.length + 1, match.indexOf("]"));
            return `${prefix}[${altText}](${normalized})`;
          }
          return match;
        }
        if (bareUrl && isImageUrl(bareUrl)) {
          const normalized = normalizeImageUrl(bareUrl) || bareUrl;
          return `![image](${normalized})`;
        }
        return match;
      },
    );

    return processed;
  }, [content, isImageUrl, normalizeImageUrl]);

  const components = React.useMemo<Components>(
    () => ({
      p: ({ node, children, ...rest }) => (
        <p className="mb-2 last:mb-0" {...rest}>
          {children}
        </p>
      ),
      ul: ({ node, children, ...rest }) => (
        <ul className="mb-2 list-inside list-disc space-y-1" {...rest}>
          {children}
        </ul>
      ),
      ol: ({ node, children, ...rest }) => (
        <ol className="mb-2 list-inside list-decimal space-y-1" {...rest}>
          {children}
        </ol>
      ),
      li: ({ node, children, ...rest }) => (
        <li className="text-white/80" {...rest}>
          {children}
        </li>
      ),
      strong: ({ node, children, ...rest }) => (
        <strong className="font-semibold text-white" {...rest}>
          {children}
        </strong>
      ),
      em: ({ node, children, ...rest }) => (
        <em className="italic text-white/90" {...rest}>
          {children}
        </em>
      ),
      code: ({ node, className: codeClassName, children, ...rest }) => {
        const inline =
          !node ||
          (node.tagName === "code" && !codeClassName?.includes("language-"));
        return (
          <code
            className={cn(
              inline
                ? "rounded bg-white/10 px-2 py-0.5 font-mono text-xs text-white/90"
                : "mb-2 block overflow-x-auto rounded bg-white/5 p-2 font-mono text-xs text-white/80",
            )}
            {...rest}
          >
            {children}
          </code>
        );
      },
      blockquote: ({ node, children, ...rest }) => (
        <blockquote
          className="mb-2 border-l-4 border-white/30 py-2 pl-4 italic text-white/70"
          {...rest}
        >
          {children}
        </blockquote>
      ),
      u: ({ node, children, ...rest }) => (
        <span className="underline decoration-white/60 underline-offset-2" {...rest}>
          {children}
        </span>
      ),
      sub: ({ node, children, ...rest }) => (
        <sub className="text-[0.75em]" {...rest}>
          {children}
        </sub>
      ),
      sup: ({ node, children, ...rest }) => (
        <sup className="text-[0.75em]" {...rest}>
          {children}
        </sup>
      ),
      table: ({ node, children, ...rest }) => (
        <div className="mb-3 max-w-full overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[34rem] border-collapse text-sm" {...rest}>
            {children}
          </table>
        </div>
      ),
      thead: ({ node, children, ...rest }) => (
        <thead className="bg-white/10 text-white/90" {...rest}>
          {children}
        </thead>
      ),
      tbody: ({ node, children, ...rest }) => (
        <tbody className="divide-y divide-white/5" {...rest}>
          {children}
        </tbody>
      ),
      tr: ({ node, children, ...rest }) => (
        <tr className="border-b border-white/5 last:border-0" {...rest}>
          {children}
        </tr>
      ),
      th: ({ node, children, ...rest }) => (
        <th className="px-3 py-2 text-left align-top font-semibold text-white/90" {...rest}>
          {children}
        </th>
      ),
      td: ({ node, children, ...rest }) => (
        <td className="px-3 py-2 align-top text-white/70" {...rest}>
          {children}
        </td>
      ),
      del: ({ node, children, ...rest }) => (
        <del className="text-white/50 line-through" {...rest}>
          {children}
        </del>
      ),
      a: ({ node, href, children, ...rest }) => {
        if (href && isImageUrl(href)) {
          const normalized = normalizeImageUrl(href) || href;
          return (
            <button
              type="button"
              onClick={() => setLightboxSrc(normalized)}
              className="block w-full cursor-pointer border-none bg-transparent p-0 text-left transition-opacity hover:opacity-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={normalized}
                alt="Image"
                className="my-2 max-h-64 rounded-lg border border-white/10"
              />
            </button>
          );
        }
        return (
          <a
            href={href}
            className="text-[var(--sb-accent)] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            {...rest}
          >
            {children}
          </a>
        );
      },
      img: ({ node, src, alt: imgAlt, ...rest }) => {
        // Markdown-sourced content is always a string src; the wider
        // `string | Blob` in ComponentProps<'img'> is for React 19's own
        // native <img>, not anything this parser ever produces.
        if (!src || typeof src !== "string") return null;
        const normalized = normalizeImageUrl(src) || src;
        return (
          <button
            type="button"
            onClick={() => setLightboxSrc(normalized)}
            className="block w-full cursor-pointer border-none bg-transparent p-0 text-left transition-opacity hover:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={normalized}
              alt={imgAlt || "Image"}
              className="my-2 max-h-64 rounded-lg border border-white/10"
              {...rest}
            />
          </button>
        );
      },
    }),
    [isImageUrl, normalizeImageUrl],
  );

  if (!content || content.trim() === "") {
    return null;
  }

  return (
    <div className={cn(VARIANT_CLASSES[variant], className)}>
      <style>{`
        .math-display { margin: 0.5rem 0; overflow-x: auto; padding: 0.5rem 0; }
        .katex { font-size: 1em; color: #ffffff; }
        .katex-display { display: block; margin: 0.5rem 0; }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex, [rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
      <ImageLightbox
        src={lightboxSrc}
        alt="Expanded image"
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
});

MathMarkdown.displayName = "MathMarkdown";
