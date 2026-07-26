import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scenarioRegistry } from "@/config/scenarios";
import { createCustomerOpenerInstruction } from "@/infrastructure/gemini/browser-live-transport";
import {
  isMeaningfulSalespersonSpeech,
  OpeningSilenceController,
} from "@/infrastructure/gemini/opening-silence";

describe("opening silence lifecycle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function createController() {
    const requestCustomerOpener = vi.fn();
    const requestSilenceGoodbye = vi.fn();
    const controller = new OpeningSilenceController({
      requestCustomerOpener,
      requestSilenceGoodbye,
      setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
      clearTimer: (timer) => clearTimeout(timer),
    });
    return { controller, requestCustomerOpener, requestSilenceGoodbye };
  }

  it("starts only when the call is fully ready and requests one opener", () => {
    const { controller, requestCustomerOpener } = createController();

    vi.advanceTimersByTime(10_000);
    expect(requestCustomerOpener).not.toHaveBeenCalled();

    controller.callReady();
    vi.advanceTimersByTime(4_999);
    expect(requestCustomerOpener).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(requestCustomerOpener).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(10_000);
    expect(requestCustomerOpener).toHaveBeenCalledOnce();
  });

  it("cancels the opener only for meaningful transcript speech", () => {
    const { controller, requestCustomerOpener } = createController();
    controller.callReady();

    expect(isMeaningfulSalespersonSpeech("[background noise]")).toBe(false);
    expect(isMeaningfulSalespersonSpeech("(fan noise) um...")).toBe(false);
    expect(isMeaningfulSalespersonSpeech("Hello, can you hear me?")).toBe(true);

    controller.meaningfulSalespersonSpeech();
    vi.advanceTimersByTime(5_000);
    expect(requestCustomerOpener).not.toHaveBeenCalled();
  });

  it("starts the seven-second window only after opener playback completes", () => {
    const { controller, requestCustomerOpener, requestSilenceGoodbye } =
      createController();
    controller.callReady();
    vi.advanceTimersByTime(5_000);
    expect(requestCustomerOpener).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(20_000);
    expect(requestSilenceGoodbye).not.toHaveBeenCalled();

    controller.customerOpenerPlaybackComplete();
    vi.advanceTimersByTime(6_999);
    expect(requestSilenceGoodbye).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(requestSilenceGoodbye).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(10_000);
    expect(requestSilenceGoodbye).toHaveBeenCalledOnce();
  });

  it("continues normally when meaningful speech follows the opener", () => {
    const { controller, requestSilenceGoodbye } = createController();
    controller.callReady();
    vi.advanceTimersByTime(5_000);
    controller.customerOpenerPlaybackComplete();
    controller.meaningfulSalespersonSpeech();
    vi.advanceTimersByTime(7_000);
    expect(requestSilenceGoodbye).not.toHaveBeenCalled();
  });

  it("clears pending work on retry, disconnect, failure, or unmount", () => {
    const { controller, requestCustomerOpener, requestSilenceGoodbye } =
      createController();
    controller.callReady();
    controller.stop();
    vi.runAllTimers();
    expect(requestCustomerOpener).not.toHaveBeenCalled();
    expect(requestSilenceGoodbye).not.toHaveBeenCalled();
  });

  it("creates scenario-aware opener instructions", () => {
    const resolvePublic = (scenarioId: string) => {
      const scenario = scenarioRegistry.resolve({
        categoryId: "insurance",
        archetypeId: "new-parent",
        scenarioId,
        difficulty: "medium",
      });
      if (!scenario) throw new Error("Expected configured scenario.");
      return scenario.public;
    };

    expect(
      createCustomerOpenerInstruction(
        resolvePublic("initial-needs-conversation"),
      ),
    ).toContain("first-time buyer");
    expect(
      createCustomerOpenerInstruction(resolvePublic("comparing-options")),
    ).toContain("already having a provider");
    const followUpInstruction = createCustomerOpenerInstruction(
      resolvePublic("decision-follow-up"),
    );
    expect(followUpInstruction).toContain("follow-up");
    expect(followUpInstruction).toContain("remember the previous interaction");
    expect(followUpInstruction).toContain("without quoting notes word-for-word");
  });
});
