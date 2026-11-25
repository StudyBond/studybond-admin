"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminUserBoard } from "@/lib/api/types";
import { formatDate, formatInteger } from "@/lib/utils/format";

/**
 * The student's boards, one row each: the board they are on now, where they
 * have studied, and their premium on each one.
 *
 * Premium is sold and granted per board, so a single "Premium: Active" for
 * the whole account hid the thing support needs to know: premium WHERE.
 */

const SOURCE_LABEL: Record<string, string> = {
  SUBSCRIPTION: "paid",
  ADMIN_ENTITLEMENT: "admin grant",
};

export function boardPremiumLine(board: AdminUserBoard): string {
  if (!board.premium.isPremium) return "Free";
  const sources = board.premium.activeSourceTypes
    .map((source) => SOURCE_LABEL[source] ?? source)
    .join(" + ");
  const until = board.premium.effectiveEndDate
    ? `until ${formatDate(board.premium.effectiveEndDate)}`
    : "no end date";
  return `Premium ${until}${sources ? ` · ${sources}` : ""}`;
}

export function UserBoardsList({
  boards,
  viewingCode,
  onView,
}: {
  boards: AdminUserBoard[];
  /** The board the rest of the page is showing. */
  viewingCode?: string;
  /** Show the rest of the page for this board. Leave out to hide the button. */
  onView?: (code: string) => void;
}) {
  if (!boards.length) {
    return (
      <p className="rounded-[var(--sb-radius)] border border-dashed border-[var(--sb-border)] px-3 py-4 text-center text-[length:var(--sb-text-sm)] text-[var(--sb-text-tertiary)]">
        No live boards.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {boards.map((board) => {
        const isViewing = board.code === viewingCode;
        return (
          <li
            key={board.id}
            className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[length:var(--sb-text-sm)] font-semibold text-[var(--sb-text)]">
                    {board.code}
                  </p>
                  {board.isCurrent ? (
                    <Badge tone="brand">On it now</Badge>
                  ) : null}
                  {board.premium.isPremium ? (
                    <Badge tone="premium">Premium</Badge>
                  ) : null}
                  {board.studentStatus !== "OPEN" ? (
                    <Badge tone="neutral">
                      {board.studentStatus === "COMING_SOON"
                        ? "Coming soon"
                        : "Hidden from students"}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                  {board.name}
                </p>
              </div>

              {onView ? (
                isViewing ? (
                  <Badge tone="neutral">Showing below</Badge>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onView(board.code)}
                  >
                    Show this board
                  </Button>
                )
              ) : null}
            </div>

            <p className="sb-nums mt-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
              {board.hasStudied
                ? `${formatInteger(board.totalSp)} SP · ${formatInteger(
                    board.realExamsCompleted,
                  )} real exams`
                : "Not used yet"}
            </p>
            <p className="mt-0.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
              {boardPremiumLine(board)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
