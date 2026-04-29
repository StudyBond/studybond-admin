import { apiClient } from "@/lib/api/client";
import type {
  AdminActivityResponse,
  AdminOverviewResponse,
  AdminPremiumInsightsResponse,
  AdminSystemHealthResponse,
} from "@/lib/api/types";

export const adminAnalyticsApi = {
  getOverview(institutionCode?: string) {
    const search = institutionCode
      ? `?institutionCode=${encodeURIComponent(institutionCode)}`
      : "";
    return apiClient<AdminOverviewResponse>(`/api/admin/analytics/overview${search}`);
  },
  getActivity(days = 7, institutionCode?: string) {
    const search = new URLSearchParams({ days: String(days) });
    if (institutionCode) {
      search.set("institutionCode", institutionCode);
    }
    return apiClient<AdminActivityResponse>(`/api/admin/analytics/activity?${search.toString()}`);
  },
  getPremium(days = 30) {
    return apiClient<AdminPremiumInsightsResponse>(`/api/admin/analytics/premium?days=${days}`);
  },
  getSystemHealth() {
    return apiClient<AdminSystemHealthResponse>(`/api/admin/analytics/system-health`);
  },
};
