export type AuthorProfile = {
  id: string;
  name: string;
  role: string;
  beats: string[];
  bio: string;
  standardsNote: string;
};

export const AUTHORS: AuthorProfile[] = [
  {
    id: "combo-wick",
    name: "COMBO_WICK",
    role: "Publisher and creator-operations editor",
    beats: ["creator monetization", "publishing workflows", "platform policy"],
    bio:
      "COMBO_WICK covers the operating side of creator businesses: revenue systems, upload workflows, compliance, and the platform rules that affect independent publishers.",
    standardsNote:
      "Revenue articles are reviewed for realistic ranges, clear assumptions, and separation between editorial advice and affiliate or advertising incentives.",
  },
  {
    id: "mira-okafor",
    name: "Mira Okafor",
    role: "Creator economy analyst",
    beats: ["short-form platforms", "audience growth", "sponsorship strategy"],
    bio:
      "Mira focuses on platform monetization changes, creator rate cards, and the trade-offs between audience growth and durable revenue.",
    standardsNote:
      "Mira's articles prioritize primary platform documentation, repeatable calculations, and examples that creators can audit against their own analytics.",
  },
  {
    id: "dev-patel",
    name: "Dev Patel",
    role: "Tools and workflow reviewer",
    beats: ["creator software", "video editing", "automation tools"],
    bio:
      "Dev reviews creator tools from a practical production standpoint: stability, export quality, collaboration, pricing, and whether the tool saves time in a real workflow.",
    standardsNote:
      "Tool reviews are based on hands-on testing notes, feature checks, and the limitations a working creator would notice during normal use.",
  },
];

export function getAuthorProfile(name: string) {
  return AUTHORS.find((author) => author.name === name) ?? AUTHORS[0];
}