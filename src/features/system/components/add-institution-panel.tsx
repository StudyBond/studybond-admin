"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { adminSystemApi } from "@/lib/api/admin-system";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Register a new institution.
 *
 * Changes:
 *
 * 1. The submit button was `bg-white text-black` — a colour that exists
 *    nowhere else in the console, on the one control that writes a new row
 *    to a global table.
 *
 * 2. Labels read "Institution Code (OAU)", "Full Name", "URL Slug" in
 *    letter-spaced uppercase. The example belongs in the placeholder, which
 *    already had it, so the label was carrying it twice.
 *
 * 3. The slug had to be typed by hand, character for character, even though
 *    it is derived from the name in every realistic case. It now fills
 *    itself from the name until someone edits it, and the two inputs
 *    silently discarded characters (`replace(/[^a-z-]/g, "")` drops spaces
 *    and digits) with nothing on screen explaining why.
 *
 * 4. `queryClient` was created and never used.
 */
export function AddInstitutionPanel() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();

  function slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  function resetForm() {
    setCode("");
    setName("");
    setSlug("");
    setIsSlugEdited(false);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!stepUp?.stepUpToken) {
        throw new Error("Step-up verification required.");
      }
      return adminSystemApi.createInstitution(
        { code, name, slug },
        { stepUpToken: stepUp.stepUpToken },
      );
    },
    onSuccess: async (payload) => {
      toast.success(`${payload.institution.code} added`);
      resetForm();
      router.refresh();
    },
    onError: (error) => {
      toast.error("Could not add this institution", {
        description: (
          <ApiErrorMessage
            error={error}
            fallback="Check that the code and slug are not already taken."
          />
        ),
      });
    },
  });

  const isComplete = Boolean(code && name && slug);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isComplete || !isStepUpActive) return;
    mutation.mutate();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5"
    >
      <h3 className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
        Add an institution
      </h3>
      <p className="mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
        Questions, exams, and leaderboards are all scoped to an institution,
        so this affects everyone who joins under it.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field
          label="Short code"
          hint="Letters only"
          id="inst-code"
          required
          disabled={!isStepUpActive || mutation.isPending}
          value={code}
          onChange={(event) =>
            setCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, ""))
          }
          placeholder="OAU"
        />

        <Field
          label="Full name"
          id="inst-name"
          required
          disabled={!isStepUpActive || mutation.isPending}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            /* Fill the slug from the name until someone takes it over. */
            if (!isSlugEdited) {
              setSlug(slugify(event.target.value));
            }
          }}
          placeholder="Obafemi Awolowo University"
        />

        {/* Field forwards className to the input, so the column span has to
            live on a wrapper or it lands on the wrong element. */}
        <div className="sm:col-span-2">
          <Field
            label="URL slug"
            hint={isSlugEdited ? "Edited by hand" : "From the name"}
            id="inst-slug"
            required
            disabled={!isStepUpActive || mutation.isPending}
            value={slug}
            onChange={(event) => {
              setIsSlugEdited(true);
              setSlug(slugify(event.target.value));
            }}
            placeholder="obafemi-awolowo-university"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={!isComplete || !isStepUpActive || mutation.isPending}
          isLoading={mutation.isPending}
        >
          <Plus className="h-4 w-4" />
          Add institution
        </Button>

        {/* Says why the button is dead, next to the dead button. */}
        {!isStepUpActive ? (
          <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            Verify with step-up first.
          </p>
        ) : null}
      </div>
    </form>
  );
}
