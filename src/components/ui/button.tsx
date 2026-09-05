import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type ButtonBaseProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm";
  isLoading?: boolean;
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonBaseProps & { asChild?: false };

type ButtonLinkProps = React.ComponentProps<typeof Link> &
  ButtonBaseProps & { asChild: true };

/**
 * Heights come from a scale so buttons and inputs always line up:
 * sm = 32px, md = 36px, lg = 44px. Field/Select use the same numbers.
 */
const sizeStyles = {
  sm: "h-8 gap-1.5 rounded-[var(--sb-radius-sm)] px-3 text-[length:var(--sb-text-xs)]",
  md: "h-9 gap-2 rounded-[var(--sb-radius)] px-4 text-[length:var(--sb-text-base)]",
  lg: "h-11 gap-2 rounded-[var(--sb-radius)] px-6 text-[length:var(--sb-text-md)]",
  icon: "h-9 w-9 rounded-[var(--sb-radius)]",
  "icon-sm": "h-8 w-8 rounded-[var(--sb-radius-sm)]",
};

const variantStyles = {
  primary:
    "bg-[var(--sb-accent)] font-semibold text-[#0a0a0a] hover:bg-[var(--sb-accent-hover)]",
  secondary:
    "border border-[var(--sb-border)] bg-[var(--sb-surface-2)] text-[var(--sb-text)] hover:border-[var(--sb-border-hover)] hover:bg-[var(--sb-surface-3)]",
  ghost:
    "bg-transparent text-[var(--sb-text-secondary)] hover:bg-[var(--sb-surface-2)] hover:text-[var(--sb-text)]",
  danger:
    "border border-[var(--sb-danger-ring)] bg-[var(--sb-danger-soft)] text-[var(--sb-danger)] hover:bg-[rgba(248,113,113,0.16)]",
};

const baseStyles =
  "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-[var(--sb-duration-fast)] disabled:pointer-events-none disabled:opacity-40";

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-[sb-spin_0.7s_linear_infinite]"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function Button(props: ButtonProps | ButtonLinkProps) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "md";
  const isLoading = props.isLoading ?? false;
  const className = cn(
    baseStyles,
    sizeStyles[size],
    variantStyles[variant],
    props.className,
  );

  if (props.asChild) {
    const {
      asChild: _asChild,
      variant: _variant,
      size: _size,
      isLoading: _isLoading,
      className: _className,
      ...linkProps
    } = props;
    return <Link className={className} {...linkProps} />;
  }

  const {
    variant: _variant,
    asChild: _asChild,
    size: _size,
    isLoading: _isLoading,
    className: _className,
    children,
    disabled,
    ...buttonProps
  } = props;

  return (
    <button
      className={className}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...buttonProps}
    >
      {isLoading ? <Spinner /> : null}
      {children}
    </button>
  );
}
