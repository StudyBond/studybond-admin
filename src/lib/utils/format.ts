const dateTimeFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat("en-NG");

const compactNumberFormatter = new Intl.NumberFormat("en-NG", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return "Unavailable";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return dateTimeFormatter.format(date);
}

export function formatInteger(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }

  return numberFormatter.format(value);
}

export function formatCompactNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }

  return compactNumberFormatter.format(value);
}

export function formatCurrencyNaira(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return currencyFormatter.format(0);
  }

  return currencyFormatter.format(value);
}

export function formatDurationSeconds(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "0s";
  }

  const totalSeconds = Math.floor(value);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${totalSeconds}s`;
}

export function formatRelativeWindow(expiresAt: string | null | undefined) {
  if (!expiresAt) {
    return "No active token";
  }

  const diffMs = Date.parse(expiresAt) - Date.now();
  if (Number.isNaN(diffMs) || diffMs <= 0) {
    return "Expired";
  }

  const totalMinutes = Math.ceil(diffMs / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes} min remaining`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h remaining` : `${hours}h ${minutes}m remaining`;
}
