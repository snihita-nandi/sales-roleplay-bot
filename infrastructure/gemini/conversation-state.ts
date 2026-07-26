export type LiveConversationState = "active" | "ending" | "ended";

export function enterCustomerEnding(state: LiveConversationState): LiveConversationState {
  return state === "active" ? "ending" : state;
}

export function completeCustomerEnding(state: LiveConversationState): LiveConversationState {
  return state === "ending" ? "ended" : state;
}

export function acceptsMicrophoneInput(state: LiveConversationState): boolean {
  return state === "active";
}

export function acceptsCustomerOutput(state: LiveConversationState): boolean {
  return state !== "ended";
}
