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
  },
] as const;

