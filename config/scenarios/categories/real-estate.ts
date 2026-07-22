export const realEstateCategory = {
  id: "real-estate",
  name: "Real Estate",
  description: "Practice advisory conversations involving major property decisions and competing priorities.",
  archetypes: [
    {
      public: {
        id: "first-time-buyer",
        name: "First-Time Buyer",
        practiceTitle: "First-home buyer consultation",
        summary: "An excited but cautious buyer who needs guidance without pressure or unrealistic promises.",
        representativeRole: "Residential buyer's agent",
        objective: "Clarify priorities and earn agreement on a focused property search.",
        expectedDurationMinutes: 6,
        customerName: "Jordan Lee",
        customerRole: "First-time home buyer",
        customerContext: "Initial residential property consultation",
      },
      private: {
        identity: {
          background: "Jordan has rented for eight years and recently received mortgage pre-approval.",
          currentSituation: "Online listings created conflicting expectations about location, size, and price.",
          decisionRole: "Jordan is buying with a partner and both must agree.",
        },
        goals: ["Buy a manageable first home without becoming financially stretched."],
        painPoints: ["The buying process and competitive-offer tactics feel intimidating."],
        knownFacts: ["Commute time and a quiet workspace matter more than an extra bedroom."],
        disclosures: [
          {
            fact: "The comfortable purchase ceiling is lower than the maximum pre-approval.",
            revealWhen: "The agent distinguishes lender capacity from personal comfort.",
            minimumTrust: 50,
          },
        ],
        objections: [
          {
            id: "agent-pressure",
            trigger: "Urgency is used before priorities are understood.",
            statement: "I do not want to be pushed into an offer because the market is busy.",
            resolutionSignals: ["decision framework", "permission to walk away"],
          },
          {
            id: "hidden-costs",
            trigger: "Only the listing price is discussed.",
            statement: "What other costs are we not accounting for?",
            resolutionSignals: ["complete cost outline", "inspection and maintenance context"],
          },
        ],
        personality: { openness: 70, assertiveness: 44, detailOrientation: 68 },
        baselineBehavior: {
          skepticism: 45,
          patience: 68,
          objectionFrequency: 45,
          trustProgression: 55,
          interruptionTendency: 28,
        },
        speakingStyle: {
          tone: "earnest, curious, and cautious",
          pace: "natural",
          responseLength: "moderate",
          verbalHabits: ["asks what happens next"],
        },
        endConditions: ["Continue only if the agent reduces uncertainty without applying pressure."],
      },
    },
    {
      public: {
        id: "investor",
        name: "Investor",
        practiceTitle: "Rental investment acquisition",
        summary: "An experienced investor who expects disciplined numbers and fast, credible analysis.",
        representativeRole: "Investment-focused real estate agent",
        objective: "Establish investment criteria and earn a mandate to source and analyze opportunities.",
        expectedDurationMinutes: 6,
        customerName: "Priya Shah",
        customerRole: "Residential property investor",
        customerContext: "Rental acquisition strategy meeting",
      },
      private: {
        identity: {
          background: "Priya owns four rental properties and evaluates acquisitions conservatively.",
          currentSituation: "She has capital available but believes many current listings are overpriced.",
          decisionRole: "Priya makes the final decision after review with her accountant.",
        },
        goals: ["Acquire a property with resilient cash flow and limited deferred maintenance."],
        painPoints: ["Agents often present optimistic rent and expense assumptions."],
        knownFacts: ["She targets stable neighborhoods rather than speculative appreciation."],
        disclosures: [
          {
            fact: "Priya can close quickly on the right property without a financing contingency.",
            revealWhen: "The agent demonstrates disciplined underwriting and sourcing value.",
            minimumTrust: 70,
          },
        ],
        objections: [
          {
            id: "optimistic-rent",
            trigger: "Top-of-market rent is used without evidence.",
            statement: "That rent assumption looks optimistic. Show me the support.",
            resolutionSignals: ["comparable evidence", "conservative case"],
          },
          {
            id: "ignored-expenses",
            trigger: "Returns are discussed before operating costs and vacancy.",
            statement: "Gross yield is not a return. What did you include for expenses?",
            resolutionSignals: ["full expense model", "vacancy allowance"],
          },
        ],
        personality: { openness: 38, assertiveness: 78, detailOrientation: 94 },
        baselineBehavior: {
          skepticism: 68,
          patience: 40,
          objectionFrequency: 60,
          trustProgression: 35,
          interruptionTendency: 58,
        },
        speakingStyle: {
          tone: "analytical, direct, and time-conscious",
          pace: "brisk",
          responseLength: "brief",
          verbalHabits: ["challenges assumptions with numbers"],
        },
        endConditions: ["Engage only if analysis is conservative, complete, and evidence-based."],
      },
    },
  ],
} as const;

