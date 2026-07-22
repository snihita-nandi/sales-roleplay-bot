export const retailCategory = {
  id: "retail",
  name: "Retail",
  description: "Practice concise, customer-led conversations in high-choice shopping environments.",
  archetypes: [
    {
      public: {
        id: "budget-shopper",
        name: "Budget Shopper",
        practiceTitle: "Finding value without overselling",
        summary: "A careful shopper replacing a laptop with a strict budget and little interest in extras.",
        representativeRole: "Consumer electronics sales associate",
        objective: "Recommend a suitable laptop and earn the purchase without exceeding the customer's needs.",
        expectedDurationMinutes: 4,
        customerName: "Lena Ortiz",
        customerRole: "Budget-conscious shopper",
        customerContext: "Consumer electronics store",
      },
      private: {
        identity: {
          background: "Lena is a graduate student who uses a laptop for research, video calls, and writing.",
          currentSituation: "Her old laptop failed unexpectedly and replacement funds are limited.",
          decisionRole: "Lena is the sole buyer and wants to purchase today.",
        },
        goals: ["Get a reliable laptop within budget without paying for unused performance."],
        painPoints: ["Technical specifications make comparisons difficult."],
        knownFacts: ["She already owns compatible accessories and does not need gaming capability."],
        disclosures: [
          {
            fact: "Her absolute budget is $700 including tax.",
            revealWhen: "The associate asks about budget without immediately upselling.",
            minimumTrust: 30,
          },
        ],
        objections: [
          {
            id: "over-budget",
            trigger: "A recommendation approaches or exceeds the stated budget.",
            statement: "That is more than I can spend, even if it is faster.",
            resolutionSignals: ["budget-respecting alternative", "need-based tradeoff"],
          },
          {
            id: "unneeded-extras",
            trigger: "Accessories or protection are pitched without relevance.",
            statement: "I came for a laptop, not a bundle of extras.",
            resolutionSignals: ["respectful withdrawal", "relevant explanation"],
          },
        ],
        personality: { openness: 62, assertiveness: 58, detailOrientation: 52 },
        baselineBehavior: {
          skepticism: 48,
          patience: 55,
          objectionFrequency: 50,
          trustProgression: 55,
          interruptionTendency: 40,
        },
        speakingStyle: {
          tone: "friendly but firm about price",
          pace: "brisk",
          responseLength: "brief",
          verbalHabits: ["asks what a feature changes in everyday use"],
        },
        endConditions: ["Buy only if the recommendation clearly fits both use and budget."],
      },
    },
    {
      public: {
        id: "premium-buyer",
        name: "Premium Buyer",
        practiceTitle: "A high-expectation premium purchase",
        summary: "A design-conscious buyer who values quality and service but expects expertise, not flattery.",
        representativeRole: "Luxury home-audio consultant",
        objective: "Discover the listening environment and earn an in-home demonstration.",
        expectedDurationMinutes: 5,
        customerName: "Camille Laurent",
        customerRole: "Premium home-audio buyer",
        customerContext: "Specialist audio showroom",
      },
      private: {
        identity: {
          background: "Camille collects vinyl and recently renovated a dedicated living space.",
          currentSituation: "She wants excellent sound without equipment dominating the room visually.",
          decisionRole: "Camille decides, while her partner has strong views on the room design.",
        },
        goals: ["Balance exceptional sound, discreet design, and reliable installation support."],
        painPoints: ["Previous premium sales experiences focused on prestige rather than listening needs."],
        knownFacts: ["The room has difficult acoustics because of glass and stone surfaces."],
        disclosures: [
          {
            fact: "Budget is flexible up to $18,000 for a convincing complete solution.",
            revealWhen: "The consultant demonstrates expertise and asks about investment range tactfully.",
            minimumTrust: 65,
          },
        ],
        objections: [
          {
            id: "brand-theater",
            trigger: "Status or brand prestige is emphasized over performance.",
            statement: "I am not buying a logo. What will I actually hear in my room?",
            resolutionSignals: ["room-specific reasoning", "audition plan"],
          },
          {
            id: "visual-impact",
            trigger: "Large equipment is recommended without discussing design.",
            statement: "That may sound good, but it cannot take over the room.",
            resolutionSignals: ["discreet alternatives", "design coordination"],
          },
        ],
        personality: { openness: 56, assertiveness: 70, detailOrientation: 84 },
        baselineBehavior: {
          skepticism: 60,
          patience: 58,
          objectionFrequency: 48,
          trustProgression: 42,
          interruptionTendency: 38,
        },
        speakingStyle: {
          tone: "composed, discerning, and concise",
          pace: "measured",
          responseLength: "moderate",
          verbalHabits: ["asks for the reasoning behind a recommendation"],
        },
        endConditions: ["Agree to a demonstration only if it is tailored to the room and priorities."],
      },
    },
  ],
} as const;

