import type { StarterRegistryEntry } from "../registry-types";

/**
 * Pack registry: `invite` — array order is the display order.
 */
export const inviteRegistry: StarterRegistryEntry[] = [
  {
    slug: "why-you",
    templateId: "@outreach/invite/why-you/v1",
    exportName: "WhyYouV1",
    title: "02 · Why You",
    description:
      "A personalized cold-open clip: greets one person by name and face, answers why them in three lines, pitches the brand and ends on their invite link. One props file per recipient.",
    tags: ["invite", "outreach", "personalized", "cold-open", "dm", "marketing", "agent", "video"],
  },
];
