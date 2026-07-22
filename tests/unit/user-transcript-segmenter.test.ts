import { describe, expect, it } from "vitest";

import { UserTranscriptSegmenter } from "@/domain/roleplay/user-transcript-segmenter";

function createSegmenter() {
  let id = 0;
  let timestamp = 0;
  return new UserTranscriptSegmenter({
    createId: () => `user-${++id}`,
    now: () => ++timestamp,
  });
}

describe("user transcript segmentation", () => {
  it("updates one temporary draft while the user is speaking", () => {
    const segmenter = createSegmenter();
    const firstDraft = segmenter.updateDraft("Are you");
    const updatedDraft = segmenter.updateDraft("Are you speaking from XYZ company?");

    expect(firstDraft).toMatchObject({ id: "user-1", text: "Are you", final: false });
    expect(updatedDraft).toMatchObject({
      id: "user-1",
      text: "Are you speaking from XYZ company?",
      final: false,
    });
  });

  it("finalizes a draft once and starts the next utterance with a new id", () => {
    const segmenter = createSegmenter();
    segmenter.updateDraft("Hello");
    const greeting = segmenter.finalize("Hello");
    segmenter.updateDraft("Are you speaking from XYZ");
    const question = segmenter.finalize("Are you speaking from XYZ company?");

    expect(greeting).toMatchObject({ id: "user-1", text: "Hello", final: true });
    expect(question).toMatchObject({
      id: "user-2",
      text: "Are you speaking from XYZ company?",
      final: true,
    });
  });

  it("creates distinct entries for consecutive and rapid finalized utterances", () => {
    const segmenter = createSegmenter();
    const entries = [
      segmenter.finalize("First question."),
      segmenter.finalize("Second question."),
      segmenter.finalize("Actually, one more."),
    ];

    expect(entries.map((entry) => entry?.id)).toEqual(["user-1", "user-2", "user-3"]);
    expect(entries.every((entry) => entry?.final)).toBe(true);
  });

  it("does not create a new segment merely because a draft is updated after a pause", () => {
    const segmenter = createSegmenter();
    const beforePause = segmenter.updateDraft("Let me think");
    const afterPause = segmenter.updateDraft("Let me think about that");
    const completed = segmenter.finalize();

    expect(beforePause?.id).toBe("user-1");
    expect(afterPause?.id).toBe("user-1");
    expect(completed).toMatchObject({
      id: "user-1",
      text: "Let me think about that",
      final: true,
    });
  });
});
