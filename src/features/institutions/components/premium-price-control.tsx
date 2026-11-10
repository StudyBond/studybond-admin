"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  adminInstitutionsApi,
  type AdminInstitutionPremium,
} from "@/lib/api/admin-institutions";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * What premium costs on this exam, and how long it lasts.
 *
 * Premium is sold per exam. A board with no price of its own uses the
 * server default. A new price only reaches checkouts opened after it is
 * saved: a checkout already open keeps the price the student was shown.
 */

type Props = {
  institutionId: number;
  premium: AdminInstitutionPremium | null;
  canEdit: boolean;
  disabledReason?: string;
  stepUpToken: string | null;
  onSaved: () => void | Promise<void>;
};

const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`;
const months = (value: number) => `${value} month${value === 1 ? "" : "s"}`;

function toText(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

export function PremiumPriceControl({
  institutionId,
  premium,
  canEdit,
  disabledReason,
  stepUpToken,
  onSaved,
}: Props) {
  const savedPrice = toText(premium?.premiumPriceNaira);
  const savedMonths = toText(premium?.premiumDurationMonths);
  const [price, setPrice] = useState(savedPrice);
  const [length, setLength] = useState(savedMonths);

  const mutation = useMutation({
    mutationFn: (payload: { premiumPriceNaira: number | null; premiumDurationMonths: number | null }) =>
      adminInstitutionsApi.update(institutionId, payload, { stepUpToken }),
    onSuccess: async (result) => {
      toast.success(result.message ?? "Saved.");
      result.warnings?.forEach((warning) => toast.warning(warning));
      await onSaved();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    },
  });

  if (!premium) {
    return null;
  }

  const priceNumber = price.trim() === "" ? null : Number(price);
  const monthsNumber = length.trim() === "" ? null : Number(length);
  const priceError =
    priceNumber !== null && (!Number.isInteger(priceNumber) || priceNumber < 100 || priceNumber > 1_000_000)
      ? "A whole number of naira, from ₦100 to ₦1,000,000."
      : undefined;
  const monthsError =
    monthsNumber !== null && (!Number.isInteger(monthsNumber) || monthsNumber < 1 || monthsNumber > 24)
      ? "From 1 to 24 months."
      : undefined;

  const hasChanged = price.trim() !== savedPrice || length.trim() !== savedMonths;
  const nextPrice = priceNumber ?? premium.defaultPriceNaira;
  const nextMonths = monthsNumber ?? premium.defaultDurationMonths;
  const isOwnPrice = premium.premiumPriceNaira !== null || premium.premiumDurationMonths !== null;

  return (
    <section className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
            Premium price
          </h2>
          <p className="mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
            Students on this exam pay {naira(premium.priceNaira)} for {months(premium.durationMonths)}.
          </p>
        </div>
        <Badge tone={isOwnPrice ? "success" : "neutral"}>
          {isOwnPrice ? "Own price" : "Default price"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field
          label="Price in naira"
          hint={`Blank = default, ${naira(premium.defaultPriceNaira)}`}
          inputMode="numeric"
          value={price}
          placeholder={String(premium.defaultPriceNaira)}
          disabled={!canEdit || mutation.isPending}
          error={priceError}
          onChange={(event) => setPrice(event.target.value.replace(/[^0-9]/g, ""))}
        />
        <Field
          label="Plan length in months"
          hint={`Blank = default, ${months(premium.defaultDurationMonths)}`}
          inputMode="numeric"
          value={length}
          placeholder={String(premium.defaultDurationMonths)}
          disabled={!canEdit || mutation.isPending}
          error={monthsError}
          onChange={(event) => setLength(event.target.value.replace(/[^0-9]/g, ""))}
        />
      </div>

      {hasChanged && !priceError && !monthsError ? (
        <p className="mt-3 flex items-start gap-2 text-[length:var(--sb-text-base)] text-[var(--sb-text)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-warning)]" />
          <span>
            After you save, new checkouts on this exam cost {naira(nextPrice)} for {months(nextMonths)}.
            Anyone already on the payment page keeps the price they were shown.
          </span>
        </p>
      ) : null}

      {!canEdit && disabledReason ? (
        <p className="mt-3 text-[length:var(--sb-text-base)] text-[var(--sb-text-tertiary)]">
          {disabledReason}
        </p>
      ) : null}

      {canEdit ? (
        <div className="mt-4 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!hasChanged || Boolean(priceError || monthsError) || mutation.isPending}
            onClick={() =>
              mutation.mutate({ premiumPriceNaira: priceNumber, premiumDurationMonths: monthsNumber })
            }
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
          {hasChanged ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() => {
                setPrice(savedPrice);
                setLength(savedMonths);
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
