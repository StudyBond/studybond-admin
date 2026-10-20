"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminInstitutions } from "@/features/institutions/hooks/use-admin-institutions";
import { Building2, TriangleAlert } from "lucide-react";
import { useState } from "react";

/**
 * Asked only when a file does not say which board it is for: no
 * institutionCode column, or every cell in it empty. Nothing was saved yet.
 *
 * Nothing is chosen for the admin. A board filled in ahead of time, by the
 * page or by the browser's autofill, is how a JAMB file once went to UI. A
 * file name that starts with a board, like JAMB_Biology_1988.xlsx, is shown
 * as a hint, and picking a different board says so. The button names the
 * board, so the last click reads as what it does.
 */
export function ChooseBoardPanel({
  fileName,
  isImporting,
  onImport,
  onCancel,
}: {
  fileName: string;
  isImporting: boolean;
  onImport: (institutionCode: string) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const institutionsQuery = useAdminInstitutions();

  const boards = (institutionsQuery.data?.institutions ?? []).filter((board) => board.isActive);
  const options = boards.map((board) => ({ value: board.code, label: `${board.code} · ${board.name}` }));

  const prefix = fileName.match(/^([A-Za-z]{2,32})_/)?.[1]?.toUpperCase();
  const nameBoard = boards.some((board) => board.code === prefix) ? prefix : undefined;

  return (
    <div
      role="group"
      aria-labelledby="choose-board-title"
      className="sb-fade space-y-3 rounded-[var(--sb-radius)] border border-[var(--sb-warning-ring)] bg-[var(--sb-warning-soft)] p-4"
    >
      <div className="flex items-start gap-3">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-warning)]" />
        <div className="min-w-0 space-y-1">
          <h3
            id="choose-board-title"
            className="text-[length:var(--sb-text-md)] font-semibold text-[var(--sb-text)]"
          >
            Which board are these questions for?
          </h3>
          <p className="break-words text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
            <span className="text-[var(--sb-text)]">{fileName}</span> does not
            say. Nothing has been imported yet. Your choice is for this file
            only.
          </p>
        </div>
      </div>

      {institutionsQuery.isLoading ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <CustomSelect
          aria-label="Board for this file"
          value={code}
          onValueChange={setCode}
          options={options}
          placeholder="Choose a board"
          disabled={isImporting}
        />
      )}
      {institutionsQuery.isError ? (
        <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-danger)]">
          <ApiErrorMessage error={institutionsQuery.error} fallback="Could not load the boards." />
        </p>
      ) : null}

      {nameBoard && code && code !== nameBoard ? (
        <p className="flex gap-2 text-[length:var(--sb-text-xs)] text-[var(--sb-warning)]">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          The file name starts with {nameBoard}, not {code}. Check this is right.
        </p>
      ) : nameBoard && !code ? (
        <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
          The file name starts with {nameBoard}.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          type="button"
          className="sm:flex-1"
          disabled={!code || isImporting}
          isLoading={isImporting}
          onClick={() => onImport(code)}
        >
          {code ? `Import to ${code}` : "Import"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="sm:flex-1"
          disabled={isImporting}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
