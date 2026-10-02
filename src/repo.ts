import type {
  MosaicTemplatePackDescriptor,
  MosaicTemplateRepoDescriptor,
} from "@m0saic/types";
import { asRepoId, asTemplateId } from "@m0saic/types";

/**
 * Who this repo is. The entry module (src/index.ts) re-exports this as
 * `repo` — one of the two exports every Mosaic host requires from an
 * external template repo (the other is `templates`).
 *
 * FORKS RENAME THEMSELVES HERE, AND ONLY HERE. Change `repoId` to your own
 * handle, update every template id's prefix to match, and rebuild — the
 * manifest generator, contract check, and dep gate all derive the expected
 * id namespace from this one field. Id ownership in a running host is
 * first-registrant-wins per id, so never squat someone else's handle.
 */
export const TEMPLATE_REPO: MosaicTemplateRepoDescriptor = {
  // Personalized outreach clips: one template, one props file per recipient.
  // The handle deliberately does not carry the m0saic name — hosts flag any
  // unsigned repo that does as "presents itself as m0saic".
  repoId: asRepoId("@outreach"),
  displayName: "Outreach",
  schemaVersion: 1,
  description:
    "Personalized outreach video as a template: an agent that already writes the cold message fills a props file per recipient (name, picture, three reasons, the pitch, the link) and m0saic renders the clip. No editing, no per-video prompt work, the same pixels for the same props.",
  curator: "qsbuilds",
  homepage: "https://github.com/m0saic-dev/m0saic-outreach",
  assets: { templatesDir: "assets/templates" },
  // The front door — the template a newcomer renders first (the hello-world
  // convention): the canonical card with this repo's subline. Point it at
  // your own template if you want your own look.
  helloWorld: asTemplateId("@outreach/basics/hello-world/v1"),
};

/**
 * Packs, in display order. One is enough to start; add more by mirroring
 * the basics/ folder (pack id = folder name = the <pack> segment of ids).
 */
export const TEMPLATE_PACKS: MosaicTemplatePackDescriptor[] = [
  {
    id: "basics",
    title: "Basics",
    description: "The front door: the canonical hello-world card.",
  },
  {
    id: "invite",
    title: "Invite",
    description:
      "Clips addressed to one person: who they are, why them, what you are offering, where to click.",
  },
  {
    id: "social",
    title: "Social",
    description:
      "The deterministic layer of a short-form post: the words over a visual that was generated somewhere else.",
  },
];
