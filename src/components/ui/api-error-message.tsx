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
            className="font-semibold text-[color:var(--accent-cyan)] underline underline-offset-4 transition hover:text-white"
          >
            Sign in again
          </Link>{" "}
          to continue.
        </>
      ) : null}
    </span>
  );
}
