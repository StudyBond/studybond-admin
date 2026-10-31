import { describe, expect, it } from "vitest";
import type { OpenPicture, PictureTask } from "@/lib/api/types";
import {
  blockingPicture,
  reviewHref,
  reviewTargetOf,
} from "@/features/pictures/lib/picture-rules";

function picture(overrides: Partial<OpenPicture> = {}): OpenPicture {
  return {
    id: 1,
    kind: "QUESTION",
    maker: "CLAUDE",
    status: "READY_TO_CHECK",
    label: "Q5",
    title: "v-t graph",
    onSharedRow: false,
    ...overrides,
  };
}

const empty = { imageUrl: "", sharedImageUrl: null };

describe("blockingPicture (the same rule the server applies to Publish)", () => {
  it("blocks while the question's own picture is still to come", () => {
    expect(blockingPicture([picture()], empty)?.id).toBe(1);
  });

  it("lets it through once the slot holds a picture, even one added by hand", () => {
    expect(blockingPicture([picture()], { imageUrl: "https://x/v.png", sharedImageUrl: null })).toBeNull();
  });

  it("checks the shared row's slot for a shared picture", () => {
    const shared = picture({ onSharedRow: true });
    expect(blockingPicture([shared], { imageUrl: "https://x/own.png", sharedImageUrl: null })?.id).toBe(1);
    expect(blockingPicture([shared], { imageUrl: "", sharedImageUrl: "https://x/shared.png" })).toBeNull();
  });

  it("never blocks for an explanation sketch", () => {
    expect(blockingPicture([picture({ kind: "EXPLANATION" })], empty)).toBeNull();
    expect(blockingPicture(undefined, empty)).toBeNull();
  });
});

describe("links into content review", () => {
  const task = (sharedWith: Array<{ id: number }>) =>
    ({ question: { id: 40, sharedWith } }) as unknown as PictureTask;

  it("opens the question itself", () => {
    expect(reviewHref(reviewTargetOf(task([])))).toBe("/questions/review?question=40");
  });

  it("opens the first question that uses a shared picture", () => {
    expect(reviewTargetOf(task([{ id: 41 }, { id: 42 }]))).toBe(41);
  });
});
