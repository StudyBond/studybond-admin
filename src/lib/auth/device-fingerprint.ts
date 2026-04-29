const INSTALLATION_KEY = "studybond_admin_installation_id";

function getOrCreateInstallationId() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const existing = window.localStorage.getItem(INSTALLATION_KEY);
  if (existing) {
    return existing;
  }

  const nextValue =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `sb-admin-${Date.now()}`;

  window.localStorage.setItem(INSTALLATION_KEY, nextValue);
  return nextValue;
}

export function buildBrowserDeviceFingerprint() {
  if (typeof window === "undefined") {
    return {};
  }

  const installationId = getOrCreateInstallationId();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    deviceId: installationId,
    deviceName: `Admin Workspace - ${navigator.platform || "Browser"}`,
    device: {
      installationId,
      deviceId: installationId,
      deviceName: `Admin Workspace - ${navigator.platform || "Browser"}`,
      platform: navigator.platform || undefined,
      browserName: "browser",
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio || undefined,
    },
  };
}
