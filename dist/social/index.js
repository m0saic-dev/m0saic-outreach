"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialTemplates = void 0;
const hook_wall_1 = require("./hook-wall/v1/hook-wall");
const live_hooks_1 = require("./live-hooks/v1/live-hooks");
/** Pack `social`, in registry order (mirrors ./registry.ts). */
exports.socialTemplates = [
    hook_wall_1.HookWallV1,
    live_hooks_1.LiveHooksV1,
];
// `export *` ONLY — see the note in src/index.ts.
__exportStar(require("./hook-wall/v1/hook-wall"), exports);
__exportStar(require("./live-hooks/v1/live-hooks"), exports);
