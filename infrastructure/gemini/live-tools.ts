export const END_ROLEPLAY_TOOL_NAME = "end_roleplay";

export function createRoleplayTools() {
  return [
    {
      functionDeclarations: [
        {
          name: END_ROLEPLAY_TOOL_NAME,
          description:
            "End the roleplay after the customer has spoken one complete natural farewell. This is a silent control action and must never be narrated.",
          parametersJsonSchema: {
            type: "object",
            additionalProperties: false,
            required: ["category"],
            properties: {
              category: {
                type: "string",
                enum: [
                  "confusion",
                  "busy",
                  "wrong-person",
                  "loss-of-trust",
                  "loss-of-interest",
                  "other",
                ],
              },
            },
          },
        },
      ],
    },
  ];
}
