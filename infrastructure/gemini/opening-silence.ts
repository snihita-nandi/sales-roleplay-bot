const OPENING_WAIT_MS = 5_000;
const RESPONSE_WAIT_MS = 7_000;

type TimerHandle = ReturnType<typeof setTimeout>;

interface OpeningSilenceDependencies {
  requestCustomerOpener(): void;
  requestSilenceGoodbye(): void;
  setTimer(callback: () => void, delayMs: number): TimerHandle;
  clearTimer(timer: TimerHandle): void;
}

type OpeningSilenceState =
  | "idle"
  | "waiting-for-salesperson"
  | "opener-requested"
  | "waiting-after-opener"
  | "goodbye-requested"
  | "stopped";

const ignoredSpeechTokens = new Set([
  "ah",
  "er",
  "hmm",
  "hm",
  "mm",
  "noise",
  "silence",
  "uh",
  "um",
]);

export function isMeaningfulSalespersonSpeech(text: string): boolean {
  const withoutNoiseLabels = text.replaceAll(/\[[^\]]*\]|\([^\)]*\)/gu, " ");
  const tokens = withoutNoiseLabels.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return tokens.some((token) => !ignoredSpeechTokens.has(token));
}

export class OpeningSilenceController {
  private state: OpeningSilenceState = "idle";
  private timer: TimerHandle | null = null;

  constructor(private readonly dependencies: OpeningSilenceDependencies) {}

  callReady(): void {
    if (this.state !== "idle") return;
    this.state = "waiting-for-salesperson";
    this.replaceTimer(() => {
      if (this.state !== "waiting-for-salesperson") return;
      this.state = "opener-requested";
      this.timer = null;
      this.dependencies.requestCustomerOpener();
    }, OPENING_WAIT_MS);
  }

  meaningfulSalespersonSpeech(): void {
    if (
      this.state !== "waiting-for-salesperson" &&
      this.state !== "opener-requested" &&
      this.state !== "waiting-after-opener"
    ) {
      return;
    }
    this.clearCurrentTimer();
    this.state = "stopped";
  }

  customerOpenerPlaybackComplete(): void {
    if (this.state !== "opener-requested") return;
    this.state = "waiting-after-opener";
    this.replaceTimer(() => {
      if (this.state !== "waiting-after-opener") return;
      this.state = "goodbye-requested";
      this.timer = null;
      this.dependencies.requestSilenceGoodbye();
    }, RESPONSE_WAIT_MS);
  }

  stop(): void {
    this.clearCurrentTimer();
    this.state = "stopped";
  }

  private replaceTimer(callback: () => void, delayMs: number): void {
    this.clearCurrentTimer();
    this.timer = this.dependencies.setTimer(callback, delayMs);
  }

  private clearCurrentTimer(): void {
    if (this.timer === null) return;
    this.dependencies.clearTimer(this.timer);
    this.timer = null;
  }
}
