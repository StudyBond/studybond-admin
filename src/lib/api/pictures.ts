import { apiClient } from "@/lib/api/client";
import type {
  HandwritingSheet,
  PictureList,
  PictureMaker,
  PictureStrength,
  PictureSummary,
  PictureTask,
} from "@/lib/api/types";

function imageForm(file: File, strength?: PictureStrength) {
  const formData = new FormData();
  // The backend reads fields that come before the file, so strength goes first.
  if (strength) formData.set("strength", strength);
  formData.set("file", file);
  return formData;
}

export const picturesApi = {
  summary() {
    return apiClient<PictureSummary>("/api/pictures/summary");
  },
  get(id: number) {
    return apiClient<PictureTask>(`/api/pictures/${id}`);
  },
  list(subject: string, year: number) {
    const search = new URLSearchParams({ subject, year: String(year) });
    return apiClient<PictureList>(`/api/pictures?${search.toString()}`);
  },
  saveImage(id: number, file: File, strength: PictureStrength) {
    return apiClient<PictureTask>(`/api/pictures/${id}/image`, {
      method: "POST",
      body: imageForm(file, strength),
    });
  },
  approve(id: number, strength: PictureStrength) {
    return apiClient<PictureTask>(`/api/pictures/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ strength }),
    });
  },
  sendBack(id: number, note: string) {
    return apiClient<PictureTask>(`/api/pictures/${id}/send-back`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },
  reopen(id: number) {
    return apiClient<PictureTask>(`/api/pictures/${id}/reopen`, {
      method: "POST",
    });
  },
  setMaker(id: number, maker: PictureMaker) {
    return apiClient<PictureTask>(`/api/pictures/${id}/maker`, {
      method: "POST",
      body: JSON.stringify({ maker }),
    });
  },
  handwritingSheet() {
    return apiClient<HandwritingSheet>("/api/pictures/handwriting-sheet");
  },
  setHandwritingSheet(file: File) {
    return apiClient<HandwritingSheet>("/api/pictures/handwriting-sheet", {
      method: "POST",
      body: imageForm(file),
    });
  },
};
