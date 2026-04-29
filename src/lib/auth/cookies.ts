export const ADMIN_ACCESS_COOKIE = "studybond_admin_access_token";
export const ADMIN_REFRESH_COOKIE = "studybond_admin_refresh_token";

const isProduction = process.env.NODE_ENV === "production";

export const accessCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 15,
};

export const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
