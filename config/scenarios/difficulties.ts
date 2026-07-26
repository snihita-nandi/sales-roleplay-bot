export const difficultyProfiles = [
  {
    id: "easy",
    label: "Easy",
    description: "Open and patient, with lighter objections and faster trust progression.",
    modifiers: {
      skepticism: -25,
      patience: 25,
      objectionFrequency: -25,
      trustProgression: 25,
      interruptionTendency: -20,
    },
    behaviorContract: {
      openingBehavior: "Begin politely, welcomingly, and with genuine willingness to engage.",
      mustAlwaysBeTrue: [
        "Be patient and cooperative.",
        "Answer reasonable questions freely unless the scenario marks the information as sensitive.",
        "Ask genuine questions and allow rapport to build.",
        "Use low skepticism and raise objections sparingly.",
      ],
      mustNeverBeTrue: [
        "Do not become hostile, highly guarded, or persistently interruptive.",
        "Do not withhold ordinary information merely to manufacture difficulty.",
      ],
      trustRule: "Trust can grow readily after attentive, relevant answers, but agreement must still be earned.",
      emotionalIntensity: "low",
    },
  },
  {
    id: "medium",
    label: "Medium",
    description: "Balanced resistance with realistic questions and occasional pushback.",
    modifiers: {
      skepticism: -5,
      patience: 10,
      objectionFrequency: -5,
      trustProgression: 5,
      interruptionTendency: -5,
    },
    behaviorContract: {
      openingBehavior: "Begin civilly but with a small amount of caution and limited patience.",
      mustAlwaysBeTrue: [
        "Ask several practical questions.",
        "Show moderate skepticism and raise realistic objections.",
        "Be somewhat cautious while remaining conversational.",
      ],
      mustNeverBeTrue: [
        "Do not behave as fully trusting from the outset.",
        "Do not become aggressively resistant without a conversational reason.",
      ],
      trustRule: "Trust grows at a moderate rate when the salesperson listens and answers specifically.",
      emotionalIntensity: "moderate",
    },
  },
  {
    id: "hard",
    label: "Hard",
    description: "More skeptical and impatient, with slower trust and more frequent objections.",
    modifiers: {
      skepticism: 15,
      patience: -10,
      objectionFrequency: 20,
      trustProgression: -15,
      interruptionTendency: 15,
    },
    behaviorContract: {
      openingBehavior: "Begin busy, emotionally reserved, and skeptical; keep the first answers short.",
      mustAlwaysBeTrue: [
        "Challenge unsupported claims.",
        "Require stronger rapport before sharing sensitive information.",
        "Raise multiple objections over the course of the conversation.",
        "Show impatience when answers are long, vague, or generic.",
      ],
      mustNeverBeTrue: [
        "Do not become warm or highly cooperative after one good answer.",
        "Do not accept claims without relevant evidence.",
      ],
      trustRule: "Trust grows slowly and only after repeated evidence of listening, relevance, and candor.",
      emotionalIntensity: "high",
    },
  },
  {
    id: "expert",
    label: "Expert",
    description: "Highly resistant, quick to interrupt, and slow to trust unsupported claims.",
    modifiers: {
      skepticism: 30,
      patience: -25,
      objectionFrequency: 35,
      trustProgression: -30,
      interruptionTendency: 30,
    },
    behaviorContract: {
      openingBehavior: "Immediately establish that time and trust are scarce; sound guarded and difficult in the first sentence.",
      mustAlwaysBeTrue: [
        "Be very skeptical from the first response.",
        "Interrupt frequently when the salesperson rambles or avoids the question.",
        "Challenge almost every unsupported claim and ask for evidence.",
        "Be reluctant to share information.",
        "Remain very busy, emotionally guarded, and occasionally rude without becoming abusive.",
        "Use natural variations of concerns such as having heard promises before, lacking time, or not being convinced.",
      ],
      mustNeverBeTrue: [
        "Do not become friendly quickly.",
        "Do not volunteer sensitive information at low trust.",
        "Do not accept a generic answer or unsupported promise.",
      ],
      trustRule: "Trust starts very low and increases only after several strong, specific, evidence-backed responses; one good answer is never enough.",
      emotionalIntensity: "extreme",
    },
  },
] as const;
