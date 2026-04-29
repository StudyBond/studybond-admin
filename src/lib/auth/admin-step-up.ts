export type StoredAdminStepUp = {
  purpose: "SUPERADMIN_SENSITIVE_ACTION";
  stepUpToken: string;
  expiresAt: string;
};

const STORAGE_KEY = "studybond_admin_step_up";
const CHANGE_EVENT = "studybond:admin-step-up-change";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isValidStepUpRecord(value: unknown): value is StoredAdminStepUp {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.purpose === "SUPERADMIN_SENSITIVE_ACTION" &&
    typeof record.stepUpToken === "string" &&
    typeof record.expiresAt === "string"
  );
}

function dispatchChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function hasExpired(expiresAt: string) {
  const expiry = Date.parse(expiresAt);
  return Number.isNaN(expiry) || expiry <= Date.now();
}

export function readAdminStepUp(): StoredAdminStepUp | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidStepUpRecord(parsed) || hasExpired(parsed.expiresAt)) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeAdminStepUp(payload: StoredAdminStepUp) {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  dispatchChange();
}

export function clearAdminStepUp() {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
  dispatchChange();
}

export function getAdminStepUpToken() {
  return readAdminStepUp()?.stepUpToken ?? null;
}

export function getAdminStepUpExpiryMs() {
  const record = readAdminStepUp();
  return record ? Date.parse(record.expiresAt) : null;
}

export function subscribeToAdminStepUp(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = () => callback();
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
