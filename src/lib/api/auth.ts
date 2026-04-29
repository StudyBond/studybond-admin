import { apiClient } from "@/lib/api/client";
import type {
  AuthLoginInput,
  AuthLoginResponse,
  AuthMeResponse,
  AuthVerifyOtpInput,
  AuthVerifyOtpResponse,
} from "@/lib/api/types";

export type LoginInput = AuthLoginInput;

export type VerifyOtpInput = AuthVerifyOtpInput;

export const authApi = {
  login(payload: LoginInput) {
    return apiClient<AuthLoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  verifyOtp(payload: VerifyOtpInput) {
    return apiClient<AuthVerifyOtpResponse>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  me() {
    return apiClient<AuthMeResponse>("/api/auth/me");
  },
  logout() {
    return apiClient<{ message: string }>("/api/auth/logout", {
      method: "POST",
    });
  },
};
