export class FarewellDrain {
  private outputComplete = false;
  private outputCompleteResolver: (() => void) | null = null;
  private readonly outputCompletePromise = new Promise<void>((resolve) => {
    this.outputCompleteResolver = resolve;
  });

  markOutputComplete(): void {
    if (this.outputComplete) return;
    this.outputComplete = true;
    this.outputCompleteResolver?.();
    this.outputCompleteResolver = null;
  }

  async waitUntilSafeToDisconnect(waitForPlaybackIdle: () => Promise<void>): Promise<void> {
    await this.outputCompletePromise;
    await waitForPlaybackIdle();
  }
}
