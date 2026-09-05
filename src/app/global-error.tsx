"use client";

import { getErrorMeta } from "@/lib/api/errors";
import { useEffect } from "react";

/**
 * Root error boundary. This replaces the root layout entirely, so the app's
 * stylesheet is not guaranteed to be present — which is the whole point of
 * this file existing. Everything here is therefore inline, with the palette
 * values copied from globals.css rather than referenced through it, so the
 * screen still renders when CSS is exactly what failed.
 *
 * The previous version used Tailwind classes for the same job, which would
 * have left an unstyled white page in that case.
 */

const COLORS = {
  bg: "#09090b",
  surface: "#0f0f12",
  inset: "#0e0e11",
  border: "rgba(255,255,255,0.06)",
  text: "#fafafa",
  textSecondary: "#a1a1aa",
  textTertiary: "#8b8b96",
  danger: "#f87171",
  dangerSoft: "rgba(248,113,113,0.10)",
  dangerRing: "rgba(248,113,113,0.22)",
  accent: "#c17a28",
};

const FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const meta = getErrorMeta(error);

  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: COLORS.bg,
          color: COLORS.text,
          font: `15px/1.5 ${FONT}`,
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: "32rem",
            border: `1px solid ${COLORS.dangerRing}`,
            borderRadius: "14px",
            background: COLORS.surface,
            padding: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: COLORS.dangerSoft,
              color: COLORS.danger,
              fontSize: "18px",
            }}
            aria-hidden="true"
          >
            !
          </div>

          <h1
            style={{
              margin: "16px 0 0",
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            The admin app could not start
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "15px",
              color: COLORS.textSecondary,
            }}
          >
            Something failed before the page could load. Reloading usually
            fixes it. If it keeps happening, send the reference below to
            whoever maintains this.
          </p>

          <p
            style={{
              margin: "16px 0 0",
              padding: "12px",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "10px",
              background: COLORS.inset,
              fontSize: "13px",
              color: COLORS.textSecondary,
            }}
          >
            {error.message || "No further detail is available."}
          </p>

          {meta ? (
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "12px",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                color: COLORS.textTertiary,
              }}
            >
              {meta}
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "20px",
              padding: "9px 16px",
              border: "none",
              borderRadius: "10px",
              background: COLORS.accent,
              color: COLORS.bg,
              font: `500 14px ${FONT}`,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
