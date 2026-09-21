import { apiClient } from "@/lib/api/client";
import type {
  AdminCourseMutationResponse,
  AdminCourseUpdateResponse,
  AdminCoursesListResponse,
  AdminCreateCourseInput,
  AdminPromoteCourseSuggestionInput,
  AdminPromoteCourseSuggestionResponse,
  AdminUnmatchedCoursesResponse,
  AdminUpdateCourseInput,
} from "@/lib/api/types";

function unwrapEnvelope<T>(promise: Promise<{ data: T }>) {
  return promise.then((payload) => payload.data);
}

export const adminCoursesApi = {
  list(): Promise<AdminCoursesListResponse> {
    return unwrapEnvelope(
      apiClient<{ data: AdminCoursesListResponse }>("/api/admin/courses"),
    );
  },
  create(payload: AdminCreateCourseInput): Promise<AdminCourseMutationResponse> {
    return unwrapEnvelope(
      apiClient<{ data: AdminCourseMutationResponse }>("/api/admin/courses", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  },
  update(
    courseId: number,
    payload: AdminUpdateCourseInput,
  ): Promise<AdminCourseUpdateResponse> {
    return unwrapEnvelope(
      apiClient<{ data: AdminCourseUpdateResponse }>(
        `/api/admin/courses/${courseId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      ),
    );
  },
  listUnmatched(): Promise<AdminUnmatchedCoursesResponse> {
    return unwrapEnvelope(
      apiClient<{ data: AdminUnmatchedCoursesResponse }>(
        "/api/admin/courses/unmatched",
      ),
    );
  },
  promote(
    payload: AdminPromoteCourseSuggestionInput,
  ): Promise<AdminPromoteCourseSuggestionResponse> {
    return unwrapEnvelope(
      apiClient<{ data: AdminPromoteCourseSuggestionResponse }>(
        "/api/admin/courses/promote",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),
    );
  },
};
