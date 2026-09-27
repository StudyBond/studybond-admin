"use client";

import { useAdminInstitutions } from "@/features/institutions/hooks/use-admin-institutions";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "studybond-admin:question-institution";

/** The backend's launch institution — what it falls back to when no code is sent. */
export const DEFAULT_QUESTION_INSTITUTION = "UI";

/**
 * Which institution's questions the bank and the review queue show.
 *
 * Every question list request is scoped to one institution, and a request
 * without a code silently gets UI. That is why a JAMB upload never appeared
 * in review: nothing on either page could ask for JAMB.
 *
 * One choice shared by both pages and kept in the browser, so picking JAMB
 * on the bank still holds in the review queue, and after opening a question
 * and coming back. Pages should wait for `isReady` before fetching, or the
 * first request goes out for UI and is thrown away.
 */
export function useQuestionInstitution() {
  const [storedCode, setStoredCode] = useState(DEFAULT_QUESTION_INSTITUTION);
  const [isReady, setIsReady] = useState(false);
  const institutionsQuery = useAdminInstitutions();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setStoredCode(stored);
    } catch {
      // Storage can throw in private mode. The default is fine.
    } finally {
      setIsReady(true);
    }
  }, []);

  // Inactive institutions are left out: the list endpoint refuses them, so
  // picking one would only produce an error.
  const institutions = institutionsQuery.data?.institutions.filter(
    (institution) => institution.isActive,
  );

  // A remembered institution that has since been switched off would make
  // every list request fail, so fall back rather than strand the page.
  const institutionCode =
    institutions && !institutions.some((item) => item.code === storedCode)
      ? DEFAULT_QUESTION_INSTITUTION
      : storedCode;

  const setInstitutionCode = useCallback((code: string) => {
    setStoredCode(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Persistence is a convenience, not a requirement.
    }
  }, []);

  return { institutionCode, setInstitutionCode, institutions, isReady };
}
