import { evaluationRubricSchema } from "@/domain/evaluation/schema";

export const defaultRubric = evaluationRubricSchema.parse({
  id: "consultative-discovery-v1",
  criteria: [
    {
      id: "discovery",
      title: "Discovery",
      description: "Uses relevant open questions to uncover situation, pain, impact, and decision process.",
      maxScore: 20,
    },
    {
      id: "objection-handling",
      title: "Objection Handling",
      description: "Acknowledges concerns, explores their basis, and responds with relevant evidence or process.",
      maxScore: 20,
    },
    {
      id: "listening",
      title: "Listening",
      description: "Responds to the customer's actual words and follows important threads without rushing.",
      maxScore: 20,
    },
    {
      id: "communication",
      title: "Communication",
      description: "Communicates a concise, relevant value hypothesis without unsupported claims or jargon.",
      maxScore: 20,
    },
    {
      id: "closing",
      title: "Closing",
      description: "Earns a specific, mutually useful next step with owners and purpose.",
      maxScore: 20,
    },
  ],
});
