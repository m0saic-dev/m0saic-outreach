import type { LayoutConstraint } from "@m0saic/template-utils";
import type { TextFit } from "../../../_shared/text";
/**
 * `@outreach/social/hook-wall/v2` - the text layer of a short-form post: one
 * visual underneath, the hook on top, drawn the same way every render.
 *
 * ONE CONCEPT: **generate the take once, render the words many times.** A
 * generated visual is the expensive, non-repeatable half of a post. The hook
 * over it is the cheap half, and the half a team actually tests. Keep them
 * apart: the visual is a file prop, the hooks are strings, and each hook is
 * one more render - same visual, same type, same position, different words.
 *
 *   - one hook   -> the post itself, full frame (a still visual renders a
 *                   PNG slide, a video visual renders an MP4);
 *   - 2-4 hooks  -> the same post side by side, one tile per hook, under a
 *                   title: the variants compared in one frame.
 *
 * Two hook styles, the two a short-form feed is full of: `outline` (white
 * type, dark edge) and `box` (dark type on a white label). The text is
 * measured in the face it is drawn in, wrapped, balanced and kept inside the
 * platform's safe area (clear of the right-hand rail and the caption), so a
 * long hook shrinks instead of running under the interface.
 *
 * The rule that bites: **the outline is geometry, not a text effect.** The
 * svg rasterizer draws one flat colour and has no stroke. So the outlined
 * hook is the glyph path twice: once stroked (the dark edge) and once filled
 * (the white type), two masked colour tiles on the same rect, from the same
 * path - they cannot drift apart.
 *
 * v2 adds MOTION, and with it the output is a clip: the hook lands word by
 * word (or line by line, or all at once), each unit hopping up into place,
 * and when several hooks are compared the tiles start one after another.
 * Every word is its own tight rect, cut from the same fitted block, so the
 * animated hook ends on exactly the pixels the static one would have.
 * `hookMotion: "none"` is v1's behaviour: a still visual renders a PNG.
 * A long comparison steps down by itself (words -> lines -> all at once) to
 * stay inside the engine's budget of gated tiles.
 *
 * Text is Latin (the bundled Roboto). Emoji in a hook are dropped, not drawn
 * as empty boxes; an emoji layer is the obvious v2.
 */
export type HookWall2Style = "outline" | "box";
export type HookWall2Position = "top" | "middle";
export type HookWall2Motion = "words" | "lines" | "pop" | "none";
export type HookWall2Props = {
    /** Zero or one visual - an image or a video (absolute path). Empty draws a stand-in scene. */
    visual?: string[];
    /** One to four hooks. One renders the post; several render them side by side. */
    hooks?: string[];
    /** How the hook is drawn: white type with a dark edge, or dark type on a white label. */
    hookStyle?: HookWall2Style;
    /** Where the hook sits in the frame. Both keep clear of the platform's interface. */
    hookPosition?: HookWall2Position;
    /** How the hook arrives: word by word, line by line, all at once, or not at all (a still). */
    hookMotion?: HookWall2Motion;
    /** The line above the tiles when comparing. Empty removes it. */
    title?: string;
    /** The line under the tiles when comparing. Empty removes it. */
    note?: string;
    /** The tile numbers (#rrggbb). */
    accent?: string;
    /** The page behind the tiles (#rrggbb). */
    background?: string;
    /** The title and the note (#rrggbb). */
    ink?: string;
    /** Clip length in whole seconds (2..60) when the render is a clip. */
    durationSec?: number;
    /** Dev-only: check the layout contract and draw it over the frame. */
    debugLayout?: boolean;
};
export declare const HOOK_WALL2_MAX_HOOKS = 4;
export declare const HOOK_WALL2_MIN_SEC = 2;
export declare const HOOK_WALL2_MAX_SEC = 60;
export type HookWall2Rect = {
    x: number;
    y: number;
    w: number;
    h: number;
};
export type HookWall2Block = {
    fit: TextFit;
    rect: HookWall2Rect;
};
export type HookWall2Tile = {
    /** The post: 9:16 when compared, the whole canvas when alone. */
    rect: HookWall2Rect;
    /** Where the hook may be: inside the platform's safe area. */
    safe: HookWall2Rect;
    /** The fitted hook. */
    fit: TextFit;
    /** The rect the hook is drawn in (the label, in box style). */
    hook: HookWall2Rect;
    /** The tile number under the post, when compared. */
    index: HookWall2Block | null;
    /** What arrives, in order: each word, each line, or the whole block (one unit when nothing moves). */
    units: HookWall2Unit[];
};
/** One piece of a hook that arrives on its own: its text, its tight rect, and when (null = always there). */
export type HookWall2Unit = {
    text: string;
    rect: HookWall2Rect;
    atSec: number | null;
};
/** The most gated tiles one render may carry before the motion steps down (words -> lines -> pop). */
export declare const HOOK_WALL2_MAX_UNITS = 48;
/** When each unit lands: tiles start one after another, units within a tile in reading order. */
export declare function hookWall2Times(unitCounts: number[], motion: HookWall2Motion): Array<Array<number | null>>;
export type HookWall2Layout = {
    W: number;
    H: number;
    /** Two or more hooks: tiles side by side under a title. */
    wall: boolean;
    /** The dark edge of an outlined hook, in px (it grows past the glyphs by this much). */
    edge: number;
    /** The motion actually used: the one asked for, stepped down when the render would carry too many gated tiles. */
    motion: HookWall2Motion;
    title: HookWall2Block | null;
    note: HookWall2Block | null;
    tiles: HookWall2Tile[];
};
/**
 * The share of a 9:16 post a hook may use: clear of the top bar, the
 * right-hand rail and the caption block. `top` hangs the hook from the top
 * of that area; `middle` centres it in the upper two thirds.
 */
export declare const HOOK2_SAFE: {
    readonly left: 0.08;
    readonly right: 0.14;
    readonly top: 0.11;
    readonly bottom: 0.3;
};
export declare function layoutHookWall2(copy: {
    hooks: string[];
    title: string;
    note: string;
    style: HookWall2Style;
    position: HookWall2Position;
    motion: HookWall2Motion;
}, W: number, H: number): HookWall2Layout;
/**
 * What the geometry promises: a compared post is 9:16, every hook rect sits
 * inside its post, and the chrome text fits. (An outlined hook is drawn from
 * a glyph path, not a text source, so its fit is asserted in the test from
 * the measured width instead of by `textFits`.)
 */
export declare function hookWall2Contract(L: HookWall2Layout, style: HookWall2Style): LayoutConstraint[];
export declare const HookWallV2: import("@m0saic/types").MosaicTemplate<HookWall2Props, import("@m0saic/types").MosaicTemplateOutputs, import("@m0saic/types").MosaicTemplateUpstreamVariables, import("@m0saic/types").MosaicTemplateUpstreamData, import("@m0saic/types").MosaicTemplateSidecars>;
export default HookWallV2;
