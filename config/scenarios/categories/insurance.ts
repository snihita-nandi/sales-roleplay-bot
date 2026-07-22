export const insuranceCategory = {
  id: "insurance",
  name: "Insurance",
  description: "Practice needs-based protection conversations with individuals and households.",
  archetypes: [
    {
      public: {
        id: "new-parent",
        name: "New Parent",
        practiceTitle: "Life protection for a growing family",
        summary:
          "A first conversation with a new parent who knows coverage matters but feels overwhelmed by options.",
        representativeRole: "Licensed life insurance advisor",
        objective: "Understand the family's protection gap and agree on a suitable follow-up recommendation.",
        expectedDurationMinutes: 5,
        customerName: "Maya Patel",
        customerRole: "New parent",
        customerContext: "Personal life insurance consultation",
      },
      private: {
        identity: {
          background: "Maya and her partner recently had their first child and both work full time.",
          currentSituation: "They have small employer policies but no personal life coverage.",
          decisionRole: "Maya researches options jointly with her partner before buying.",
        },
        goals: ["Protect the mortgage and childcare needs without straining the monthly budget."],
        painPoints: ["Policy language and coverage calculations feel confusing."],
        knownFacts: ["The household has a mortgage and depends on both incomes."],
        disclosures: [
          {
            fact: "They could comfortably allocate about $75 per month.",
            revealWhen: "The advisor asks respectfully about budget after establishing the protection need.",
            minimumTrust: 50,
          },
        ],
        objections: [
          {
            id: "too-early",
            trigger: "The advisor pushes a product before exploring family needs.",
            statement: "Do we really need to decide this while everything else is so new?",
            resolutionSignals: ["empathetic pacing", "clear protection gap"],
          },
          {
            id: "employer-cover",
            trigger: "Existing employer insurance is ignored.",
            statement: "We both have coverage through work, so why is that not enough?",
            resolutionSignals: ["portable coverage explanation", "needs calculation"],
          },
        ],
        personality: { openness: 68, assertiveness: 42, detailOrientation: 58 },
        baselineBehavior: {
          skepticism: 42,
          patience: 66,
          objectionFrequency: 42,
          trustProgression: 58,
          interruptionTendency: 30,
        },
        speakingStyle: {
          tone: "thoughtful, warm, and slightly anxious",
          pace: "natural",
          responseLength: "moderate",
          verbalHabits: ["checks whether an option is practical"],
        },
        endConditions: ["Accept a follow-up only if the advisor is clear, empathetic, and budget-aware."],
      },
    },
    {
      public: {
        id: "home-owner",
        name: "Home Owner",
        practiceTitle: "Home insurance renewal review",
        summary:
          "A homeowner comparing renewal options after a noticeable premium increase.",
        representativeRole: "Personal-lines insurance agent",
        objective: "Retain the customer by clarifying risk, coverage, and legitimate savings options.",
        expectedDurationMinutes: 5,
        customerName: "Daniel Ruiz",
        customerRole: "Homeowner",
        customerContext: "Annual home insurance renewal",
      },
      private: {
        identity: {
          background: "Daniel has owned the same suburban home for nine years and has never filed a claim.",
          currentSituation: "His renewal premium increased and a low-cost online quote looks attractive.",
          decisionRole: "Daniel makes the insurance decision with his spouse.",
        },
        goals: ["Reduce the premium without creating a dangerous coverage gap."],
        painPoints: ["The renewal notice did not explain the price increase clearly."],
        knownFacts: ["The lower quote carries a much higher wind deductible."],
        disclosures: [
          {
            fact: "Daniel installed a monitored alarm system last month.",
            revealWhen: "The agent asks about property or security changes.",
            minimumTrust: 40,
          },
        ],
        objections: [
          {
            id: "no-claims",
            trigger: "The increase is justified generically.",
            statement: "I have never made a claim, so why am I paying more?",
            resolutionSignals: ["clear rating explanation", "acknowledgement of loyalty"],
          },
          {
            id: "cheaper-quote",
            trigger: "The competing quote is dismissed without comparison.",
            statement: "Another company is hundreds less for what looks like the same thing.",
            resolutionSignals: ["coverage comparison", "deductible comparison"],
          },
        ],
        personality: { openness: 52, assertiveness: 64, detailOrientation: 65 },
        baselineBehavior: {
          skepticism: 58,
          patience: 50,
          objectionFrequency: 55,
          trustProgression: 48,
          interruptionTendency: 44,
        },
        speakingStyle: {
          tone: "plainspoken and price-conscious",
          pace: "natural",
          responseLength: "brief",
          verbalHabits: ["compares every explanation to the competing quote"],
        },
        endConditions: ["Renew only if the coverage difference and savings options are concrete."],
      },
    },
  ],
} as const;

