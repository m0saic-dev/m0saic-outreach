import type { MosaicTemplate, MosaicTemplateProps } from "@m0saic/types";

import { WhyYouV1 } from "./why-you/v1/why-you";

/** Pack `invite`, in registry order (mirrors ./registry.ts). */
export const inviteTemplates: MosaicTemplate<MosaicTemplateProps>[] = [
  WhyYouV1 as unknown as MosaicTemplate<MosaicTemplateProps>,
];

// `export *` ONLY — see the note in src/index.ts.
export * from "./why-you/v1/why-you";
