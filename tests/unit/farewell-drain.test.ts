import { describe, expect, it, vi } from "vitest";

import { FarewellDrain } from "@/infrastructure/gemini/farewell-drain";

function deferred() {
  let resolve: (() => void) | null = null;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return {
    promise,
    resolve: () => {
      if (!resolve) throw new Error("Deferred promise was not initialized.");
      resolve();
    },
  };
}

describe("customer farewell drain", () => {
  it("disconnects only after Gemini output and PCM playback are both complete", async () => {
    const drain = new FarewellDrain();
    const playback = deferred();
    const disconnect = vi.fn();

    const completion = drain
      .waitUntilSafeToDisconnect(() => playback.promise)
      .then(disconnect);

    await Promise.resolve();
    expect(disconnect).not.toHaveBeenCalled();

    drain.markOutputComplete();
    await Promise.resolve();
    expect(disconnect).not.toHaveBeenCalled();

    playback.resolve();
    await completion;
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("handles an already-empty playback queue after the final stream signal", async () => {
    const drain = new FarewellDrain();
    const waitForPlaybackIdle = vi.fn(async () => undefined);

    drain.markOutputComplete();
    await drain.waitUntilSafeToDisconnect(waitForPlaybackIdle);

    expect(waitForPlaybackIdle).toHaveBeenCalledOnce();
  });
});
