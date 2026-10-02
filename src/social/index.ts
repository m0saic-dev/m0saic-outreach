import type { MosaicTemplate, MosaicTemplateProps } from "@m0saic/types";

import { HookWallV1 } from "./hook-wall/v1/hook-wall";

/** Pack `social`, in registry order (mirrors ./registry.ts). */
export const socialTemplates: MosaicTemplate<MosaicTemplateProps>[] = [
  HookWallV1 as unknown as MosaicTemplate<MosaicTemplateProps>,
];

// `export *` ONLY — see the note in src/index.ts.
export * from "./hook-wall/v1/hook-wall";
