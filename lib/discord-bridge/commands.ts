export const bridgeCommand = {
  name: "bridge",
  description:
    "Control your participation in shared KFC and WoW Forever channels",
  type: 1,
  options: [
    {
      name: "join",
      description: "Opt in to this channel pair only",
      type: 1,
    },
    {
      name: "status",
      description: "Check participation and cleanup for this channel pair",
      type: 1,
    },
    {
      name: "leave",
      description: "Stop both directions of this pair and remove your copies",
      type: 1,
    },
    {
      name: "remove",
      description: "Remove one of your shared messages and its managed replies",
      type: 1,
      options: [
        {
          name: "message",
          description: "The exact Discord source or relay message link",
          type: 3,
          required: true,
        },
      ],
    },
  ],
};

export interface EphemeralResponse {
  type: 4 | 5;
  data: {
    flags: 64;
    content?: string;
    allowed_mentions?: { parse: never[] };
    components?: {
      type: 1;
      components: { type: 2; style: 1; label: string; custom_id: string }[];
    }[];
  };
}
export function ephemeral(content: string): EphemeralResponse {
  return {
    type: 4,
    data: { content, flags: 64, allowed_mentions: { parse: [] } },
  };
}
