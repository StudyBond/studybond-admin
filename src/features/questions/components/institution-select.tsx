"use client";

import { CustomSelect } from "@/components/ui/custom-select";
import { FieldShell } from "@/components/ui/field";
import type { AdminInstitutionListItem } from "@/lib/api/types";

/**
 * The Institution filter on the question bank and the review queue. Pair it
 * with `useQuestionInstitution`, which supplies all three props.
 *
 * Code first in each label, so the part that matters survives when a narrow
 * filter cell truncates the name.
 */
export function InstitutionSelect({
  value,
  onValueChange,
  institutions,
}: {
  value: string;
  onValueChange: (code: string) => void;
  /** Undefined while the list is loading or if it failed. */
  institutions: AdminInstitutionListItem[] | undefined;
}) {
  // Until the list arrives, offer only the current choice, so the control
  // shows what the page is scoped to instead of a blank placeholder.
  const options = institutions
    ? institutions.map((institution) => ({
        label: `${institution.code} · ${institution.name}`,
        value: institution.code,
      }))
    : [{ label: value, value }];

  return (
    <FieldShell label="Institution">
      <CustomSelect
        aria-label="Which institution's questions to show"
        value={value}
        onValueChange={onValueChange}
        options={options}
      />
    </FieldShell>
  );
}
