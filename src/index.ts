import type { MosaicTemplate, MosaicTemplateProps } from "@m0saic/types";

import { TEMPLATE_PACKS, TEMPLATE_REPO } from "./repo";
import { basicsTemplates } from "./basics";
import { inviteTemplates } from "./invite";
import { socialTemplates } from "./social";

/** The two exports every Mosaic host requires from a template repo. */
export const repo = TEMPLATE_REPO;

export const templates: MosaicTemplate<MosaicTemplateProps>[] = [
  ...basicsTemplates,
  ...inviteTemplates,
  ...socialTemplates,
];

// Library re-exports for anyone importing this repo as code. `export *`
// ONLY for template modules — never pair `export * from "./x"` with a
// named re-export of the same module (tsc double-require hazard).
export * from "./basics";
export * from "./invite";
export * from "./social";
export { TEMPLATE_PACKS, TEMPLATE_REPO };
