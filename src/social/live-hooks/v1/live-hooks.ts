import type {
  MosaicColor,
  MosaicDocument,
  MosaicEngineContext,
  MosaicOverlayExpr,
  MosaicSource,
} from "@m0saic/types";
import { asAssetId, asTemplateId } from "@m0saic/types";
import { circleMask, toM0String } from "@m0saic/dsl-stdlib";
import {
  bindProp,
  defineMosaicTemplate,
  definePropsSchema,
  entrance,
  makeColorTile,
  placeInsetPieces,
  resolvePinnedDurationMs,
  tag,
  textToPath,
} from "@m0saic/template-utils";
import type { LayoutConstraint } from "@m0saic/template-utils";
import { textFitsMeasured, withLayoutIntent } from "../../../_shared/layout";
import type { TextFit } from "../../../_shared/text";
import { LINE, blockH, budget, cleanCopy, facePath, fitText, widthOf } from "../../../_shared/text";

/**
 * `@outreach/social/live-hooks/v1` - the text layer of a short-form post: one
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
 * This is hook-wall with MOTION, and so the output is a clip: the hook lands word by
 * word (or line by line, or all at once), each unit hopping up into place,
 * and when several hooks are compared the tiles start one after another.
 * Every word is its own tight rect, cut from the same fitted block, so the
 * animated hook ends on exactly the pixels the static one would have.
 * `hookMotion: "none"` is hook-wall's behaviour: a still visual renders a PNG.
 * A long comparison steps down by itself (words -> lines -> all at once) to
 * stay inside the engine's budget of gated tiles.
 *
 * Text is Latin (the bundled Roboto). Emoji in a hook are dropped, not drawn
 * as empty boxes; an emoji layer is the obvious v2.
 */

export type LiveHooksStyle = "outline" | "box";
export type LiveHooksPosition = "top" | "middle";
export type LiveHooksMotion = "words" | "lines" | "pop" | "none";

export type LiveHooksProps = {
  /** Zero or one visual - an image or a video (absolute path). Empty draws a stand-in scene. */
  visual?: string[];
  /** One to four hooks. One renders the post; several render them side by side. */
  hooks?: string[];
  /** How the hook is drawn: white type with a dark edge, or dark type on a white label. */
  hookStyle?: LiveHooksStyle;
  /** Where the hook sits in the frame. Both keep clear of the platform's interface. */
  hookPosition?: LiveHooksPosition;
  /** How the hook arrives: word by word, line by line, all at once, or not at all (a still). */
  hookMotion?: LiveHooksMotion;
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

const ID = "@outreach/social/live-hooks/v1";
const HEX = /^#[0-9a-fA-F]{6}$/;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv)$/i;

export const LIVE_HOOKS_MAX_HOOKS = 4;
export const LIVE_HOOKS_MIN_SEC = 2;
export const LIVE_HOOKS_MAX_SEC = 60;

const DEFAULTS = {
  hooks: [
    "nobody told me it could be this easy",
    "POV: you finally stopped doing this by hand",
    "3 things I wish I knew a year ago",
  ],
  hookStyle: "outline" as LiveHooksStyle,
  hookPosition: "top" as LiveHooksPosition,
  hookMotion: "words" as LiveHooksMotion,
  title: "One visual, three hooks",
  note: "Same take, same type, same place. Only the words change.",
  accent: "#ff7a45",
  background: "#0e1116",
  ink: "#f3f1ec",
  durationSec: 6,
};

/** The stand-in scene: flat, deterministic, and plainly not a photo. */
const SCENE = { sky: "#2b3a55", sun: "#f4b860", ground: "#1c2638" } as const;
const HOOK_LIGHT = "#ffffff" as MosaicColor;
const HOOK_DARK = "#101010" as MosaicColor;

const propsSchema = definePropsSchema<LiveHooksProps>({
  visual: {
    type: "media[]",
    required: false,
    description: "Zero or one visual under the hook, an image or a video - an absolute path from the CLI, or a picked file in Make. Empty draws a flat stand-in scene.",
    meta: { control: { multiple: false, picker: "file", accept: ["image", "video"] }, ui: { label: "Visual", order: 1, primary: true } },
  },
  hooks: {
    type: "string[]",
    required: false,
    description: "One to four hooks. One renders the post itself; several render the same post side by side, one tile per hook.",
    meta: { ui: { label: "Hooks (1-4)", order: 2, primary: true } },
  },
  hookStyle: {
    type: "string",
    required: false,
    description: 'How the hook is drawn: "outline" (white type, dark edge) or "box" (dark type on a white label).',
    meta: { constraints: { oneOf: ["outline", "box"] }, ui: { label: "Hook style", order: 3 } },
  },
  hookPosition: {
    type: "string",
    required: false,
    description: 'Where the hook sits: "top" or "middle". Both stay clear of the platform\'s rail and caption.',
    meta: { constraints: { oneOf: ["top", "middle"] }, ui: { label: "Hook position", order: 4 } },
  },
  hookMotion: {
    type: "string",
    required: false,
    description: 'How the hook arrives: "words" (one word at a time), "lines", "pop" (all at once) or "none" (no motion; a still visual then renders an image).',
    meta: { constraints: { oneOf: ["words", "lines", "pop", "none"] }, ui: { label: "Hook motion", order: 4.5 } },
  },
  title: {
    type: "string",
    required: false,
    description: "The line above the tiles when two or more hooks are compared. Empty removes it.",
    meta: { control: { placeholder: DEFAULTS.title }, ui: { label: "Title", order: 5 } },
  },
  note: {
    type: "string",
    required: false,
    description: "The line under the tiles when two or more hooks are compared. Empty removes it.",
    meta: { control: { placeholder: DEFAULTS.note }, ui: { label: "Note", order: 6 } },
  },
  accent: {
    type: "string",
    required: false,
    description: "The colour of the tile numbers as #rrggbb.",
    meta: { constraints: { isColor: true }, control: { colorPicker: true, defaultColor: DEFAULTS.accent }, ui: { label: "Accent", order: 7 } },
  },
  background: {
    type: "string",
    required: false,
    description: "The page behind the tiles as #rrggbb.",
    meta: { constraints: { isColor: true }, control: { colorPicker: true, defaultColor: DEFAULTS.background }, ui: { label: "Background", order: 8 } },
  },
  ink: {
    type: "string",
    required: false,
    description: "The colour of the title and the note as #rrggbb.",
    meta: { constraints: { isColor: true }, control: { colorPicker: true, defaultColor: DEFAULTS.ink }, ui: { label: "Text", order: 9 } },
  },
  durationSec: {
    type: "number",
    required: false,
    description: "Clip length in whole seconds (2..60) when the render is a clip (a video visual, or any hook motion); an explicit duration pin overrides it.",
    meta: { constraints: { min: LIVE_HOOKS_MIN_SEC, max: LIVE_HOOKS_MAX_SEC }, ui: { label: "Length (s)", order: 10 } },
  },
  debugLayout: {
    type: "boolean",
    required: false,
    description: "Dev-only: check the layout contract (every tile is 9:16, every hook stays inside the safe area, the chrome text fits) and draw it over the frame.",
    meta: { ui: { label: "Debug layout", order: 11 } },
  },
});

/* ── geometry: one pure function of the copy and the canvas ── */

export type LiveHooksRect = { x: number; y: number; w: number; h: number };
export type LiveHooksBlock = { fit: TextFit; rect: LiveHooksRect };

export type LiveHooksTile = {
  /** The post: 9:16 when compared, the whole canvas when alone. */
  rect: LiveHooksRect;
  /** Where the hook may be: inside the platform's safe area. */
  safe: LiveHooksRect;
  /** The fitted hook. */
  fit: TextFit;
  /** The rect the hook is drawn in (the label, in box style). */
  hook: LiveHooksRect;
  /** The tile number under the post, when compared. */
  index: LiveHooksBlock | null;
  /** What arrives, in order: each word, each line, or the whole block (one unit when nothing moves). */
  units: LiveHooksUnit[];
};

/** One piece of a hook that arrives on its own: its text, its tight rect, and when (null = always there). */
export type LiveHooksUnit = { text: string; rect: LiveHooksRect; atSec: number | null };

/**
 * The most units one render may carry before the motion steps down (words ->
 * lines -> pop). Every unit is a gated tile (two, outlined), and gated tiles
 * ride one overlay chain: the engine warns past 20 (OVERLAY_CHAIN_DEEP), and
 * 33 units (a chain of 55) is the most this template has been rendered and
 * checked at.
 */
export const LIVE_HOOKS_MAX_UNITS = 34;

/** When each unit lands: tiles start one after another, units within a tile in reading order. */
export function liveHooksTimes(unitCounts: number[], motion: LiveHooksMotion): Array<Array<number | null>> {
  if (motion === "none") return unitCounts.map((n) => Array.from({ length: n }, () => null));
  const step = motion === "words" ? 0.13 : motion === "lines" ? 0.3 : 0;
  const tileStagger = unitCounts.length > 1 ? 0.5 : 0;
  return unitCounts.map((n, k) => Array.from({ length: n }, (_, j) => Math.round((0.3 + k * tileStagger + j * step) * 1000) / 1000));
}

/**
 * Cut a fitted hook into the rects its units are drawn in. The block is
 * centred in the hook rect exactly as the static hook is; a line is centred
 * on its own width; a word sits at the measured advance of the words before
 * it. `padFor` is the room a rect leaves around a text of that width: the
 * outline's reach, or the slack the fit rule promises a text source.
 */
function cutUnits(fit: TextFit, hook: LiveHooksRect, padFor: (w: number) => number, motion: LiveHooksMotion): Array<{ text: string; rect: LiveHooksRect }> {
  if (motion === "none" || motion === "pop") return [{ text: fit.lines.join("\n"), rect: hook }];
  const step = LINE * fit.px;
  const top = hook.y + (hook.h - fit.lines.length * step) / 2;
  const out: Array<{ text: string; rect: LiveHooksRect }> = [];
  fit.lines.forEach((line, i) => {
    const lineW = widthOf(line, fit.px, fit.face);
    const x0 = hook.x + (hook.w - lineW) / 2;
    const padY = padFor(0);
    const y = Math.round(top + i * step - padY);
    const h = Math.ceil(step + 2 * padY);
    if (motion === "lines") {
      const pad = padFor(lineW);
      out.push({ text: line, rect: { x: Math.round(x0 - pad), y, w: Math.ceil(lineW + 2 * pad), h } });
      return;
    }
    const words = line.split(" ").filter(Boolean);
    words.forEach((word, k) => {
      const wordW = widthOf(word, fit.px, fit.face);
      const dx = widthOf(words.slice(0, k + 1).join(" "), fit.px, fit.face) - wordW;
      const pad = padFor(wordW);
      out.push({ text: word, rect: { x: Math.round(x0 + dx - pad), y, w: Math.ceil(wordW + 2 * pad), h } });
    });
  });
  return out;
}

export type LiveHooksLayout = {
  W: number;
  H: number;
  /** Two or more hooks: tiles side by side under a title. */
  wall: boolean;
  /** The dark edge of an outlined hook, in px (it grows past the glyphs by this much). */
  edge: number;
  /** The motion actually used: the one asked for, stepped down when the render would carry too many gated tiles. */
  motion: LiveHooksMotion;
  title: LiveHooksBlock | null;
  note: LiveHooksBlock | null;
  tiles: LiveHooksTile[];
};

/**
 * The share of a 9:16 post a hook may use: clear of the top bar, the
 * right-hand rail and the caption block. `top` hangs the hook from the top
 * of that area; `middle` centres it in the upper two thirds.
 */
export const LIVE_HOOKS_SAFE = { left: 0.08, right: 0.14, top: 0.11, bottom: 0.3 } as const;

export function layoutLiveHooks(
  copy: { hooks: string[]; title: string; note: string; style: LiveHooksStyle; position: LiveHooksPosition; motion: LiveHooksMotion },
  W: number,
  H: number,
): LiveHooksLayout {
  const S = Math.min(W, H);
  const n = copy.hooks.length;
  const wall = n > 1;
  const clamp = (r: LiveHooksRect): LiveHooksRect => {
    const x = Math.max(0, Math.min(W - 1, Math.round(r.x)));
    const y = Math.max(0, Math.min(H - 1, Math.round(r.y)));
    return { x, y, w: Math.max(1, Math.min(W - x, Math.round(r.w))), h: Math.max(1, Math.min(H - y, Math.round(r.h))) };
  };

  // ── the posts ──
  let title: LiveHooksBlock | null = null;
  let note: LiveHooksBlock | null = null;
  let posts: LiveHooksRect[];
  let indexPx = 0;
  if (!wall) {
    posts = [{ x: 0, y: 0, w: W, h: H }];
  } else {
    const m = Math.max(6, Math.round(0.05 * S));
    const minPx = Math.max(6, Math.round(0.018 * S));
    const contentW = Math.max(32, W - 2 * m);
    const gapY = Math.max(2, Math.round(0.025 * S));
    if (copy.title) {
      const fit = fitText(copy.title, budget(contentW), 0.14 * H, 0.062 * S, minPx, 1, "bold");
      title = { fit, rect: clamp({ x: m, y: m, w: contentW, h: fit.h }) };
    }
    if (copy.note) {
      const fit = fitText(copy.note, budget(contentW), 0.1 * H, 0.03 * S, minPx, 2, "regular");
      note = { fit, rect: clamp({ x: m, y: H - m - fit.h, w: contentW, h: fit.h }) };
    }
    indexPx = Math.max(minPx, Math.round(0.026 * S));
    const indexH = blockH(1, indexPx);
    const rowTop = m + (title ? title.rect.h + gapY : 0);
    const rowBottom = H - m - (note ? note.rect.h + gapY : 0) - indexH;
    const gapX = Math.max(4, Math.round(0.03 * S));
    // 9:16 tiles as tall as the row allows, narrowed when the row is too wide.
    let tileH = Math.max(32, rowBottom - rowTop);
    let tileW = Math.round((tileH * 9) / 16);
    const maxTileW = Math.floor((contentW - (n - 1) * gapX) / n);
    if (tileW > maxTileW) {
      tileW = Math.max(18, maxTileW);
      tileH = Math.round((tileW * 16) / 9);
    }
    const rowW = n * tileW + (n - 1) * gapX;
    const x0 = m + Math.floor((contentW - rowW) / 2);
    const y0 = rowTop + Math.floor((rowBottom - rowTop - tileH) / 2);
    posts = copy.hooks.map((_, i) => clamp({ x: x0 + i * (tileW + gapX), y: y0, w: tileW, h: tileH }));
  }

  // ── the hook on each post: every tile shares ONE size, so the variants compare ──
  const post = posts[0];
  const edge = copy.style === "outline" ? Math.max(1, Math.round(0.0045 * post.w)) : 0;
  const safeOf = (p: LiveHooksRect): LiveHooksRect => clamp({
    x: p.x + LIVE_HOOKS_SAFE.left * p.w,
    y: p.y + LIVE_HOOKS_SAFE.top * p.h,
    w: (1 - LIVE_HOOKS_SAFE.left - LIVE_HOOKS_SAFE.right) * p.w,
    h: (1 - LIVE_HOOKS_SAFE.top - LIVE_HOOKS_SAFE.bottom) * p.h,
  });
  const safe0 = safeOf(post);
  const padX = copy.style === "box" ? Math.round(0.03 * post.w) : 2 * edge;
  const padY = copy.style === "box" ? Math.round(0.014 * post.w) : 2 * edge;
  const maxW = budget(safe0.w - 2 * padX);
  const maxH = 0.5 * safe0.h;
  const minHookPx = Math.max(5, Math.round(0.03 * post.w));
  let px = Math.max(minHookPx, Math.round(0.064 * post.w));
  let fits = copy.hooks.map((h) => fitText(h, maxW, maxH, px, minHookPx, 4, "bold"));
  // Shrink together: the smallest size any hook needed is the size they all get.
  px = Math.min(...fits.map((f) => f.px));
  fits = copy.hooks.map((h) => fitText(h, maxW, maxH, px, px, 4, "bold"));

  const drafts = posts.map((p, i) => {
    const safe = safeOf(p);
    const fit = fits[i];
    const w = copy.style === "box" ? Math.min(safe.w, Math.ceil(fit.width / 0.94) + 4 + 2 * padX) : safe.w;
    const h = Math.min(safe.h, fit.h + 2 * padY);
    const y = copy.position === "top" ? safe.y : safe.y + Math.max(0, Math.floor((safe.h * 0.72 - h) / 2));
    const hook = clamp({ x: safe.x + Math.floor((safe.w - w) / 2), y, w, h });
    let index: LiveHooksBlock | null = null;
    if (wall) {
      const ifit = fitText(String(i + 1).padStart(2, "0"), budget(p.w), Number.MAX_SAFE_INTEGER, indexPx, indexPx, 1, "bold");
      index = { fit: ifit, rect: clamp({ x: p.x, y: p.y + p.h, w: p.w, h: ifit.h }) };
    }
    return { rect: p, safe, fit, hook, index };
  });

  // ── the units: step the motion down until the gated tiles fit the budget ──
  // Outlined: room for the edge. Box: a text source, so its rect carries the fit rule's slack (cell * 0.94 - 2px).
  const unitPad = (w: number) => (copy.style === "outline" ? 2 * edge + 1 : Math.ceil(0.035 * w + 2));
  const ladder: LiveHooksMotion[] = copy.motion === "words" ? ["words", "lines", "pop"] : copy.motion === "lines" ? ["lines", "pop"] : [copy.motion];
  let motion = ladder[ladder.length - 1];
  let cuts = drafts.map((d) => cutUnits(d.fit, d.hook, unitPad, motion));
  for (const candidate of ladder) {
    const tried = drafts.map((d) => cutUnits(d.fit, d.hook, unitPad, candidate));
    if (tried.reduce((a, u) => a + u.length, 0) <= LIVE_HOOKS_MAX_UNITS) {
      motion = candidate;
      cuts = tried;
      break;
    }
  }
  const times = liveHooksTimes(cuts.map((u) => u.length), motion);
  const tiles: LiveHooksTile[] = drafts.map((d, i) => ({
    ...d,
    units: cuts[i].map((u, j) => ({ text: u.text, rect: u.rect.w === d.hook.w && u.rect.h === d.hook.h ? d.hook : clamp(u.rect), atSec: times[i][j] })),
  }));

  return { W, H, wall, edge, motion, title, note, tiles };
}

/**
 * What the geometry promises: a compared post is 9:16, every hook rect sits
 * inside its post, and the chrome text fits. (An outlined hook is drawn from
 * a glyph path, not a text source, so its fit is asserted in the test from
 * the measured width instead of by `textFits`.)
 */
export function liveHooksContract(L: LiveHooksLayout, style: LiveHooksStyle): LayoutConstraint[] {
  const out: LayoutConstraint[] = [];
  if (L.title) out.push(textFitsMeasured("title", L.title.fit.lines.join("\n"), L.title.fit.px, L.title.fit.width));
  if (L.note) out.push(textFitsMeasured("note", L.note.fit.lines.join("\n"), L.note.fit.px, L.note.fit.width));
  L.tiles.forEach((t, i) => {
    t.units.forEach((u, j) => {
      if (style === "box") out.push(textFitsMeasured(`hook-${i}-${j}`, u.text, t.fit.px, u.text.split("\n").reduce((m, l) => Math.max(m, widthOf(l, t.fit.px, t.fit.face)), 0)));
      out.push({ label: `hook-${i}-${j}` });
    });
    if (t.index) out.push(textFitsMeasured(`index-${i}`, t.index.fit.lines.join("\n"), t.index.fit.px, t.index.fit.width));
  });
  if (L.wall) out.push({ label: "post", aspect: 9 / 16, aspectTolerance: 0.03 });
  return out;
}

/** A clip when the hook moves or the visual is a video file; a still with no motion renders an image. */
function outputFormat(props: LiveHooksProps | undefined) {
  const ref = Array.isArray(props?.visual) ? String(props?.visual[0] ?? "") : "";
  const moves = (props?.hookMotion ?? DEFAULTS.hookMotion) !== "none";
  return moves || VIDEO_EXT.test(ref.trim())
    ? ({ kind: "video", container: "mp4" } as const)
    : ({ kind: "image", container: "png" } as const);
}

export const LiveHooksV1 = defineMosaicTemplate<LiveHooksProps>({
  id: asTemplateId(ID),
  label: "04 · Live Hooks",
  version: 1,
  description:
    "One visual, up to four hooks that land word by word: the animated text layer of a short-form post, fitted and drawn the same way every render. One hook renders the post itself; several render them side by side to compare.",
  capabilities: { tier: "core" },
  tags: ["social", "hooks", "short-form", "ugc", "captions", "kinetic-text", "variants", "a-b-test", "vertical", "video"],

  outputHints: {
    width: 1920,
    height: 1080,
    fps: 30,
    durationMs: DEFAULTS.durationSec * 1000,
    format: { kind: "video", container: "mp4" },
    note: "Several hooks compare side by side on a landscape frame; one hook renders the post itself at 1080x1920. A clip by default; a still visual with hookMotion none renders a PNG.",
  },
  // The canvas and the kind are knobs: one hook is the 9:16 post; motion or a video visual makes a clip.
  resolveOutputHints: (props) => {
    const count = Array.isArray(props?.hooks) ? props.hooks.filter((h) => String(h).trim()).length : DEFAULTS.hooks.length;
    const sec = numberOr(props?.durationSec, DEFAULTS.durationSec, LIVE_HOOKS_MIN_SEC, LIVE_HOOKS_MAX_SEC);
    return {
      ...(count === 1 ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 }),
      durationMs: Math.round(sec * 1000),
      format: outputFormat(props),
    };
  },

  propsSchema,
  defaultProps: {
    visual: [],
    hooks: [...DEFAULTS.hooks],
    hookStyle: DEFAULTS.hookStyle,
    hookPosition: DEFAULTS.hookPosition,
    hookMotion: DEFAULTS.hookMotion,
    title: DEFAULTS.title,
    note: DEFAULTS.note,
    accent: DEFAULTS.accent,
    background: DEFAULTS.background,
    ink: DEFAULTS.ink,
    durationSec: DEFAULTS.durationSec,
    debugLayout: false,
  },
  // `background` is the document's own fill and needs no rect; these two can
  // carry a handle and deliberately do not.
  bindings: { unbound: { ink: "theme", durationSec: "timing" } },

  render,
});

export default LiveHooksV1;

/* ── input: the schema is documentation, render() is the gate ── */

function numberOr(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

function pickText(value: unknown, fallback: string, name: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") throw new Error(`${ID}: ${name} must be a string.`);
  return cleanCopy(value);
}

function pickHooks(value: unknown): string[] {
  if (value === undefined || value === null) return [...DEFAULTS.hooks];
  if (!Array.isArray(value)) throw new Error(`${ID}: hooks must be an array of one to ${LIVE_HOOKS_MAX_HOOKS} strings.`);
  const hooks = value.map((v, i) => pickText(v, "", `hooks[${i}]`)).filter((h) => h.length > 0);
  if (hooks.length < 1 || hooks.length > LIVE_HOOKS_MAX_HOOKS) {
    throw new Error(`${ID}: hooks must carry one to ${LIVE_HOOKS_MAX_HOOKS} non-empty lines. Got ${hooks.length}.`);
  }
  return hooks;
}

function pickColor(value: unknown, fallback: string, name: string): MosaicColor {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length === 0) return fallback as MosaicColor;
  if (!HEX.test(s)) throw new Error(`${ID}: ${name} ${JSON.stringify(value)} must be #rrggbb.`);
  return s as MosaicColor;
}

function pickOne<T extends string>(value: unknown, allowed: readonly T[], fallback: T, name: string): T {
  if (value === undefined || value === null || value === "") return fallback;
  if (!allowed.includes(value as T)) throw new Error(`${ID}: ${name} must be one of ${allowed.join(", ")}. Got ${JSON.stringify(value)}.`);
  return value as T;
}

function pickSeconds(value: unknown): number {
  if (value === undefined || value === null) return DEFAULTS.durationSec;
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < LIVE_HOOKS_MIN_SEC || n > LIVE_HOOKS_MAX_SEC) {
    throw new Error(`${ID}: durationSec must be a whole number from ${LIVE_HOOKS_MIN_SEC} to ${LIVE_HOOKS_MAX_SEC}. Got ${JSON.stringify(value)}.`);
  }
  return n;
}

function pickMedia(value: unknown, name: string): string {
  if (value === undefined || value === null) return "";
  if (!Array.isArray(value)) throw new Error(`${ID}: ${name} must be an array of zero or one path.`);
  const refs = value.map((v) => String(v).trim()).filter(Boolean);
  if (refs.length > 1) throw new Error(`${ID}: ${name} accepts zero or one file (got ${refs.length}).`);
  return refs[0] ?? "";
}

const ASSET_ID_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;

function mix(a: MosaicColor, b: MosaicColor, t: number): MosaicColor {
  const pa = parseInt(String(a).slice(1), 16);
  const pb = parseInt(String(b).slice(1), 16);
  const ch = (sa: number, sb: number) => Math.round(sa * t + sb * (1 - t));
  const r = ch((pa >> 16) & 255, (pb >> 16) & 255);
  const g = ch((pa >> 8) & 255, (pb >> 8) & 255);
  const bl = ch(pa & 255, pb & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}` as MosaicColor;
}

/* ── sources ── */

function textSource(fit: TextFit, color: MosaicColor, label: string, hAlign: "left" | "center", overlay?: MosaicOverlayExpr): MosaicSource {
  return tag({
    ...(overlay ? { overlay } : {}),
    type: "text",
    rasterizer: "svg",
    renderMode: { kind: "image" },
    layers: [
      {
        content: { kind: "literal", text: fit.lines.join("\n") },
        style: { fontSize: fit.px, fontColor: color, ...(fit.face === "bold" ? { fontWeight: "bold" } : {}) },
        placement: { hAlign, vAlign: "middle" },
      },
    ],
    editor: { owner: "template" },
  } as MosaicSource, label);
}

/**
 * The outlined hook: the glyph path of the fitted block, laid out in the
 * hook rect's own pixel space (so the mask scales 1:1), returned twice - a
 * dark tile whose mask is the path filled AND stroked, and a white tile
 * whose mask is the path filled.
 */
function outlinedHook(text: string, fit: TextFit, rect: LiveHooksRect, edge: number, overlay?: MosaicOverlayExpr): { edgeTile: MosaicSource; fillTile: MosaicSource } {
  const fontPath = facePath(fit.face);
  const d = textToPath(
    text,
    { fontSize: fit.px, hAlign: "center", vAlign: "middle", lineHeight: LINE, ...(fontPath ? { fontPath } : {}) },
    { width: rect.w, height: rect.h },
  );
  const bounds = { x: 0, y: 0, width: rect.w, height: rect.h };
  return {
    edgeTile: makeColorTile(HOOK_DARK, { mask: { kind: "inline-mask", localPath: d, bounds, strokes: [{ d, width: 2 * edge }] }, ...(overlay ? { overlay } : {}) }) as MosaicSource,
    fillTile: makeColorTile(HOOK_LIGHT, { mask: { kind: "inline-mask", localPath: d, bounds }, ...(overlay ? { overlay } : {}) }) as MosaicSource,
  };
}

async function render(props: LiveHooksProps, ctx: MosaicEngineContext): Promise<MosaicDocument> {
  const hooks = pickHooks(props.hooks);
  const style = pickOne(props.hookStyle, ["outline", "box"] as const, DEFAULTS.hookStyle, "hookStyle");
  const position = pickOne(props.hookPosition, ["top", "middle"] as const, DEFAULTS.hookPosition, "hookPosition");
  const asked = pickOne(props.hookMotion, ["words", "lines", "pop", "none"] as const, DEFAULTS.hookMotion, "hookMotion");
  const title = pickText(props.title, DEFAULTS.title, "title");
  const note = pickText(props.note, DEFAULTS.note, "note");
  const accent = pickColor(props.accent, DEFAULTS.accent, "accent");
  const bg = pickColor(props.background, DEFAULTS.background, "background");
  const ink = pickColor(props.ink, DEFAULTS.ink, "ink");
  const visualRef = pickMedia(props.visual, "visual");

  // The visual: an id-shaped ref IS the asset id (a host's picker hands one
  // over); a filesystem path gets a fixed id with the path in the manifest.
  const assets: NonNullable<MosaicDocument["assets"]> = {};
  const visualId = visualRef ? asAssetId(ASSET_ID_RE.test(visualRef) ? visualRef : "visual") : undefined;
  let isVideo = false;
  if (visualId) {
    const known = ctx.media?.[visualId];
    if (known && known.kind === "audio") throw new Error(`${ID}: visual must be an image or a video (got audio).`);
    isVideo = known ? known.kind === "video" : VIDEO_EXT.test(visualRef);
    assets[visualId] = { kind: "file", path: visualRef, mediaType: isVideo ? "video" : "image" };
  }

  const W = Math.max(1, Math.round(ctx.target.width));
  const H = Math.max(1, Math.round(ctx.target.height));
  const L = layoutLiveHooks({ hooks, title, note, style, position, motion: asked }, W, H);
  /** A unit hops up into its place at `atSec`: an offset and a gate, nothing per pixel. */
  const arrive = (atSec: number | null): MosaicOverlayExpr | undefined =>
    atSec === null ? undefined : entrance({ kind: "slide-up", durationMs: 140, atSec, ease: "easeOut" });

  const pieces: Parameters<typeof placeInsetPieces>[0]["pieces"] = [];
  const piece = (rect: LiveHooksRect, importance: number, source: MosaicSource) => pieces.push({ rect: { ...rect, importance }, source });

  if (L.title) piece(L.title.rect, 2, bindProp(textSource(L.title.fit, ink, "title", "left"), "title"));
  if (L.note) piece(L.note.rect, 2, bindProp(textSource(L.note.fit, mix(ink, bg, 0.62), "note", "left"), "note"));

  L.tiles.forEach((t, i) => {
    // ── the visual, or the stand-in scene ──
    if (visualId) {
      piece(t.rect, 1, bindProp(tag({
        type: "media",
        mediaType: isVideo ? "video" : "image",
        assetId: visualId,
        placement: { fit: "cover" },
        editor: { owner: "template" },
      } as MosaicSource, "post"), "visual", 0));
    } else {
      // Alone, the post IS the canvas: its sky is the document background, never a full-frame rect.
      if (L.wall) piece(t.rect, 1, bindProp(tag(makeColorTile(SCENE.sky as MosaicColor) as MosaicSource, "post"), "visual", 0));
      const groundH = Math.round(0.34 * t.rect.h);
      const ground = { x: t.rect.x, y: t.rect.y + t.rect.h - groundH, w: t.rect.w, h: groundH };
      const sunD = Math.max(4, Math.round(0.36 * t.rect.w));
      const sun = { x: t.rect.x + Math.round(0.5 * t.rect.w - sunD / 2), y: ground.y - Math.round(0.62 * sunD), w: sunD, h: sunD };
      piece(sun, 2, tag(makeColorTile(SCENE.sun as MosaicColor, { mask: { kind: "inline-mask", ...circleMask(sunD, sunD) } }) as MosaicSource, "scene-sun"));
      const groundTile = tag(makeColorTile(SCENE.ground as MosaicColor) as MosaicSource, "scene-ground");
      piece(ground, 3, L.wall ? groundTile : bindProp(groundTile, "visual", 0));
    }

    // ── the hook ──
    if (style === "box") {
      // The label arrives with the first unit, so a moving hook never shows an empty label.
      const first = t.units[0].atSec;
      const labelGate = first === null ? {} : { overlay: { enable: `gte(t,${first})`, window: { startSec: first } } };
      piece(t.hook, 4, tag(makeColorTile(HOOK_LIGHT, { effects: { rounding: { cornerStyle: "rounded", borderRadius: 0.35 } }, ...labelGate }) as MosaicSource, `hook-label-${i}`));
    }
    t.units.forEach((u, j) => {
      const overlay = arrive(u.atSec);
      const label = `hook-${i}-${j}`;
      const bound = <T extends MosaicSource>(src: T) => (j === 0 ? bindProp(src, "hooks", i) : src);
      if (style === "box") {
        piece(u.rect, 5, bound(textSource({ ...t.fit, lines: u.text.split("\n") }, HOOK_DARK, label, "center", overlay)));
      } else {
        const { edgeTile, fillTile } = outlinedHook(u.text, t.fit, u.rect, L.edge, overlay);
        piece(u.rect, 4, tag(edgeTile, `hook-edge-${i}-${j}`));
        piece(u.rect, 5, bound(tag(fillTile, label)));
      }
    });

    if (t.index) piece(t.index.rect, 2, i === 0 ? bindProp(textSource(t.index.fit, accent, `index-${i}`, "left"), "accent") : textSource(t.index.fit, accent, `index-${i}`, "left"));
  });

  const pinned = resolvePinnedDurationMs(ctx);
  const durationMs = pinned !== undefined ? Math.round(pinned) : pickSeconds(props.durationSec) * 1000;
  const placed = placeInsetPieces({ rootW: W, rootH: H, pieces });
  const doc: MosaicDocument = {
    kind: "mosaic_document",
    version: 1,
    m0: toM0String(placed.m0, ID),
    assets,
    size: { width: W, height: H },
    fps: ctx.target.fps,
    ...(isVideo || L.motion !== "none" ? { durationMs } : {}),
    // Alone with no visual, the page IS the stand-in sky.
    backgroundColor: !L.wall && !visualId ? (SCENE.sky as MosaicColor) : bg,
    sources: placed.sources,
    editor: { label: `Live Hooks - ${hooks.length} ${hooks.length === 1 ? "hook" : "hooks"}, ${style}, ${L.motion}` },
  };
  return withLayoutIntent(doc, ctx, { templateId: ID, constraints: liveHooksContract(L, style), debug: props.debugLayout === true });
}
