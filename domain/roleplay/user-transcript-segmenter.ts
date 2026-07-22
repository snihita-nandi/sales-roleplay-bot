import type { TranscriptEntry } from "@/domain/roleplay/types";

interface UserTranscriptSegmenterDependencies {
  createId(): string;
  now(): number;
}

export class UserTranscriptSegmenter {
  private draft: { id: string; text: string } | null = null;

  constructor(private readonly dependencies: UserTranscriptSegmenterDependencies) {}

  updateDraft(text: string): TranscriptEntry | null {
    const normalizedText = text.trim();
    if (!normalizedText) return null;

    this.draft ??= { id: this.dependencies.createId(), text: "" };
    this.draft.text = normalizedText;
    return this.toEntry(this.draft, false);
  }

  finalize(text?: string): TranscriptEntry | null {
    const normalizedText = text?.trim() || this.draft?.text || "";
    if (!normalizedText) {
      this.draft = null;
      return null;
    }

    const completed = this.draft ?? {
      id: this.dependencies.createId(),
      text: normalizedText,
    };
    completed.text = normalizedText;
    const entry = this.toEntry(completed, true);
    this.draft = null;
    return entry;
  }

  private toEntry(
    transcript: { id: string; text: string },
    final: boolean,
  ): TranscriptEntry {
    return {
      id: transcript.id,
      role: "representative",
      text: transcript.text,
      timestampMs: this.dependencies.now(),
      final,
    };
  }
}
