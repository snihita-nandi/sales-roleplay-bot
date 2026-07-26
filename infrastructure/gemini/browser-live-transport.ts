"use client";

import {
  GoogleGenAI,
  Modality,
  type LiveServerMessage,
  type Session,
} from "@google/genai";

import type {
  RoleplayTransport,
  RoleplayTransportCallbacks,
  TranscriptEntry,
} from "@/domain/roleplay/types";
import {
  createCustomerTermination,
  parseCustomerTerminationOutput,
  type CallTermination,
} from "@/domain/roleplay/termination";
import { UserTranscriptSegmenter } from "@/domain/roleplay/user-transcript-segmenter";
import type { RoleplaySessionResponse } from "@/domain/roleplay/api";
import { FarewellDrain } from "@/infrastructure/gemini/farewell-drain";
import { createCustomerSpeechConfig } from "@/infrastructure/gemini/customer-voice";
import type { CustomerVoice } from "@/infrastructure/gemini/customer-voice";
import {
  acceptsCustomerOutput,
  acceptsMicrophoneInput,
  completeCustomerEnding,
  enterCustomerEnding,
  type LiveConversationState,
} from "@/infrastructure/gemini/conversation-state";
import {
  createRoleplayTools,
  END_ROLEPLAY_TOOL_NAME,
} from "@/infrastructure/gemini/live-tools";
import {
  isMeaningfulSalespersonSpeech,
  OpeningSilenceController,
} from "@/infrastructure/gemini/opening-silence";

const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;
const PROCESSOR_NAME = "roleplay-pcm-capture";
type TranscriptEventType =
  | "user-interim"
  | "user-transcription"
  | "assistant-transcription"
  | "assistant-turn-complete"
  | "assistant-termination-complete";

export function createCustomerOpenerInstruction(
  scenario: RoleplaySessionResponse["scenario"],
): string {
  if (scenario.profileScenarioId === "decision-follow-up") {
    return "The salesperson has been silent for five seconds. Generate exactly one short, natural customer opener now. Acknowledge that this is a follow-up and naturally remember the previous interaction; use any follow-up context as memory without quoting notes word-for-word. Do not end the call.";
  }
  if (scenario.profileScenarioId === "comparing-options") {
    return "The salesperson has been silent for five seconds. Generate exactly one short, natural customer opener now that asks who is calling or what this is regarding. Remain consistent with already having a provider. Do not end the call.";
  }
  return "The salesperson has been silent for five seconds. Generate exactly one short, natural customer opener now, such as asking who is calling. Remain consistent with being a first-time buyer. Do not end the call.";
}

const SILENCE_GOODBYE_INSTRUCTION =
  "The salesperson did not respond after your opener. Speak exactly one concise, natural goodbye in character, finish it completely, then silently call end_roleplay with category other. Do not say or explain the end reason.";

export function createBrowserLiveConfig(voiceName: string) {
  return {
    responseModalities: [Modality.AUDIO],
    speechConfig: createCustomerSpeechConfig(voiceName),
    tools: createRoleplayTools(),
  };
}

interface AssistantTranscriptBuffer {
  id: string;
  turnId: string;
  text: string;
}

const workletSource = `
class RoleplayPcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length > 0) {
      this.port.postMessage(channel.slice());
    }
    return true;
  }
}
registerProcessor("${PROCESSOR_NAME}", RoleplayPcmCapture);
`;

function floatToPcm16Base64(input: Float32Array, sourceRate: number): string {
  const ratio = sourceRate / INPUT_SAMPLE_RATE;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const pcm = new Int16Array(outputLength);

  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const start = Math.floor(outputIndex * ratio);
    const end = Math.min(input.length, Math.floor((outputIndex + 1) * ratio));
    let sum = 0;
    for (let inputIndex = start; inputIndex < end; inputIndex += 1) {
      sum += input[inputIndex];
    }
    const sample = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
    pcm[outputIndex] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  const bytes = new Uint8Array(pcm.buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function decodePcm16(base64: string): Float32Array {
  const binary = atob(base64);
  const sampleCount = Math.floor(binary.length / 2);
  const audio = new Float32Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    const low = binary.charCodeAt(index * 2);
    const high = binary.charCodeAt(index * 2 + 1);
    const unsigned = low | (high << 8);
    const signed = unsigned >= 0x8000 ? unsigned - 0x10000 : unsigned;
    audio[index] = signed / 0x8000;
  }
  return audio;
}

class PcmAudioPlayer {
  private context: AudioContext | null = null;
  private nextStartTime = 0;
  private pendingPlays = 0;
  private playbackGeneration = 0;
  private readonly activeSources = new Set<AudioBufferSourceNode>();
  private readonly idleResolvers = new Set<() => void>();

  async play(base64: string): Promise<void> {
    const generation = this.playbackGeneration;
    this.pendingPlays += 1;
    try {
      this.context ??= new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
      if (generation !== this.playbackGeneration) return;

      const samples = decodePcm16(base64);
      if (samples.length === 0) return;

      const buffer = this.context.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
      buffer.getChannelData(0).set(samples);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      source.onended = () => {
        this.activeSources.delete(source);
        this.resolveIdleWaiters();
      };
      this.activeSources.add(source);

      const startTime = Math.max(this.context.currentTime, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + buffer.duration;
    } finally {
      this.pendingPlays -= 1;
      this.resolveIdleWaiters();
    }
  }

  interrupt(): void {
    this.playbackGeneration += 1;
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // A source that has already ended requires no further cleanup.
      }
    }
    this.activeSources.clear();
    this.resolveIdleWaiters();
    if (this.context) this.nextStartTime = this.context.currentTime;
  }

  whenIdle(): Promise<void> {
    if (this.activeSources.size === 0 && this.pendingPlays === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleResolvers.add(resolve));
  }

  async close(): Promise<void> {
    this.interrupt();
    if (this.context && this.context.state !== "closed") {
      await this.context.close();
    }
    this.context = null;
  }

  private resolveIdleWaiters(): void {
    if (this.activeSources.size > 0 || this.pendingPlays > 0) return;
    for (const resolve of this.idleResolvers) resolve();
    this.idleResolvers.clear();
  }
}

export class GeminiLiveTransport implements RoleplayTransport {
  private session: Session | null = null;
  private captureContext: AudioContext | null = null;
  private captureNode: AudioWorkletNode | null = null;
  private captureSource: MediaStreamAudioSourceNode | null = null;
  private silentGain: GainNode | null = null;
  private muted = false;
  private closed = false;
  private closeNotified = false;
  private customerTerminationRequested = false;
  private terminationParseFailureLogged = false;
  private customerRawTranscript = "";
  private conversationState: LiveConversationState = "active";
  private farewellDrain: FarewellDrain | null = null;
  private assistantTurnSequence = 0;
  private assistantTranscript = this.createAssistantTranscriptBuffer();
  private readonly emittedTranscriptIds = new Set<string>();
  private readonly player = new PcmAudioPlayer();
  private readonly userTranscript = new UserTranscriptSegmenter({
    createId: () => crypto.randomUUID(),
    now: () => performance.now(),
  });
  private readonly openingSilence: OpeningSilenceController;
  constructor(
    private readonly bootstrap: RoleplaySessionResponse,
    private readonly voiceName: CustomerVoice,
    private readonly stream: MediaStream,
    private readonly callbacks: RoleplayTransportCallbacks,
  ) {
    this.openingSilence = new OpeningSilenceController({
      requestCustomerOpener: () => {
        if (this.closed || this.conversationState !== "active" || !this.session) return;
        this.session.sendClientContent({
          turns: createCustomerOpenerInstruction(this.bootstrap.scenario),
          turnComplete: true,
        });
      },
      requestSilenceGoodbye: () => this.requestSilenceGoodbye(),
      setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
      clearTimer: (timer) => clearTimeout(timer),
    });
  }

  async connect(): Promise<void> {
    const client = new GoogleGenAI({
      apiKey: this.bootstrap.ephemeralToken,
      apiVersion: "v1alpha",
    });

    this.session = await client.live.connect({
      model: this.bootstrap.model,
      config: createBrowserLiveConfig(this.voiceName),
      callbacks: {
        onmessage: (message) => this.handleMessage(message),
        onerror: () => {
          this.openingSilence.stop();
          this.callbacks.onError("The live audio connection encountered an error.");
        },
        onclose: () => this.notifyClosed(),
      },
    });

    await this.startCapture();
    this.callbacks.onConnected();
    this.openingSilence.callReady();
  }

  setMuted(muted: boolean): void {
    if (this.conversationState !== "active") return;
    this.muted = muted;
    for (const track of this.stream.getAudioTracks()) {
      track.enabled = !muted;
    }
  }

  interrupt(): void {
    this.player.interrupt();
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.openingSilence.stop();
    this.conversationState =
      this.conversationState === "ending"
        ? completeCustomerEnding(this.conversationState)
        : "ended";
    this.captureNode?.disconnect();
    this.captureSource?.disconnect();
    this.silentGain?.disconnect();
    this.captureNode = null;
    this.captureSource = null;
    this.silentGain = null;
    for (const track of this.stream.getTracks()) track.stop();

    if (this.captureContext && this.captureContext.state !== "closed") {
      await this.captureContext.close();
    }
    this.captureContext = null;
    this.session?.sendRealtimeInput({ audioStreamEnd: true });
    this.session?.close();
    this.session = null;
    await this.player.close();
    this.notifyClosed();
  }

  private async startCapture(): Promise<void> {
    this.captureContext = new AudioContext();
    await this.captureContext.resume();
    const moduleUrl = URL.createObjectURL(
      new Blob([workletSource], { type: "text/javascript" }),
    );

    try {
      await this.captureContext.audioWorklet.addModule(moduleUrl);
    } finally {
      URL.revokeObjectURL(moduleUrl);
    }

    this.captureSource = this.captureContext.createMediaStreamSource(this.stream);
    this.captureNode = new AudioWorkletNode(this.captureContext, PROCESSOR_NAME);
    this.silentGain = this.captureContext.createGain();
    this.silentGain.gain.value = 0;
    this.captureNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (
        !acceptsMicrophoneInput(this.conversationState) ||
        this.muted ||
        this.closed ||
        !this.session
      ) {
        return;
      }
      const data = floatToPcm16Base64(event.data, this.captureContext?.sampleRate ?? 48_000);
      this.session.sendRealtimeInput({
        audio: { data, mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
      });
    };
    this.captureSource.connect(this.captureNode);
    this.captureNode.connect(this.silentGain);
    this.silentGain.connect(this.captureContext.destination);
  }

  private handleMessage(message: LiveServerMessage): void {
    if (
      message.data &&
      acceptsCustomerOutput(this.conversationState)
    ) {
      void this.player.play(message.data).catch(() => {
        this.callbacks.onError("Customer audio could not be played.");
      });
    }

    const endCall = message.toolCall?.functionCalls?.find(
      (functionCall) => functionCall.name === END_ROLEPLAY_TOOL_NAME,
    );
    if (endCall) {
      const termination = createCustomerTermination(endCall.args?.category);
      if (termination) this.requestCustomerEnding(termination, true);
    }

    const content = message.serverContent;
    if (!content) return;
    if (content.interrupted && this.conversationState === "active") {
      this.player.interrupt();
      this.callbacks.onInterrupted();
    }
    if (
      this.conversationState === "active" &&
      content.interimInputTranscription?.text
    ) {
      this.registerMeaningfulSalespersonSpeech(
        content.interimInputTranscription.text,
      );
      this.emitTranscript(
        this.userTranscript.updateDraft(content.interimInputTranscription.text),
        "user-interim",
      );
    }
    if (this.conversationState === "active" && content.inputTranscription) {
      const inputTranscript = content.inputTranscription;
      this.registerMeaningfulSalespersonSpeech(inputTranscript.text ?? "");
      const entry =
        inputTranscript.finished === false
          ? this.userTranscript.updateDraft(inputTranscript.text ?? "")
          : this.userTranscript.finalize(inputTranscript.text);
      this.emitTranscript(entry, "user-transcription");
    }
    if (content.outputTranscription?.text) {
      const outputFinished = content.outputTranscription.finished ?? content.turnComplete ?? false;
      this.updateCustomerTranscript(
        content.outputTranscription.text,
        outputFinished,
      );
      if (this.conversationState === "ending" && outputFinished) {
        this.farewellDrain?.markOutputComplete();
      }
    }
    if (content.turnComplete) {
      if (this.conversationState === "ending") {
        this.farewellDrain?.markOutputComplete();
      } else if (this.conversationState === "active") {
        this.logIncompleteTerminationMarker();
        this.finalizeAssistantTurn("assistant-turn-complete");
        void this.player.whenIdle().then(() => {
          if (this.closed || this.conversationState !== "active") return;
          this.openingSilence.customerOpenerPlaybackComplete();
        });
      }
    }
  }

  private updateCustomerTranscript(chunk: string, final: boolean): void {
    this.customerRawTranscript += chunk;
    const parsed = parseCustomerTerminationOutput(this.customerRawTranscript);
    const buffer = this.assistantTranscript;
    buffer.text = parsed.visibleText;

    if (parsed.termination) {
      this.customerRawTranscript = "";
      this.requestCustomerEnding(parsed.termination, final);
      return;
    }

    if (final && parsed.status !== "none") {
      this.logTerminationParseFailure(this.customerRawTranscript);
    }

    const entry: TranscriptEntry = {
      id: buffer.id,
      role: "customer",
      text: buffer.text,
      timestampMs: performance.now(),
      final,
    };
    if (entry.text) {
      this.emitTranscript(entry, "assistant-transcription", buffer.turnId);
    }
    if (final) {
      this.resetAssistantTurn();
    }
  }

  private logIncompleteTerminationMarker(): void {
    const parsed = parseCustomerTerminationOutput(this.customerRawTranscript);
    if (parsed.status !== "none" && parsed.status !== "valid") {
      this.logTerminationParseFailure(this.customerRawTranscript);
    }
  }

  private logTerminationParseFailure(rawResponse: string): void {
    if (this.terminationParseFailureLogged) return;
    this.terminationParseFailureLogged = true;
    console.error("[roleplay][termination] Could not parse customer termination marker.");
    console.error("RAW ASSISTANT RESPONSE START");
    console.error(rawResponse);
    console.error("RAW ASSISTANT RESPONSE END");
  }

  private beginCustomerEnding(): void {
    this.conversationState = enterCustomerEnding(this.conversationState);
    this.muted = true;
    this.openingSilence.stop();
  }

  private registerMeaningfulSalespersonSpeech(text: string): void {
    if (!isMeaningfulSalespersonSpeech(text)) return;
    this.openingSilence.meaningfulSalespersonSpeech();
  }

  private requestSilenceGoodbye(): void {
    if (this.closed || this.conversationState !== "active" || !this.session) return;
    const termination = createCustomerTermination("other");
    if (!termination) return;
    this.requestCustomerEnding(termination, false);
    this.session?.sendClientContent({
      turns: SILENCE_GOODBYE_INSTRUCTION,
      turnComplete: true,
    });
  }

  private requestCustomerEnding(
    termination: CallTermination,
    outputComplete: boolean,
  ): void {
    if (this.conversationState !== "active" || this.customerTerminationRequested) return;
    this.customerTerminationRequested = true;
    this.beginCustomerEnding();
    this.callbacks.onCustomerEnded(termination);
    this.farewellDrain = new FarewellDrain();
    if (outputComplete) this.farewellDrain.markOutputComplete();
    void this.farewellDrain
      .waitUntilSafeToDisconnect(() => this.player.whenIdle())
      .then(() => {
        if (this.conversationState !== "ending" || this.closed) return;
        this.finalizeAssistantTurn("assistant-termination-complete");
        void this.close();
      });
  }

  private emitTranscript(
    entry: TranscriptEntry | null,
    eventType: TranscriptEventType,
    turnId = entry ? `${entry.role}-turn-${entry.id}` : "none",
  ): void {
    if (!entry) return;
    const created = !this.emittedTranscriptIds.has(entry.id);
    this.emittedTranscriptIds.add(entry.id);
    if (process.env.NODE_ENV === "development") {
      console.debug("[roleplay][transcript]", {
        speaker: entry.role,
        timestamp: entry.timestampMs,
        eventType,
        partial: !entry.final,
        final: entry.final,
        turnId,
        transcriptId: entry.id,
        created,
        updated: !created,
      });
    }
    this.callbacks.onTranscript(entry);
  }

  private finalizeAssistantTurn(eventType: TranscriptEventType): void {
    const buffer = this.assistantTranscript;
    if (!buffer.text.trim() && !this.customerRawTranscript) return;
    if (buffer.text.trim()) {
      this.emitTranscript(
        {
          id: buffer.id,
          role: "customer",
          text: buffer.text.trim(),
          timestampMs: performance.now(),
          final: true,
        },
        eventType,
        buffer.turnId,
      );
    }
    this.resetAssistantTurn();
  }

  private resetAssistantTurn(): void {
    this.customerRawTranscript = "";
    this.assistantTranscript = this.createAssistantTranscriptBuffer();
  }

  private createAssistantTranscriptBuffer(): AssistantTranscriptBuffer {
    this.assistantTurnSequence += 1;
    return {
      id: crypto.randomUUID(),
      turnId: `assistant-turn-${this.assistantTurnSequence}`,
      text: "",
    };
  }

  private notifyClosed(): void {
    if (this.closeNotified) return;
    this.closeNotified = true;
    this.callbacks.onClosed();
  }
}
