import { apiClient } from "@/lib/api/client";

/* Board extras for the new student Home (backend src/modules/dashboard):
   the next exam date and the WhatsApp links. Any admin can set them.
   Written by hand: the generated contract hasn't been resynced. */

export type AdminExamDate = {
  id: number;
  code: string;
  name: string;
  examYear: number | null;
  /** YYYY-MM-DD */
  examStartsOn: string | null;
  examEndsOn: string | null;
  examDateNote: string | null;
};

export type AdminExamDateInput = Omit<AdminExamDate, "id" | "code" | "name">;

export type AdminCommunityLinks = {
  id: number;
  code: string;
  name: string;
  whatsappChannelUrl: string | null;
  whatsappGroupUrl: string | null;
};

export type AdminCommunityLinksInput = Pick<AdminCommunityLinks, "whatsappChannelUrl" | "whatsappGroupUrl">;

async function unwrap<T>(promise: Promise<{ data: T }>): Promise<T> {
  const response = await promise;
  return response.data;
}

export const adminBoardExtrasApi = {
  getExamDate(institutionId: number) {
    return unwrap(apiClient<{ data: AdminExamDate }>(`/api/admin/institutions/${institutionId}/exam-date`));
  },
  setExamDate(institutionId: number, payload: AdminExamDateInput) {
    return unwrap(
      apiClient<{ data: AdminExamDate }>(`/api/admin/institutions/${institutionId}/exam-date`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    );
  },
  getCommunityLinks(institutionId: number) {
    return unwrap(apiClient<{ data: AdminCommunityLinks }>(`/api/admin/institutions/${institutionId}/community-links`));
  },
  setCommunityLinks(institutionId: number, payload: AdminCommunityLinksInput) {
    return unwrap(
      apiClient<{ data: AdminCommunityLinks }>(`/api/admin/institutions/${institutionId}/community-links`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    );
  },
};
