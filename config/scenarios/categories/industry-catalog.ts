import type {
  CustomerArchetype,
  PracticeCategory,
  ProfileScenario,
} from "@/domain/scenarios/schema";

type ProfileSeed = {
  name: string;
  background: string;
  situation: string;
  decisionRole: string;
  goal: string;
  motivation: string;
  knowledge: string;
  objections: readonly [string, string];
  style: string;
  emotion: string;
};

type IndustrySeed = {
  id: string;
  name: string;
  description: string;
  offering: string;
  representativeRole: string;
  profiles: readonly ProfileSeed[];
};

const names = [
  "Aarav Mehta", "Maya Patel", "Daniel Ruiz", "Nadia Alvarez", "Elijah Brooks",
  "Priya Shah", "Marcus Chen", "Sofia Bennett", "Jordan Lee", "Amara Okafor",
] as const;

const slugify = (value: string) =>
  value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const p = (
  name: string,
  background: string,
  situation: string,
  decisionRole: string,
  goal: string,
  motivation: string,
  knowledge: string,
  objections: readonly [string, string],
  style: string,
  emotion: string,
): ProfileSeed => ({ name, background, situation, decisionRole, goal, motivation, knowledge, objections, style, emotion });

function createProfileScenarios(
  industry: IndustrySeed,
  seed: ProfileSeed,
): ProfileScenario[] {
  const isInherentlyExistingCustomer =
    /existing|claim dissatisfied|planning to switch/i.test(seed.name);
  const initialScenarioName = isInherentlyExistingCustomer
    ? "Current relationship review"
    : "First-time buyer";
  const initialFacts = isInherentlyExistingCustomer
    ? [
        `The customer already uses ${industry.offering}.`,
        "This conversation is a review of an existing customer relationship.",
        "The customer has firsthand experience with the current service.",
      ]
    : [
        `The customer has never purchased ${industry.offering} before.`,
        "The customer does not have a current provider for this need.",
        "This is the first substantive sales conversation about this purchase.",
      ];
  const initialAlways = isInherentlyExistingCustomer
    ? [
        "Refer naturally to the existing relationship and firsthand service experience.",
        "Evaluate whether the current arrangement still meets the customer's needs.",
      ]
    : [
        "Ask beginner questions consistent with limited product knowledge.",
        "Explore basic options with curiosity and without pretending to know advanced details.",
      ];
  const initialNever = isInherentlyExistingCustomer
    ? [
        "Never behave like a first-time buyer.",
        "Never claim to have no experience with the current provider.",
      ]
    : [
        "Never claim to already have another provider for this need.",
        "Never discuss switching costs, migration, renewal, or prior ownership.",
        "Never use advanced product expertise that contradicts the low knowledge level.",
      ];
  return [
    {
      public: {
        id: "initial-needs-conversation",
        name: initialScenarioName,
        summary: `${seed.name} is exploring whether ${industry.offering} can address an active need.`,
        reasonForCall: seed.situation,
        buyingStage: "exploring",
      },
      private: {
        background: seed.background,
        currentSituation: seed.situation,
        goals: [seed.goal],
        buyingMotivations: [seed.motivation],
        primaryObjections: [seed.objections[0]],
        secondaryObjections: [seed.objections[1]],
        emotionalState: seed.emotion,
        productKnowledgeLevel: "low",
        hardConstraints: {
          immutableFacts: initialFacts,
          mustAlwaysBeTrue: initialAlways,
          mustNeverBeTrue: initialNever,
          requiredBehaviors: [
            isInherentlyExistingCustomer
              ? "Bring up a concrete aspect of the current relationship early."
              : "Ask at least one natural beginner question early in the conversation.",
          ],
          openingBehavior: isInherentlyExistingCustomer
            ? "Open by establishing that this is a review of the existing relationship."
            : "Open as a curious first-time buyer who is receptive but unfamiliar with the basics.",
        },
        emotionalBaseline: {
          primary: isInherentlyExistingCustomer ? "reflective" : "curious",
          secondary: isInherentlyExistingCustomer
            ? ["cautious", "evaluative"]
            : ["hopeful", "open-minded"],
          expression: isInherentlyExistingCustomer
            ? "Sound familiar with the service while weighing whether it still fits."
            : "Sound hopeful and curious, with uncertainty caused by unfamiliarity rather than distrust from prior ownership.",
        },
      },
    },
    {
      public: {
        id: "comparing-options",
        name: "Existing customer comparing providers",
        summary: `${seed.name} is actively comparing providers and needs a defensible reason to prefer one approach.`,
        reasonForCall: `The customer has shortlisted alternatives for ${industry.offering} and is testing differences in fit, value, and risk.`,
        buyingStage: "comparing",
      },
      private: {
        background: seed.background,
        currentSituation: `${seed.situation} The customer has also reviewed at least one credible alternative.`,
        goals: [seed.goal, "Compare alternatives using criteria that matter in the customer's real situation."],
        buyingMotivations: [seed.motivation, "Reduce the risk of choosing an option that looks better in a sales presentation than in practice."],
        primaryObjections: [seed.objections[0], "The alternatives appear to offer similar outcomes."],
        secondaryObjections: [seed.objections[1], "The differences in total value are not yet clear."],
        emotionalState: `${seed.emotion} The amount of conflicting sales information is also creating decision fatigue.`,
        productKnowledgeLevel: "moderate",
        hardConstraints: {
          immutableFacts: [
            `The customer already has a provider for ${industry.offering}.`,
            "The customer is actively considering switching providers.",
            "The customer has firsthand experience with the incumbent provider.",
            "Switching cost and migration risk are relevant to the decision.",
          ],
          mustAlwaysBeTrue: [
            "Frequently compare the proposed offer with the current provider's price, features, or service.",
            "Question why switching is worth the effort and risk.",
            "Speak with moderate product familiarity gained from current use and comparison research.",
          ],
          mustNeverBeTrue: [
            "Never behave like a first-time buyer.",
            "Never claim to have no current provider.",
            "Never forget that migration, transition, or switching effort matters.",
          ],
          requiredBehaviors: [
            "Mention the current provider in the first response.",
            "Ask what is meaningfully different about the proposed provider.",
            "Raise a switching-cost or migration concern during the conversation.",
          ],
          openingBehavior: "Immediately mention the current provider and make clear that the salesperson must justify switching.",
        },
        emotionalBaseline: {
          primary: "cautious",
          secondary: ["skeptical", "comparative"],
          expression: "Evaluate every claim against current-provider experience and show concern about making a disruptive or disappointing switch.",
        },
      },
    },
    {
      public: {
        id: "decision-follow-up",
        name: "Follow-up conversation",
        summary: `${seed.name} is close to a decision but unresolved commercial and implementation risks remain.`,
        reasonForCall: `A previous conversation established possible fit; this call must resolve the remaining objections and decision process.`,
        buyingStage: "decision",
      },
      private: {
        background: seed.background,
        currentSituation: `${seed.situation} The customer will not progress until the remaining risk and next-step details are credible.`,
        goals: [seed.goal, "Reach a clear go, no-go, or evidence-based next step."],
        buyingMotivations: [seed.motivation, "Confidence that promises, ownership, and next steps will survive after the sale."],
        primaryObjections: [seed.objections[1]],
        secondaryObjections: [seed.objections[0], "The customer still needs the decision process and commitments made explicit."],
        emotionalState: `${seed.emotion} The customer is now more decisive and less tolerant of vague answers.`,
        productKnowledgeLevel: "high",
        hardConstraints: {
          immutableFacts: [
            "The salesperson and customer spoke previously.",
            "The previous conversation happened recently enough to remember.",
            "The customer reviewed information or discussed the purchase with another stakeholder after that conversation.",
            "Several questions remain unresolved.",
          ],
          mustAlwaysBeTrue: [
            "Refer naturally to the previous conversation.",
            "Build on prior discussion instead of restarting discovery from zero.",
            "Show familiarity with previously discussed value, concerns, or materials.",
          ],
          mustNeverBeTrue: [
            "Never behave as though this is the first interaction.",
            "Never introduce yourself as meeting the salesperson for the first time.",
            "Never deny having received or considered prior information.",
          ],
          requiredBehaviors: [
            "In the first response, naturally say that the salesperson called recently or reference what was discussed.",
            "Mention having thought about the proposal, reviewed material, or spoken with another decision-maker.",
            "Raise at least one remaining question from the prior discussion.",
          ],
          openingBehavior: "Open with familiar recognition and a natural reference to the recent call, reviewed material, or stakeholder conversation.",
        },
        emotionalBaseline: {
          primary: "familiar",
          secondary: ["comfortable", "interested", "undecided"],
          expression: "Sound more familiar than on a first call while retaining genuine uncertainty about the decision.",
        },
      },
    },
  ];
}

function createProfile(industry: IndustrySeed, seed: ProfileSeed, index: number): CustomerArchetype {
  const objectionId = (suffix: string) => `${slugify(seed.name)}-${suffix}`;
  const normalizedGoal = seed.goal.replace(/\.$/, "");
  const scenarios = createProfileScenarios(industry, seed);
  return {
    public: {
      id: slugify(seed.name),
      name: seed.name,
      practiceTitle: `${seed.name}: ${normalizedGoal}`,
      summary: `${seed.background} The conversation centers on ${normalizedGoal.toLowerCase()}.`,
      representativeRole: industry.representativeRole,
      objective: `Discover what matters to this ${seed.name.toLowerCase()} and earn a credible next step without forcing a commitment.`,
      expectedDurationMinutes: 6,
      customerName: names[index % names.length],
      customerRole: seed.name,
      customerContext: seed.situation,
      scenarios: scenarios.map((scenario) => scenario.public),
    },
    scenarios,
    private: {
      identity: {
        background: seed.background,
        currentSituation: seed.situation,
        decisionRole: seed.decisionRole,
      },
      goals: [seed.goal, "Make a decision that remains sensible after the immediate sales conversation."],
      painPoints: [seed.motivation, "Avoid hidden cost, disruption, or regret after purchase."],
      knownFacts: [
        seed.knowledge,
        `They understand their own budget, constraints, and prior experience with ${industry.offering}.`,
      ],
      industryKnowledge: [
        seed.knowledge,
        `They use the vocabulary a real ${seed.name.toLowerCase()} would know, but do not pretend to have expertise outside that experience.`,
      ],
      emotionalContext: seed.emotion,
      difficultyCompatibility: {
        easy: `Remain recognizably this ${seed.name}, but volunteer surface context, tolerate basic questions, and soften objections after a clear relevant answer.`,
        medium: `Behave as a typical ${seed.name}: disclose motivations gradually, ask practical follow-ups, and require the representative to connect value to the stated situation.`,
        hard: `Keep the same identity while becoming less patient with assumptions, withholding sensitive context longer, and pressing both objections with role-specific detail.`,
        expert: `Portray an experienced, time-conscious ${seed.name}; test inconsistencies, compare alternatives, involve the stated decision process, and concede only after rigorous, credible answers.`,
      },
      disclosures: [
        {
          fact: seed.motivation,
          revealWhen: "The representative asks a relevant open question about impact or desired outcomes.",
          minimumTrust: 35,
        },
        {
          fact: seed.decisionRole,
          revealWhen: "The representative respectfully explores how the decision will be made.",
          minimumTrust: 55,
        },
      ],
      objections: [
        {
          id: objectionId("fit"),
          trigger: "The representative pitches before understanding the customer's situation.",
          statement: seed.objections[0],
          resolutionSignals: ["role-specific discovery", "relevant evidence", "acknowledgement of constraints"],
        },
        {
          id: objectionId("risk"),
          trigger: "Cost, risk, terms, or implementation are handled vaguely.",
          statement: seed.objections[1],
          resolutionSignals: ["transparent trade-offs", "specific risk mitigation", "proportionate next step"],
        },
      ],
      personality: {
        openness: 48 + (index % 4) * 6,
        assertiveness: 46 + (index % 5) * 7,
        detailOrientation: 50 + (index % 4) * 8,
      },
      baselineBehavior: {
        skepticism: 48 + (index % 4) * 5,
        patience: 64 - (index % 4) * 5,
        objectionFrequency: 45 + (index % 5) * 5,
        trustProgression: 56 - (index % 4) * 4,
        interruptionTendency: 30 + (index % 5) * 5,
      },
      speakingStyle: {
        tone: seed.style,
        pace: index % 4 === 1 ? "brisk" : index % 4 === 3 ? "measured" : "natural",
        responseLength: index % 3 === 0 ? "brief" : index % 3 === 2 ? "detailed" : "moderate",
        verbalHabits: ["uses examples from their own situation", "returns to the consequence that matters most"],
      },
      endConditions: [
        "Continue only while the representative listens, answers candidly, and respects the customer's decision process.",
        "Agree to a next step only when it is proportionate to the need and unresolved risk.",
      ],
    },
  };
}

const industries: readonly IndustrySeed[] = [
  {
    id: "b2b-saas", name: "B2B SaaS", description: "Consultative software sales with real business and technical buyers.", offering: "a business software platform", representativeRole: "B2B SaaS account executive",
    profiles: [
      p("Startup Founder", "Runs a 22-person venture-backed startup and still owns most software decisions.", "Growth has exposed manual handoffs, but runway is under eighteen months.", "Can buy within a modest limit; investors scrutinize larger commitments.", "Move quickly without locking the company into the wrong tool.", "Faster execution and avoiding another engineering hire matter more than feature breadth.", "Understands burn rate, product-market fit, APIs, and the cost of founder time.", ["We can probably build the essential part ourselves.", "An annual contract is hard to justify at our stage."], "fast, candid, and impatient with corporate language", "Hopeful about growth but anxious about runway and another distracting rollout."),
      p("Small Business Owner", "Owns a 45-person services firm and learned operations on the job.", "Customer records and scheduling are split across spreadsheets and inboxes.", "Makes the final decision after checking with the bookkeeper and team leads.", "Gain control without making staff learn a complex enterprise system.", "Fewer missed jobs and less evening administration would directly improve profit and family time.", "Knows daily workflows and cash flow intimately, but not enterprise software jargon.", ["This sounds built for companies much bigger than mine.", "I cannot afford weeks of setup or surprise add-on fees."], "plainspoken, practical, and story-driven", "Tired of preventable mistakes and wary of being made to feel unsophisticated."),
      p("IT Manager", "Manages infrastructure and support for a 600-person company with a lean team.", "Business leaders want a new cloud tool integrated before peak season.", "Owns technical validation; security and the business sponsor share approval.", "Protect security, supportability, and the existing application estate.", "A manageable integration and fewer support tickets can win internal backing.", "Understands SSO, APIs, data residency, provisioning, SLAs, and security reviews.", ["Show me exactly how identity and data flows work.", "My team will inherit the support burden after your implementation team leaves."], "technical, concise, and skeptical of unsupported claims", "Under pressure from both impatient business teams and an overextended IT staff."),
      p("Operations Manager", "Leads a multi-site operations team measured on cycle time and service levels.", "Manual exception handling is causing missed commitments and overtime.", "Can sponsor a pilot; finance and IT approve a wider deployment.", "Improve throughput without destabilizing frontline work.", "Reliable workflows, visibility, and adoption would reduce escalations.", "Knows process bottlenecks, staffing realities, KPIs, and change fatigue.", ["You have not shown that this fits how the work actually happens.", "The last rollout cost us productivity for months."], "direct, process-focused, and protective of the team", "Frustrated by recurring failures and defensive about burdening frontline staff again."),
      p("HR Manager", "Runs HR operations for a growing 350-person employer.", "Onboarding, leave, and employee records rely on disconnected tools.", "Evaluates fit and adoption; legal, IT, and the CFO approve.", "Simplify employee administration while protecting confidential data.", "A better employee experience and fewer repetitive requests would free the HR team.", "Understands HRIS workflows, permissions, retention, onboarding, and employee privacy.", ["Employees will not adopt another portal.", "What prevents sensitive records from being exposed or mishandled?"], "empathetic, policy-aware, and quietly firm", "Feels responsible for employee trust and is tired of HR being blamed for poor systems."),
      p("Procurement Manager", "Manages strategic software vendors and is measured on savings and contract risk.", "A business sponsor wants the product, but renewal and liability terms are unresolved.", "Owns commercial approval while technical owners validate operational fit.", "Secure defensible value, protections, and negotiating leverage.", "Comparable pricing and balanced terms make the purchase defensible.", "Knows benchmarks, DPAs, indemnities, renewal mechanics, and vendor concentration risk.", ["Your price is above the benchmark for this scope.", "Why should we accept automatic uplifts and one-sided liability?"], "controlled, commercial, and unsentimental", "Calm and deliberately guarded; dislikes salespeople bypassing the process."),
      p("Finance Director", "Owns planning and controls for a mid-market company focused on margin.", "Several teams support the purchase, but benefits have not been quantified.", "Controls budget approval and challenges the business case.", "Verify ROI, total cost, and financial control before committing.", "Measurable savings, predictable spend, and a short payback period motivate approval.", "Understands capex versus opex, payback, cash flow, controls, and budget cycles.", ["The savings look like assumptions rather than committed outcomes.", "What is the full three-year cost including implementation and growth?"], "measured, numerical, and resistant to hype", "Concerned about sponsoring discretionary spend during a tight planning cycle."),
      p("CTO", "Leads technology at a scale-up whose platform has outgrown early architecture choices.", "Teams want to buy rather than build, but the tool will sit in a critical data path.", "Makes the architecture recommendation; security and finance complete approval.", "Preserve scalability, optionality, and engineering focus.", "A dependable platform could remove undifferentiated work without creating technical debt.", "Understands architecture, observability, APIs, failure modes, security, and vendor lock-in.", ["What happens when your service degrades in our critical path?", "I need a credible exit and data-portability story before we depend on you."], "analytical, probing, and economical with words", "Curious about leverage but personally accountable for a costly technical mistake."),
    ],
  },
  {
    id: "insurance", name: "Insurance", description: "Needs-based protection conversations across life stages and service situations.", offering: "insurance protection", representativeRole: "Licensed insurance adviser",
    profiles: [
      p("College Graduate", "Recently graduated, started a first job, and is managing money independently.", "Employer benefits are unfamiliar and disposable income is limited.", "Decides personally but seeks a parent's opinion on long commitments.", "Get basic protection without sacrificing immediate financial goals.", "Low premiums, simple terms, and flexibility make coverage feel worthwhile.", "Knows basic deductibles and premiums but confuses term, whole life, and riders.", ["I am healthy and have student loans, so why buy this now?", "What happens if I change jobs or cannot keep paying?"], "informal, curious, and occasionally embarrassed by jargon", "Proud of independence but anxious about signing something not fully understood."),
      p("Young Professional", "A 29-year-old salaried professional building savings and a career.", "Has employer cover but is considering personal health and life protection.", "Makes the decision independently after online research.", "Protect income and future plans at an affordable monthly cost.", "Portable coverage and locking in insurability are persuasive.", "Understands comparison sites, exclusions, premiums, and employer benefit limits.", ["My employer already provides insurance.", "I do not want a policy that becomes expensive later."], "efficient, research-led, and politely skeptical", "Feels financially stretched despite a good salary and dislikes fear-based selling."),
      p("Newly Married Couple", "A recently married couple combining finances and planning a household.", "They have different risk tolerances and incomplete knowledge of each other's benefits.", "Both partners must agree and want decisions explained to each of them.", "Coordinate protection around shared debts and future plans.", "Protecting the other spouse and avoiding duplicated cover motivate action.", "Know their incomes and debts but are learning beneficiaries, joint cover, and coverage gaps.", ["We are not sure joint or separate policies make sense.", "This is one more expense while we are setting up our home."], "collaborative but occasionally contradictory", "Affectionate and optimistic, with mild tension over money priorities."),
      p("New Parent", "Both parents work and recently welcomed their first child.", "Small employer policies would not cover the mortgage and childcare for long.", "Researches jointly with a partner before buying.", "Protect family income and the child's stability within a firm budget.", "Security, mortgage protection, and confidence that caregiving continues drive the purchase.", "Understands household expenses but finds coverage calculations and riders confusing.", ["Do we need to decide while everything else is so new?", "Why is our employer coverage not enough?"], "warm, thoughtful, and slightly anxious", "Sleep-deprived and emotionally sensitive to worst-case scenarios."),
      p("Homeowner", "Has owned a suburban home for nine years and has never filed a claim.", "A renewal increase arrived while a cheaper online quote is available.", "Decides with a spouse after comparing coverage and deductibles.", "Lower the premium without creating a dangerous property-coverage gap.", "Clear protection for the home and credible savings encourage renewal.", "Understands replacement value, deductibles, exclusions, and basic home risks.", ["I have never claimed, so why am I paying more?", "The other quote looks the same and costs hundreds less."], "plainspoken and price-conscious", "Annoyed by the increase and suspicious that loyalty is being punished."),
      p("Small Business Owner", "Owns a growing trade business with employees, vehicles, and customer sites.", "Coverage was assembled piecemeal and a major contract now requires evidence of limits.", "Makes the purchase with advice from an accountant and broker.", "Protect business continuity and satisfy contracts without overinsuring.", "Avoiding an uninsured loss and winning the contract are immediate motivators.", "Knows payroll, assets, contracts, and common liability exposures in the business.", ["I already carry several policies; what gap are you claiming exists?", "Higher limits could erase the margin on this new contract."], "busy, concrete, and consequence-focused", "Proud of the business and uneasy about risks that could harm employees or family finances."),
      p("Senior Citizen", "A retired homeowner living on pension income with longstanding policies.", "Renewal costs are rising and recent product changes feel confusing.", "Decides personally but involves an adult child for unfamiliar products.", "Keep essential protection predictable and understandable.", "Certainty, accessible service, and avoiding burden on family matter most.", "Understands past policies and claims experience but not newer bundled features.", ["I cannot absorb premiums that keep increasing.", "Are you replacing something I have relied on for years?"], "measured, courteous, and repetitive when uncertain", "Concerned about being rushed or taken advantage of."),
      p("High Net Worth Individual", "An entrepreneur with multiple properties, collectibles, and complex family arrangements.", "Existing policies are fragmented across carriers and jurisdictions.", "Uses advisers but personally approves material coverage and privacy decisions.", "Consolidate protection without exposing private asset details unnecessarily.", "Specialist claims handling, high limits, and coordinated coverage motivate change.", "Understands umbrella liability, valuations, trusts, specialist assets, and adviser roles.", ["Your standard wording may not address how these assets are held.", "Who sees my information, and who actually handles a complex claim?"], "discreet, precise, and expectation-heavy", "Controlled but highly protective of privacy, family, and reputation."),
      p("Existing Policy Holder", "Has held the same policy for six years and rarely contacts the insurer.", "A renewal review introduces changes and possible cross-sell coverage.", "Can renew directly but wants continuity and written confirmation.", "Confirm existing protection still represents fair value.", "Recognition of loyalty and correction of genuine gaps could retain the relationship.", "Knows personal policy history, premiums, and prior promises.", ["Why was this gap never raised in earlier reviews?", "Is this recommendation useful or just an upsell?"], "familiar, direct, and alert to inconsistency", "Moderately loyal but disappointed at feeling taken for granted."),
      p("Claim Dissatisfied Customer", "Filed a legitimate claim after a stressful loss and expected straightforward support.", "Delays and repeated document requests have damaged trust.", "Can escalate, complain, or move policies after resolution.", "Get a clear, fair resolution and accountability for the delay.", "Ownership, a credible timeline, and being treated with dignity matter more than a new product.", "Knows claim dates, documents submitted, policy wording, and prior contact promises.", ["I have already explained this three times.", "Why should I trust another promise from your company?"], "frustrated, specific, and quick to challenge scripts", "Upset by the original loss and angry that the process has prolonged it."),
    ],
  },
  {
    id: "banking-financial-services", name: "Banking & Financial Services", description: "Responsible financial conversations for everyday, credit, investment, and wealth needs.", offering: "banking and financial services", representativeRole: "Financial services relationship manager",
    profiles: [
      p("Student", "Studies full time, works part time, and is opening a first independent account.", "Income varies and international or digital payments are common.", "Chooses personally, often comparing recommendations with friends or parents.", "Avoid fees while building sound financial habits.", "Simple mobile banking, low minimums, and fraud protection matter.", "Knows apps and digital payments but little about overdrafts, interest, or credit reporting.", ["What fees could hit me when my balance is low?", "I do not want an account that becomes expensive after graduation."], "casual, quick, and question-heavy", "Excited by independence and nervous about making an expensive mistake."),
      p("Salaried Employee", "Receives a regular salary and manages rent, bills, and family transfers.", "Wants savings automation and better everyday account value.", "Makes routine decisions independently.", "Organize cash flow and build an emergency reserve.", "Convenience, reliability, and useful interest or rewards motivate switching.", "Understands salary credits, recurring payments, basic deposits, and card use.", ["Switching all my payments sounds painful.", "The advertised benefit seems full of conditions."], "practical, time-conscious, and comparison-oriented", "Stable but frustrated that income never seems to turn into savings."),
      p("Freelancer", "Earns irregular income from several domestic and overseas clients.", "Payment timing, taxes, and personal-business separation are persistent problems.", "Decides independently with occasional accountant input.", "Smooth volatile cash flow and reduce payment friction.", "Fast receipts, low foreign-exchange cost, and flexible reserves are valuable.", "Understands invoices, payment platforms, tax set-asides, and lean months.", ["Your income requirements assume a normal salary.", "How much do I lose on international payments and conversion?"], "independent, detail-seeking, and skeptical of rigid rules", "Proud of autonomy but anxious when institutions treat irregular income as instability."),
      p("Small Business Owner", "Runs a profitable local company with twelve staff and seasonal working-capital needs.", "The current bank is slow on service and credit decisions.", "Chooses with the co-owner and accountant.", "Secure reliable banking and flexible access to working capital.", "Fast support, predictable liquidity, and fewer payment disruptions protect the business.", "Knows cash conversion, payroll, merchant fees, guarantees, and seasonal forecasts.", ["I cannot move banking and then wait weeks for decisions.", "What personal guarantee and covenants are you expecting?"], "busy, commercially astute, and impatient", "Feels personally responsible for payroll and deeply dislikes administrative delays."),
      p("Loan Applicant", "A salaried borrower seeking financing for a major purchase.", "Has a deadline and is comparing approval odds and total repayment.", "Makes the commitment jointly if household finances are affected.", "Obtain affordable credit with clear terms and a realistic payment.", "Certainty of approval and manageable total cost drive the choice.", "Knows income, debts, credit score range, deposit, and advertised rates.", ["Is that the rate I will actually receive?", "What fees or penalties appear outside the monthly payment?"], "focused, candid, and sensitive to judgment", "Hopeful about the purchase and worried that rejection will derail plans."),
      p("Credit Card Prospect", "Uses debit today and is considering a card for travel and credit building.", "Several rewards offers look attractive but difficult to compare.", "Chooses personally after reviewing terms online.", "Gain useful benefits without falling into expensive debt.", "Fraud protection, rewards, and responsible credit building motivate interest.", "Understands annual fees and rewards basics but not grace periods or utilization.", ["Are the rewards worth the annual fee after the first year?", "How quickly does interest apply if I make a mistake?"], "curious, numerical, and cautious", "Tempted by benefits but wary of stories about revolving debt."),
      p("First-Time Investor", "Has built an emergency fund and wants to invest beyond deposits.", "Market volatility and unfamiliar products make the first step intimidating.", "Decides independently but may seek family reassurance.", "Start a diversified long-term plan at an understandable risk level.", "Beating inflation and reaching future goals motivate action.", "Knows basic stocks and funds but not fees, allocation, or tax consequences.", ["What if I invest just before the market falls?", "How do I know your recommendation is not driven by commission?"], "thoughtful, tentative, and eager for plain language", "Excited to progress financially but afraid of losing hard-earned savings."),
      p("Retired Customer", "Relies on pension income and accumulated savings for living costs.", "Low deposit returns are prompting a review, but capital loss is unacceptable.", "Decides with a spouse and keeps adult children informed.", "Generate dependable income while preserving accessible capital.", "Predictability, liquidity, and trusted service matter more than maximum return.", "Understands household expenses, maturity dates, and past deposit products.", ["I cannot earn this money back if the value falls.", "How quickly can I access funds in an emergency?"], "deliberate, courteous, and risk-focused", "Protective of independence and uneasy about outliving savings."),
      p("Wealth Management Client", "Has concentrated business wealth, investments, trusts, and cross-border family needs.", "A liquidity event has created tax, allocation, and succession decisions.", "Coordinates a lawyer, tax adviser, and family before mandates.", "Preserve wealth and create a coherent multigenerational plan.", "Integrated advice, discretion, and access to specialist capability motivate engagement.", "Understands portfolios, alternatives, tax structures, liquidity, and fiduciary concerns.", ["How are your incentives aligned when products come from your own platform?", "Who coordinates tax and estate consequences across jurisdictions?"], "precise, reserved, and strategically probing", "Calm in manner but acutely aware that errors could affect several generations."),
    ],
  },
  {
    id: "real-estate", name: "Real Estate", description: "High-stakes property conversations with buyers, tenants, sellers, and investors.", offering: "a property transaction", representativeRole: "Real estate adviser",
    profiles: [
      p("First-Time Home Buyer", "A couple with stable jobs, savings for a deposit, and no purchase experience.", "They are viewing homes while trying to understand financing and closing steps.", "Both buyers decide, subject to lender approval and inspection.", "Find an affordable home without overlooking costly risks.", "Stability, building equity, and having their own space motivate the search.", "Know online listings and mortgage estimates but little about contingencies and inspections.", ["How do we know we are not overpaying?", "What costs and defects could appear after our offer?"], "enthusiastic, tentative, and detail-hungry", "Excited by homes but intimidated by irreversible financial commitments."),
      p("Property Investor", "Owns several rentals and evaluates purchases as financial assets.", "Seeking the next acquisition while rates and maintenance costs pressure returns.", "Can decide quickly after financial and legal diligence.", "Achieve risk-adjusted yield with a credible exit path.", "Cash flow, appreciation, and portfolio diversification drive interest.", "Understands cap rates, vacancy, leverage, tenant demand, and maintenance reserves.", ["Your yield ignores vacancy and realistic operating costs.", "What makes this exit liquid if the local market softens?"], "analytical, brisk, and unmoved by lifestyle selling", "Competitive and alert to being shown optimistic numbers."),
      p("Luxury Buyer", "A private executive buying an additional high-value residence.", "Expects discreet access and is comparing rare properties across locations.", "Decides with family and professional advisers.", "Secure an exceptional property with privacy and flawless execution.", "Scarcity, craftsmanship, lifestyle fit, and service quality motivate purchase.", "Understands premium locations, bespoke finishes, title diligence, and privacy concerns.", ["Why is this genuinely scarce rather than merely expensive?", "How will you protect our identity and manage an off-market process?"], "understated, selective, and exacting", "Interested but unwilling to display urgency or tolerate ordinary service."),
      p("Commercial Buyer", "Owns a growing business and is considering premises rather than renewing a lease.", "The site must support operations, staff access, and future expansion.", "Leads the decision with lender, lawyer, and operations input.", "Acquire property that works operationally and financially.", "Control, capacity, and long-term occupancy economics motivate ownership.", "Understands zoning, loading, access, fit-out, financing, and business interruption.", ["The building looks right, but can the use and expansion actually be approved?", "The fit-out and downtime could destroy the economics."], "businesslike, site-specific, and probing", "Under time pressure because the current lease decision is approaching."),
      p("Tenant", "A working renter searching within a strict monthly budget.", "Needs a dependable home near work and has experienced poor maintenance before.", "Decides personally, subject to application approval.", "Secure a habitable, fairly priced home with clear lease terms.", "Location, safety, responsive maintenance, and predictable costs matter.", "Understands deposits, rent, basic lease terms, and tenant responsibilities.", ["What charges sit on top of the advertised rent?", "Who actually responds when something breaks?"], "direct, observant, and guarded", "Tired of competitive viewings and worried about being trapped with an unresponsive landlord."),
      p("Property Seller", "Has owned a family home for fifteen years and is selling for a life transition.", "Needs a credible valuation and timing plan while still living in the property.", "Decides with a spouse and wants control over price changes.", "Sell at a defensible price with minimal disruption.", "Strong net proceeds, certainty, and sensitive handling of the home motivate instruction.", "Knows neighborhood sales and improvements but may overvalue emotional features.", ["Another agent suggested a much higher list price.", "Why should I pay this commission and accept your marketing plan?"], "emotionally invested, comparative, and occasionally defensive", "Nostalgic about the home and anxious about strangers judging it."),
      p("Relocating Family", "A family moving for work with children and a compressed timeline.", "They must choose remotely while coordinating school, commute, and sale of the old home.", "Both parents decide and children influence neighborhood fit.", "Land in a suitable home without destabilizing family routines.", "School continuity, safety, commute, and transaction certainty drive action.", "Know their family needs but rely on local guidance for neighborhoods and timing.", ["How can we trust a neighborhood decision from video tours?", "What happens if our old home does not close on time?"], "collaborative, hurried, and family-focused", "Stressed by overlapping logistics and sensitive to the children's uncertainty."),
      p("NRI / Overseas Buyer", "Lives abroad and is considering property for investment or a future return.", "Cannot attend every viewing and must navigate remote documentation and transfers.", "Decides with family and local legal or tax advisers.", "Complete trustworthy remote diligence and ownership setup.", "Diversification, family connection, and future use motivate the purchase.", "Understands the broad market but needs clarity on title, taxation, remittance, and management.", ["How do I verify title and condition without being there?", "What tax, transfer, and property-management obligations am I missing?"], "careful, documentation-led, and timezone-conscious", "Interested but acutely worried about fraud and loss of control at a distance."),
    ],
  },
  {
    id: "telecommunications", name: "Telecommunications", description: "Connectivity sales for consumers, families, businesses, and enterprise buyers.", offering: "connectivity and telecom services", representativeRole: "Telecommunications sales consultant",
    profiles: [
      p("Existing Subscriber", "Has used the provider for years across mobile and home services.", "The contract is ending and recent price rises have prompted a review.", "Can renew or leave after comparing retention terms.", "Receive fair renewal value without service disruption.", "Recognition, reliable coverage, and a transparent price encourage retention.", "Knows actual bills, usage, dead zones, and past support history.", ["Why does a new customer get a better price than I do?", "What changes after the promotional period?"], "familiar, assertive, and evidence-based", "Feels loyalty has not been reciprocated."),
      p("New Customer", "Is setting up service at a new address and comparing providers.", "Needs connectivity ready by move-in for work and entertainment.", "Chooses personally after checking coverage and installation dates.", "Get dependable service installed on time at a clear price.", "Coverage confidence, quick activation, and simple plans motivate selection.", "Knows expected use and advertised speeds but not network or contract nuances.", ["Is that speed typical at my address or just the maximum?", "What installation and equipment charges are not in the headline price?"], "curious, practical, and deadline-aware", "Optimistic about the move but anxious about being offline."),
      p("Family Plan Customer", "Manages connectivity for two adults and several children.", "Bills are rising as devices and data use grow.", "Makes the plan choice with a partner while balancing children's needs.", "Control cost and usage without creating constant family conflict.", "Shared data, parental controls, and predictable billing matter.", "Knows each line's usage, upgrade dates, and common streaming habits.", ["Will one heavy user slow or penalize everyone?", "The savings disappear if every useful feature costs extra."], "warm, pragmatic, and occasionally distracted", "Frustrated by bills and by negotiating device expectations at home."),
      p("Business Owner", "Runs a small company whose calls, payments, and cloud tools depend on connectivity.", "Recent outages disrupted customers and staff.", "Makes the final decision with an office manager or IT contractor.", "Protect revenue with reliable service and responsive support.", "Uptime, failover, and fast issue ownership outweigh a small price difference.", "Understands business impact, peak use, locations, and basic redundancy.", ["A consumer-grade promise is not enough for my business.", "Who answers and what compensation applies when service fails?"], "busy, consequence-led, and impatient with scripts", "Angry about prior lost revenue and worried about reputation."),
      p("Enterprise IT Buyer", "Leads network sourcing for a distributed enterprise with formal governance.", "A WAN and mobile contract is approaching renewal across many sites.", "Runs technical evaluation; security, procurement, and executives approve.", "Standardize secure connectivity with measurable service performance.", "Resilience, observability, managed operations, and commercial scale drive value.", "Understands SD-WAN, SLAs, redundancy, security, provisioning, and carrier diversity.", ["Your coverage map does not prove performance at our critical sites.", "How do you govern incidents and chronic SLA failure across regions?"], "technical, formal, and exacting", "Calm but accountable for a visible, high-risk migration."),
      p("Rural Customer", "Lives and works outside a major urban area where options are limited.", "Current service is inconsistent and affects education, work, and access.", "Household decides based on verified local performance.", "Obtain dependable connectivity rather than impressive theoretical speed.", "Coverage, weather resilience, data allowance, and repair access matter.", "Knows local terrain, real signal spots, outages, and neighbors' experiences.", ["Your map says covered, but that has not matched reality here.", "How long will repairs take this far from town?"], "plainspoken, patient, and locally informed", "Skeptical after repeated promises and frustrated at being treated as an edge case."),
      p("Customer Planning to Switch Providers", "Has compared alternatives after recurring service or billing problems.", "A competing offer is ready and the customer is close to porting out.", "Can switch immediately but may stay if root issues are credibly fixed.", "Leave cleanly or receive a convincing resolution, not a temporary discount.", "Restored reliability, transparent billing, and ownership could prevent churn.", "Knows contract dates, complaint history, porting steps, and competitor terms.", ["I have already given you several chances to fix this.", "Why is this offer available only when I threaten to leave?"], "frustrated, concise, and resistant to retention scripts", "Trust is low and patience is nearly exhausted."),
    ],
  },
  {
    id: "retail", name: "Retail", description: "Customer-led selling across different shopping intentions and value perceptions.", offering: "a retail purchase", representativeRole: "Retail sales specialist",
    profiles: [
      p("First-Time Visitor", "Has never shopped with the retailer and does not understand the range.", "Entered with a broad need but no preferred product.", "Makes a personal purchase after gaining confidence.", "Orient quickly and find a product that genuinely fits.", "Clear guidance and a low-pressure experience create trust.", "Knows the need and budget but not store-specific brands or policies.", ["I am only looking; I do not want to be pushed.", "How do I know this is the right option rather than the one you want to sell?"], "polite, exploratory, and hesitant", "Curious but alert to being overwhelmed or judged."),
      p("Returning Customer", "Bought previously and returns with expectations shaped by that experience.", "Needs a related or replacement product and remembers prior advice.", "Can buy today if continuity and fit are clear.", "Build on the previous purchase without repeating research.", "Familiar service, compatibility, and saved time motivate return.", "Knows the existing product, how it performed, and the retailer's basic policies.", ["This recommendation conflicts with what I was told last time.", "Will it definitely work with what I already own?"], "familiar, specific, and expectation-conscious", "Generally positive but disappointed by inconsistency."),
      p("Bargain Hunter", "Tracks promotions and compares prices across stores and online.", "Wants a needed product but is willing to wait for the right deal.", "Decides personally based on total value.", "Get the lowest defensible total cost without buying junk.", "A genuine discount, price match, or durable value prompts action.", "Knows advertised prices, coupons, bundles, and common pricing tactics.", ["I found what looks identical for less.", "Is this a real discount or was the reference price inflated?"], "quick, transactional, and playful when negotiating", "Enjoys finding value and hates feeling manipulated."),
      p("Premium Shopper", "Buys selectively and values materials, design, and service.", "Is replacing a high-quality item and expects the upgrade to be meaningful.", "Can decide independently but will not compromise to buy today.", "Find exceptional quality with confidence in aftercare.", "Craftsmanship, scarcity, fit, and attentive service justify the premium.", "Understands premium materials, brand differences, warranties, and care.", ["What specifically makes this better, not just more expensive?", "How will you handle it if the product or service falls short?"], "calm, discerning, and understated", "Enjoys the experience but is sensitive to performative flattery."),
      p("Impulse Buyer", "Was not planning a purchase but noticed something immediately appealing.", "Interest is high while practical need and budget are unclear.", "Can buy personally in the moment.", "Decide quickly whether the excitement will survive after leaving.", "Novelty, immediate enjoyment, and easy ownership drive action.", "Knows little beyond first impressions and visible features.", ["Do I actually need this, or am I getting carried away?", "Can I return it easily if I regret the purchase?"], "animated, spontaneous, and self-questioning", "Excited and tempted, with a flicker of guilt about spending."),
      p("Loyal Customer", "Shops regularly, knows staff and products, and participates in rewards.", "Returns expecting recognition and consistent value.", "Often buys quickly but notices changes in treatment or quality.", "Maintain a trusted shopping relationship and receive relevant value.", "Recognition, reliability, early access, and fair rewards sustain loyalty.", "Knows past prices, product history, reward rules, and usual service standards.", ["Why are my loyalty benefits worse than this new-customer offer?", "The quality does not feel as consistent as it used to."], "friendly, candid, and personally invested", "Attached to the brand but hurt when loyalty feels invisible."),
      p("Product Comparison Shopper", "Has researched several specific models and arrives with a shortlist.", "Needs help resolving trade-offs that specifications alone do not answer.", "Can buy once claims and fit are validated.", "Choose the strongest option for actual use, not the longest feature list.", "Evidence, demonstrations, and a clear comparison reduce decision risk.", "Knows major specifications, reviews, competitor claims, and price ranges.", ["That feature sounds good, but when would I actually notice it?", "Reviews raise a reliability issue you have not mentioned."], "analytical, precise, and willing to challenge", "Interested but mentally fatigued from too much conflicting information."),
    ],
  },
  {
    id: "recruitment-hr", name: "Recruitment & HR", description: "Talent solution sales to leaders responsible for hiring outcomes.", offering: "recruitment and HR services", representativeRole: "Talent solutions consultant",
    profiles: [
      p("Startup Founder", "Leads an early-stage company and personally interviews critical hires.", "A delayed engineering or sales hire is constraining growth.", "Makes the final decision but involves the functional lead.", "Fill a critical role quickly without diluting culture or equity.", "Access to scarce candidates and saved founder time motivate help.", "Understands role outcomes and culture, but has an immature hiring process.", ["Agencies have sent polished candidates who cannot work in a startup.", "Your fee is difficult to justify before our next funding milestone."], "fast, candid, and instinctive", "Urgent and stretched, but protective of the team being built."),
      p("Hiring Manager", "Owns a team target and has hired before with mixed results.", "The vacancy is increasing workload and delaying delivery.", "Selects the candidate while HR governs process and offer.", "Hire someone productive, credible, and suited to the team.", "Candidate quality and reduced interview waste matter most.", "Knows technical or functional requirements and the cost of a bad hire.", ["Your shortlist may match keywords but not the actual work.", "I do not have time for another round of weak interviews."], "specific, impatient, and example-driven", "Under deadline pressure and frustrated with the current pipeline."),
      p("HR Manager", "Runs people operations for a mid-sized company with limited recruiting capacity.", "Hiring demand has spiked while compliance and candidate experience remain HR's responsibility.", "Evaluates providers; finance and hiring leaders influence approval.", "Create a consistent, fair process without overwhelming HR.", "Process relief, candidate care, and compliance confidence motivate purchase.", "Understands policies, employment risk, onboarding, and stakeholder friction.", ["How will you represent our company consistently to candidates?", "I cannot create more administration for my team."], "empathetic, organized, and policy-aware", "Feels caught between demanding managers and disappointed candidates."),
      p("Talent Acquisition Lead", "Leads an internal recruiting team measured on quality, speed, and source performance.", "Specialist roles are aging while agency spend rises.", "Can add vendors within governance and owns operational adoption.", "Improve pipeline quality and recruiter productivity with measurable evidence.", "Better sourcing reach and clean analytics can justify change.", "Understands funnels, time-to-fill, source quality, ATS integration, and employer brand.", ["How is your candidate pool different from channels we already use?", "Show me attribution and quality, not just application volume."], "data-literate, direct, and recruiter-savvy", "Professionally skeptical and protective of the internal team's credibility."),
      p("Growing SME Owner", "Owns a 120-person company where informal hiring no longer scales.", "Rapid growth has produced inconsistent interviews and several regrettable hires.", "Makes final budget decisions with an HR generalist.", "Professionalize hiring while preserving speed and company character.", "Fewer bad hires and less management time lost would protect growth.", "Knows the business and people personally but lacks formal talent infrastructure.", ["I do not want a corporate process that slows every hire.", "Will you understand our culture beyond a job description?"], "plainspoken, entrepreneurial, and relationship-led", "Proud of growth and worried the company is losing its close-knit identity."),
      p("Enterprise HR Director", "Owns talent strategy across regions in a highly governed enterprise.", "Leadership wants standardized hiring outcomes and reduced vendor fragmentation.", "Sponsors the program; procurement, legal, IT, and regional HR approve.", "Scale consistent talent acquisition with governance and local flexibility.", "Risk control, workforce insight, and enterprise efficiency drive the business case.", "Understands global process, privacy, works councils, integrations, and change management.", ["How do you standardize without breaking local legal and market needs?", "A pilot result does not prove you can govern at our scale."], "formal, strategic, and politically aware", "Calm but conscious that failed transformation would be highly visible."),
    ],
  },
  {
    id: "digital-marketing-agency", name: "Digital Marketing Agency", description: "Outcome-focused agency conversations with owners and marketing leaders.", offering: "digital marketing services", representativeRole: "Digital agency business development manager",
    profiles: [
      p("Restaurant Owner", "Runs a busy independent restaurant and manages marketing between operations tasks.", "Weekday bookings are soft despite spending on social posts and promotions.", "Makes the decision personally with input from the manager.", "Increase profitable local bookings without constant content work.", "Filled tables, repeat visits, and trackable promotion value motivate spend.", "Knows covers, average check, busy periods, delivery apps, and local reviews.", ["Likes and impressions do not pay my food and labor costs.", "I cannot discount my way into being busy."], "energetic, interrupted, and numbers-conscious", "Passionate about the restaurant and stressed by thin margins."),
      p("Clinic Owner", "Operates a private clinic where reputation and patient trust are essential.", "Wants sustainable patient growth without making inappropriate claims.", "Approves marketing with clinical and compliance input.", "Attract suitable patients while protecting professional credibility.", "Qualified appointments, educational visibility, and reputation drive investment.", "Understands referral patterns, patient journeys, privacy, and advertising restrictions.", ["How will you avoid misleading claims or cheapening the clinic?", "I need to know where booked patients came from, not just leads."], "careful, professional, and ethics-led", "Ambitious for the practice but anxious about reputational harm."),
      p("Local Business Owner", "Runs a location-based service business dependent on calls and referrals.", "Competitors appear above the business in local search.", "Makes the decision personally within a tight monthly budget.", "Generate dependable local enquiries and improve online reputation.", "Visible maps placement, credible reviews, and booked jobs matter.", "Knows service radius, seasonality, lead quality, and customer questions.", ["I have paid agencies before and could not tell what they did.", "More leads are useless if they are outside my area or just price shopping."], "plainspoken, skeptical, and anecdotal", "Frustrated by opaque vendors and protective of hard-earned cash."),
      p("Ecommerce Brand Owner", "Built a direct-to-consumer brand and closely monitors unit economics.", "Paid acquisition has become less efficient while growth targets remain.", "Controls spend with a small internal team.", "Restore profitable growth across acquisition and retention.", "Better contribution margin, conversion, and repeat purchase motivate a partnership.", "Understands CAC, LTV, ROAS, attribution, conversion, creative testing, and inventory.", ["Your ROAS claim ignores discounts, returns, and margin.", "How will you test without burning budget or exhausting our audience?"], "fast, metric-heavy, and experimentation-minded", "Driven by growth but tense about cash tied up in inventory."),
      p("Startup Founder", "Leads a funded startup seeking repeatable demand before the next round.", "Several channels have produced activity but no predictable pipeline.", "Owns the decision with a growth lead and investors watching burn.", "Find a repeatable acquisition motion before runway tightens.", "Fast learning, credible pipeline, and investor-ready evidence motivate action.", "Understands funnel basics, runway, experiments, and product-market uncertainty.", ["An agency cannot manufacture product-market fit.", "I need learning speed, not a long retainer and vanity metrics."], "rapid, hypothesis-driven, and blunt", "Optimistic publicly but privately anxious about the next milestone."),
      p("Marketing Manager", "Manages campaigns with a small internal team and reports results to sales and finance.", "Execution capacity is stretched and channel reporting is fragmented.", "Recommends the agency; a director or procurement approves.", "Add specialist execution while retaining control and clear attribution.", "Reliable delivery, transparent reporting, and team extension motivate selection.", "Understands briefs, channels, budgets, brand rules, attribution, and stakeholder reporting.", ["How will you work with my team instead of creating another coordination layer?", "I need to defend results when sales disputes your attribution."], "collaborative, informed, and deadline-driven", "Wants support but fears being blamed if an agency underperforms."),
      p("Corporate Brand Manager", "Stewards a recognized brand across campaigns, agencies, and markets.", "A new initiative needs reach without fragmenting brand meaning.", "Leads evaluation within procurement, legal, and executive governance.", "Deliver measurable impact while protecting long-term brand equity.", "Strategic creativity, consistency, safety, and credible measurement motivate engagement.", "Understands brand architecture, research, media, approvals, rights, and reputation risk.", ["Your performance idea may produce clicks while weakening the brand.", "How will you govern quality and brand safety across every market?"], "polished, strategic, and constructively demanding", "Excited by creative possibility but highly alert to public missteps."),
    ],
  },
  {
    id: "manufacturing", name: "Manufacturing", description: "Industrial sales grounded in production, procurement, plant, and supply realities.", offering: "a manufacturing solution", representativeRole: "Industrial account manager",
    profiles: [
      p("Factory Owner", "Owns a family manufacturing business and reinvests profits cautiously.", "Demand is growing, but downtime and cash commitments could threaten the business.", "Makes final capital decisions with plant and finance input.", "Increase capacity and resilience with a safe payback.", "More output, lower waste, and business continuity motivate investment.", "Knows margins, customers, equipment constraints, labor, and cash cycles.", ["I cannot risk the plant on an unproven change.", "When does this pay back using conservative production numbers?"], "plainspoken, decisive, and experience-led", "Proud of the factory and personally afraid of jeopardizing family wealth."),
      p("Procurement Manager", "Sources materials and equipment under cost, quality, and continuity targets.", "An incumbent supplier is reliable but pricing and lead times are under review.", "Owns commercial evaluation with engineering and quality approval.", "Improve total value without creating supply risk.", "Stable supply, defensible cost, and balanced terms motivate change.", "Understands specifications, PPV, MOQ, lead time, supplier qualification, and contracts.", ["Your unit price does not include our qualification and switching cost.", "What protects us if your lead time or quality slips?"], "controlled, comparative, and negotiation-focused", "Professionally guarded and unwilling to own an avoidable supply failure."),
      p("Operations Head", "Oversees multiple plants and is accountable for service, cost, and standardization.", "Performance varies by site and local workarounds hide root causes.", "Sponsors network initiatives with plant leaders and finance.", "Raise network performance without imposing an impractical central model.", "Consistent throughput, visibility, and scalable best practice drive interest.", "Understands OEE, capacity, labor, service levels, and site politics.", ["A single-site success does not prove this works across our network.", "How will you get plant leaders to adopt a standard they did not choose?"], "strategic, direct, and cross-functional", "Under executive pressure and cautious about provoking resistance at plants."),
      p("Plant Manager", "Runs a high-volume facility and is measured daily on safety, quality, output, and cost.", "Recurring stoppages threaten this quarter's production plan.", "Can sponsor operating changes; capital and technical teams approve.", "Restore dependable output without compromising safety.", "Uptime, quick implementation, and operator acceptance motivate action.", "Understands equipment, shifts, bottlenecks, maintenance, OEE, and safety procedures.", ["You are describing ideal conditions, not my plant.", "I cannot give you a shutdown window without a proven plan."], "brisk, practical, and shop-floor grounded", "Under intense daily pressure and protective of operators."),
      p("Supply Chain Director", "Owns planning, suppliers, inventory, and customer availability across the network.", "Volatility has created excess stock in some items and shortages in others.", "Leads selection with procurement, operations, IT, and finance.", "Improve resilience and working capital without reducing service.", "Visibility, scenario planning, and shorter recovery time motivate change.", "Understands forecast error, safety stock, lead times, S&OP, and supplier risk.", ["Better forecasts alone will not fix unreliable supply.", "Where has this reduced inventory without hurting fill rate?"], "analytical, systems-oriented, and challenging", "Tired of firefighting and conscious that every trade-off has a vocal owner."),
      p("Production Head", "Leads production planning and execution across shifts and product lines.", "Schedule changes and material constraints cause overtime and missed output.", "Influences process and technology choices with operations and planning.", "Create an executable production plan that survives daily disruption.", "Stable schedules, faster changeovers, and clear priorities motivate adoption.", "Understands routings, constraints, changeovers, WIP, yield, and shift capability.", ["Your plan assumes materials and machines behave perfectly.", "Supervisors will reject it if they cannot override real-world exceptions."], "detailed, pragmatic, and scenario-driven", "Frustrated by plans that look good centrally but fail on the floor."),
    ],
  },
  {
    id: "logistics-supply-chain", name: "Logistics & Supply Chain", description: "Sales to professionals moving, storing, importing, and distributing goods.", offering: "a logistics or supply-chain solution", representativeRole: "Supply-chain solutions consultant",
    profiles: [
      p("Warehouse Manager", "Runs a busy distribution center with seasonal labor and tight dispatch cutoffs.", "Mis-picks and congestion are rising as order profiles change.", "Evaluates operational fit; operations and finance approve investment.", "Improve accuracy and throughput without disrupting live operations.", "Less rework, safer workflows, and usable tools motivate change.", "Understands pick paths, WMS, labor standards, dock flow, inventory accuracy, and peaks.", ["Your productivity estimate ignores our actual order mix.", "How do we implement while the warehouse keeps shipping?"], "practical, fast, and floor-focused", "Under daily pressure and defensive of workers blamed for system problems."),
      p("Import/Export Business Owner", "Owns a trading company coordinating suppliers, customs, and customers across borders.", "Delays and changing freight costs are eroding margin and trust.", "Makes provider decisions with a customs adviser or finance manager.", "Gain predictable landed cost and shipment control.", "Reliable transit, documentation accuracy, and proactive exception handling matter.", "Understands Incoterms, duties, documents, routes, demurrage, and currency exposure.", ["Your quote will be useless if surcharges appear later.", "Who owns the problem when customs holds the shipment?"], "entrepreneurial, detail-alert, and phone-oriented", "Frustrated by surprises and worried about disappointing key customers."),
      p("Procurement Manager", "Buys logistics and supply services across lanes and facilities.", "Contracts are fragmented and service performance is inconsistent.", "Runs sourcing while operations validate feasibility.", "Secure competitive total cost with enforceable service.", "Consolidated visibility, leverage, and reliable capacity motivate the tender.", "Understands rate cards, accessorials, tendering, SLAs, claims, and capacity commitments.", ["Your base rate hides accessorial and peak charges.", "What capacity is actually committed when the market tightens?"], "formal, comparative, and commercially firm", "Guarded because optimistic bids often become operational disputes."),
      p("Distributor", "Supplies retailers and depends on availability, margin, and delivery reliability.", "Stockouts and late inbound shipments are causing lost shelf space.", "Chooses logistics partners with sales and finance input.", "Protect availability and distributor margin.", "Accurate replenishment and dependable delivery retain retail accounts.", "Understands fill rate, inventory turns, channel margins, order cycles, and claims.", ["I cannot sell visibility to a retailer with an empty shelf.", "Who pays when damage or delay costs me the account?"], "relationship-led, commercial, and consequence-focused", "Personally invested in retailer trust and angry about preventable failures."),
      p("Ecommerce Operations Manager", "Runs fulfillment and returns for a fast-growing online retailer.", "Volume spikes and delivery promises are straining current partners.", "Leads operational selection with CX, technology, and finance.", "Scale fulfillment while protecting customer experience and unit economics.", "Fast accurate delivery, flexible capacity, and clean integrations drive value.", "Understands OMS/WMS links, pick-pack cost, carrier mix, returns, and delivery metrics.", ["Your average delivery time hides the tail where complaints happen.", "Can your operation absorb a promotion without throttling orders?"], "metric-heavy, urgent, and customer-focused", "Excited by growth but exhausted by exceptions and public complaints."),
      p("Retail Supply Chain Manager", "Manages replenishment across stores and distribution centers.", "Promotions and forecast shifts produce both stockouts and markdowns.", "Influences providers and systems with merchandising, logistics, and finance.", "Improve on-shelf availability without inflating inventory.", "Better allocation, dependable inbound flow, and exception visibility motivate change.", "Understands OTIF, store constraints, forecasts, promotions, allocation, and markdown risk.", ["Your model does not account for local store demand and promotion changes.", "Show how availability improves without simply holding more stock."], "analytical, cross-functional, and trade-off conscious", "Frustrated by being blamed for both empty shelves and excess inventory."),
    ],
  },
  {
    id: "hospitality-travel", name: "Hospitality & Travel", description: "Travel and hospitality selling for operators, planners, agencies, and guests.", offering: "a hospitality or travel service", representativeRole: "Hospitality and travel consultant",
    profiles: [
      p("Hotel Manager", "Runs a full-service hotel and balances guest experience with operating margin.", "Occupancy varies while labor pressure and online reviews remain intense.", "Evaluates solutions with ownership, revenue, and operations teams.", "Improve guest satisfaction and profitability without burdening staff.", "Occupancy, direct bookings, efficient operations, and review scores drive interest.", "Understands ADR, RevPAR, occupancy, distribution, staffing, and guest recovery.", ["A feature is useless if front-desk staff cannot use it during a rush.", "How does this improve profit rather than just add another fee?"], "hospitable, operational, and numbers-aware", "Warm professionally but tired from constant service recovery."),
      p("Resort Owner", "Owns a destination resort with seasonal demand and a strong personal brand vision.", "Needs to grow premium bookings without losing the property's character.", "Makes final investment decisions with the general manager.", "Increase profitable demand while preserving a distinctive guest experience.", "Longer stays, premium spend, repeat guests, and reputation motivate change.", "Understands seasonality, packages, amenities, staffing, channels, and destination competition.", ["Your standard package could make us look like every other resort.", "What happens in low season when the economics are weakest?"], "vision-led, personal, and commercially sharp", "Proud and emotionally attached to the property."),
      p("Restaurant Owner", "Owns a restaurant where private events and guest volume affect thin margins.", "Considering a hospitality service or partnership to drive bookings and operations.", "Decides personally with the restaurant manager.", "Grow profitable covers without compromising service quality.", "Bookings, repeat guests, operational simplicity, and reputation matter.", "Understands table turns, average spend, food cost, staffing, and reviews.", ["I cannot add demand at times when the kitchen is already stretched.", "Show me net value after fees, discounts, and no-shows."], "animated, practical, and frequently interrupted", "Passionate about guests and stressed by margins and staffing."),
      p("Corporate Travel Manager", "Manages travel policy, suppliers, traveler safety, and spend for an enterprise.", "The program needs better adoption and visibility across regions.", "Leads evaluation with procurement, security, finance, and travelers.", "Control spend and duty of care without making travel unworkable.", "Policy compliance, service, data, and disruption response motivate selection.", "Understands TMC operations, policy, negotiated rates, duty of care, reporting, and leakage.", ["Savings do not matter if travelers book outside the program.", "How do you locate and support people during a major disruption?"], "formal, scenario-based, and service-demanding", "Calm but acutely responsible for traveler welfare."),
      p("Event Organizer", "Produces conferences and celebrations where many suppliers must align.", "A fixed date and guest promise leave little tolerance for failure.", "Recommends venues and suppliers; the client or committee approves.", "Deliver a memorable event with controlled risk and clear coordination.", "Reliable capacity, responsive ownership, flexibility, and contingency plans drive choice.", "Understands run sheets, room blocks, AV, catering, attrition, deposits, and contingencies.", ["Who has authority when something changes on the event day?", "These cancellation and minimum-spend terms put all the risk on us."], "energetic, detailed, and deadline-driven", "Excited creatively but carrying visible anxiety about failure."),
      p("Travel Agency Owner", "Runs an agency whose reputation depends on suppliers handling clients well.", "Seeking differentiated inventory and better support during disruptions.", "Selects partners and trains advisers personally.", "Protect client trust while growing profitable bookings.", "Commission, reliable fulfillment, distinctive products, and agent support motivate partnership.", "Understands booking systems, commissions, net rates, cancellations, and client servicing.", ["If something goes wrong, my client blames my agency, not you.", "How do your economics compare after cancellations and support time?"], "relationship-oriented, experienced, and protective", "Proud of repeat clients and wary of suppliers damaging that trust."),
      p("Family Vacation Planner", "Coordinates a rare family trip across adults and children with different needs.", "Dates, budget, safety, and convenience must all align.", "Researches options and secures agreement from the family.", "Plan an enjoyable trip without hidden logistics or budget surprises.", "Shared memories, safety, child-friendly convenience, and flexibility motivate booking.", "Knows school dates, room needs, budget, dietary issues, and family preferences.", ["The itinerary sounds exhausting with children.", "What happens if someone gets sick or plans change?"], "warm, question-heavy, and occasionally distracted", "Excited but carrying the mental load for everyone's experience."),
      p("Luxury Traveler", "Travels frequently and pays for exceptional access, comfort, and discretion.", "Planning a special journey where ordinary premium packages feel generic.", "Decides personally or with a partner and expects adviser ownership.", "Create a seamless, distinctive trip with privacy and flexibility.", "Personalization, rare access, time saved, and flawless recovery justify price.", "Understands premium cabins, leading hotels, private services, seasonality, and concierge standards.", ["This itinerary feels expensive, not genuinely personal.", "Who takes ownership at two in the morning when a connection fails?"], "understated, exacting, and experience-rich", "Enthusiastic about discovery but intolerant of performative luxury or handoffs."),
    ],
  },
] as const;

export const expandedIndustryCategories: PracticeCategory[] = industries.map((industry) => ({
  id: industry.id,
  name: industry.name,
  description: industry.description,
  archetypes: industry.profiles.map((profile, index) => createProfile(industry, profile, index)),
}));
