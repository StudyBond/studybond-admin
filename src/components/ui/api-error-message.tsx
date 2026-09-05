import Link from "next/link";
import {
  getErrorLeadMessage,
  getErrorMessage,
  shouldShowSignInLink,
} from "@/lib/api/errors";

type ApiErrorMessageProps = {
  error: unknown;
  fallback?: string;
};

export function ApiErrorMessage({
  error,
  fallback = "Something went wrong.",
}: ApiErrorMessageProps) {
  const showSignInLink = shouldShowSignInLink(error);
  const message = showSignInLink
    ? getErrorLeadMessage(error, fallback)
    : getErrorMessage(error, fallback);

  return (
    <span>
      {message}
      {showSignInLink ? (
        <>
          {" "}
          <Link
            href="/login"
            className="font-medium text-[var(--sb-accent-text)] underline underline-offset-4 transition-colors duration-[var(--sb-duration-fast)] hover:text-[var(--sb-text)]"
          >
            Sign in again
          </Link>{" "}
          to continue.
        </>
      ) : null}
    </span>
  );
}
