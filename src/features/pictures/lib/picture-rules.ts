import type { OpenPicture, PictureTask } from "@/lib/api/types";

/**
 * The publishing rule from the backend (picture-guard.ts), worked out here so
 * content review can say so before anyone presses Publish. The server checks
 * again on every publish.
 *
 * A question picture still to come, in a slot that is still empty, stops
 * publishing. The slot is the question's own picture, or the shared row's
 * for a picture that belongs there. A sketch still to come in the
 * explanation does not: its description stands in until it is added.
 */
export function blockingPicture(
  pictures: OpenPicture[] | undefined,
  slots: { imageUrl: string | null | undefined; sharedImageUrl: string | null | undefined },
): OpenPicture | null {
  return (
    (pictures ?? []).find(
      (picture) =>
        picture.kind === "QUESTION" &&
        !(picture.onSharedRow ? slots.sharedImageUrl : slots.imageUrl)?.trim(),
    ) ?? null
  );
}

/** Where a picture opens on the Pictures page. */
export function picturePageHref(taskId: number) {
  return `/pictures?task=${taskId}`;
}

/** Where a question opens in content review. */
export function reviewHref(questionId: number) {
  return `/questions/review?question=${questionId}`;
}

/**
 * The question a picture belongs to, for content review. A shared picture
 * sits on a row with no answer of its own, so its first question is opened
 * instead; the others follow it in the queue.
 */
export function reviewTargetOf(task: PictureTask) {
  return task.question.sharedWith[0]?.id ?? task.question.id;
}
