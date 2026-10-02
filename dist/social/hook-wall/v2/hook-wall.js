"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookWallV2 = exports.HOOK2_SAFE = exports.HOOK_WALL2_MAX_UNITS = exports.HOOK_WALL2_MAX_SEC = exports.HOOK_WALL2_MIN_SEC = exports.HOOK_WALL2_MAX_HOOKS = void 0;
exports.hookWall2Times = hookWall2Times;
exports.layoutHookWall2 = layoutHookWall2;
exports.hookWall2Contract = hookWall2Contract;
const types_1 = require("@m0saic/types");
const dsl_stdlib_1 = require("@m0saic/dsl-stdlib");
const template_utils_1 = require("@m0saic/template-utils");
const layout_1 = require("../../../_shared/layout");
const text_1 = require("../../../_shared/text");
const ID = "@outreach/social/hook-wall/v2";
const HEX = /^#[0-9a-fA-F]{6}$/;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv)$/i;
exports.HOOK_WALL2_MAX_HOOKS = 4;
exports.HOOK_WALL2_MIN_SEC = 2;
exports.HOOK_WALL2_MAX_SEC = 60;
const DEFAULTS = {
    hooks: [
        "nobody told me it could be this easy",
        "POV: you finally stopped doing this by hand",
        "3 things I wish I knew a year ago",
    ],
    hookStyle: "outline",
    hookPosition: "top",
    hookMotion: "words",
    title: "One visual, three hooks",
    note: "Same take, same type, same place. Only the words change.",
    accent: "#ff7a45",
    background: "#0e1116",
    ink: "#f3f1ec",
    durationSec: 6,
};
/** The stand-in scene: flat, deterministic, and plainly not a photo. */
const SCENE = { sky: "#2b3a55", sun: "#f4b860", ground: "#1c2638" };
const HOOK_LIGHT = "#ffffff";
const HOOK_DARK = "#101010";
const propsSchema = (0, template_utils_1.definePropsSchema)({
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
        meta: { constraints: { min: exports.HOOK_WALL2_MIN_SEC, max: exports.HOOK_WALL2_MAX_SEC }, ui: { label: "Length (s)", order: 10 } },
    },
    debugLayout: {
        type: "boolean",
        required: false,
        description: "Dev-only: check the layout contract (every tile is 9:16, every hook stays inside the safe area, the chrome text fits) and draw it over the frame.",
        meta: { ui: { label: "Debug layout", order: 11 } },
    },
});
/** The most gated tiles one render may carry before the motion steps down (words -> lines -> pop). */
exports.HOOK_WALL2_MAX_UNITS = 48;
/** When each unit lands: tiles start one after another, units within a tile in reading order. */
function hookWall2Times(unitCounts, motion) {
    if (motion === "none")
        return unitCounts.map((n) => Array.from({ length: n }, () => null));
    const step = motion === "words" ? 0.13 : motion === "lines" ? 0.3 : 0;
    const tileStagger = unitCounts.length > 1 ? 0.5 : 0;
    return unitCounts.map((n, k) => Array.from({ length: n }, (_, j) => Math.round((0.3 + k * tileStagger + j * step) * 1000) / 1000));
}
/**
 * Cut a fitted hook into the rects its units are drawn in. The block is
 * centred in the hook rect exactly as the static hook is; a line is centred
 * on its own width; a word sits at the measured advance of the words before
 * it. `pad` is the room every rect leaves for the outline.
 */
function cutUnits(fit, hook, pad, motion) {
    if (motion === "none" || motion === "pop")
        return [{ text: fit.lines.join("\n"), rect: hook }];
    const step = text_1.LINE * fit.px;
    const top = hook.y + (hook.h - fit.lines.length * step) / 2;
    const out = [];
    fit.lines.forEach((line, i) => {
        const lineW = (0, text_1.widthOf)(line, fit.px, fit.face);
        const x0 = hook.x + (hook.w - lineW) / 2;
        const y = Math.round(top + i * step - pad);
        const h = Math.ceil(step + 2 * pad);
        if (motion === "lines") {
            out.push({ text: line, rect: { x: Math.round(x0 - pad), y, w: Math.ceil(lineW + 2 * pad), h } });
            return;
        }
        const words = line.split(" ").filter(Boolean);
        words.forEach((word, k) => {
            const wordW = (0, text_1.widthOf)(word, fit.px, fit.face);
            const dx = (0, text_1.widthOf)(words.slice(0, k + 1).join(" "), fit.px, fit.face) - wordW;
            out.push({ text: word, rect: { x: Math.round(x0 + dx - pad), y, w: Math.ceil(wordW + 2 * pad), h } });
        });
    });
    return out;
}
/**
 * The share of a 9:16 post a hook may use: clear of the top bar, the
 * right-hand rail and the caption block. `top` hangs the hook from the top
 * of that area; `middle` centres it in the upper two thirds.
 */
exports.HOOK2_SAFE = { left: 0.08, right: 0.14, top: 0.11, bottom: 0.3 };
function layoutHookWall2(copy, W, H) {
    const S = Math.min(W, H);
    const n = copy.hooks.length;
    const wall = n > 1;
    const clamp = (r) => {
        const x = Math.max(0, Math.min(W - 1, Math.round(r.x)));
        const y = Math.max(0, Math.min(H - 1, Math.round(r.y)));
        return { x, y, w: Math.max(1, Math.min(W - x, Math.round(r.w))), h: Math.max(1, Math.min(H - y, Math.round(r.h))) };
    };
    // ── the posts ──
    let title = null;
    let note = null;
    let posts;
    let indexPx = 0;
    if (!wall) {
        posts = [{ x: 0, y: 0, w: W, h: H }];
    }
    else {
        const m = Math.max(6, Math.round(0.05 * S));
        const minPx = Math.max(6, Math.round(0.018 * S));
        const contentW = Math.max(32, W - 2 * m);
        const gapY = Math.max(2, Math.round(0.025 * S));
        if (copy.title) {
            const fit = (0, text_1.fitText)(copy.title, (0, text_1.budget)(contentW), 0.14 * H, 0.062 * S, minPx, 1, "bold");
            title = { fit, rect: clamp({ x: m, y: m, w: contentW, h: fit.h }) };
        }
        if (copy.note) {
            const fit = (0, text_1.fitText)(copy.note, (0, text_1.budget)(contentW), 0.1 * H, 0.03 * S, minPx, 2, "regular");
            note = { fit, rect: clamp({ x: m, y: H - m - fit.h, w: contentW, h: fit.h }) };
        }
        indexPx = Math.max(minPx, Math.round(0.026 * S));
        const indexH = (0, text_1.blockH)(1, indexPx);
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
    const safeOf = (p) => clamp({
        x: p.x + exports.HOOK2_SAFE.left * p.w,
        y: p.y + exports.HOOK2_SAFE.top * p.h,
        w: (1 - exports.HOOK2_SAFE.left - exports.HOOK2_SAFE.right) * p.w,
        h: (1 - exports.HOOK2_SAFE.top - exports.HOOK2_SAFE.bottom) * p.h,
    });
    const safe0 = safeOf(post);
    const padX = copy.style === "box" ? Math.round(0.03 * post.w) : 2 * edge;
    const padY = copy.style === "box" ? Math.round(0.014 * post.w) : 2 * edge;
    const maxW = (0, text_1.budget)(safe0.w - 2 * padX);
    const maxH = 0.5 * safe0.h;
    const minHookPx = Math.max(5, Math.round(0.03 * post.w));
    let px = Math.max(minHookPx, Math.round(0.064 * post.w));
    let fits = copy.hooks.map((h) => (0, text_1.fitText)(h, maxW, maxH, px, minHookPx, 4, "bold"));
    // Shrink together: the smallest size any hook needed is the size they all get.
    px = Math.min(...fits.map((f) => f.px));
    fits = copy.hooks.map((h) => (0, text_1.fitText)(h, maxW, maxH, px, px, 4, "bold"));
    const drafts = posts.map((p, i) => {
        const safe = safeOf(p);
        const fit = fits[i];
        const w = copy.style === "box" ? Math.min(safe.w, Math.ceil(fit.width / 0.94) + 4 + 2 * padX) : safe.w;
        const h = Math.min(safe.h, fit.h + 2 * padY);
        const y = copy.position === "top" ? safe.y : safe.y + Math.max(0, Math.floor((safe.h * 0.72 - h) / 2));
        const hook = clamp({ x: safe.x + Math.floor((safe.w - w) / 2), y, w, h });
        let index = null;
        if (wall) {
            const ifit = (0, text_1.fitText)(String(i + 1).padStart(2, "0"), (0, text_1.budget)(p.w), Number.MAX_SAFE_INTEGER, indexPx, indexPx, 1, "bold");
            index = { fit: ifit, rect: clamp({ x: p.x, y: p.y + p.h, w: p.w, h: ifit.h }) };
        }
        return { rect: p, safe, fit, hook, index };
    });
    // ── the units: step the motion down until the gated tiles fit the budget ──
    const unitPad = copy.style === "outline" ? 2 * edge + 1 : 1;
    const ladder = copy.motion === "words" ? ["words", "lines", "pop"] : copy.motion === "lines" ? ["lines", "pop"] : [copy.motion];
    let motion = ladder[ladder.length - 1];
    let cuts = drafts.map((d) => cutUnits(d.fit, d.hook, unitPad, motion));
    for (const candidate of ladder) {
        const tried = drafts.map((d) => cutUnits(d.fit, d.hook, unitPad, candidate));
        if (tried.reduce((a, u) => a + u.length, 0) <= exports.HOOK_WALL2_MAX_UNITS) {
            motion = candidate;
            cuts = tried;
            break;
        }
    }
    const times = hookWall2Times(cuts.map((u) => u.length), motion);
    const tiles = drafts.map((d, i) => ({
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
function hookWall2Contract(L, style) {
    const out = [];
    if (L.title)
        out.push((0, layout_1.textFitsMeasured)("title", L.title.fit.lines.join("\n"), L.title.fit.px, L.title.fit.width));
    if (L.note)
        out.push((0, layout_1.textFitsMeasured)("note", L.note.fit.lines.join("\n"), L.note.fit.px, L.note.fit.width));
    L.tiles.forEach((t, i) => {
        t.units.forEach((u, j) => {
            if (style === "box")
                out.push((0, layout_1.textFitsMeasured)(`hook-${i}-${j}`, u.text, t.fit.px, u.text.split("\n").reduce((m, l) => Math.max(m, (0, text_1.widthOf)(l, t.fit.px, t.fit.face)), 0)));
            out.push({ label: `hook-${i}-${j}` });
        });
        if (t.index)
            out.push((0, layout_1.textFitsMeasured)(`index-${i}`, t.index.fit.lines.join("\n"), t.index.fit.px, t.index.fit.width));
    });
    if (L.wall)
        out.push({ label: "post", aspect: 9 / 16, aspectTolerance: 0.03 });
    return out;
}
/** A clip when the hook moves or the visual is a video file; a still with no motion renders an image. */
function outputFormat(props) {
    var _a, _b;
    const ref = Array.isArray(props === null || props === void 0 ? void 0 : props.visual) ? String((_a = props === null || props === void 0 ? void 0 : props.visual[0]) !== null && _a !== void 0 ? _a : "") : "";
    const moves = ((_b = props === null || props === void 0 ? void 0 : props.hookMotion) !== null && _b !== void 0 ? _b : DEFAULTS.hookMotion) !== "none";
    return moves || VIDEO_EXT.test(ref.trim())
        ? { kind: "video", container: "mp4" }
        : { kind: "image", container: "png" };
}
exports.HookWallV2 = (0, template_utils_1.defineMosaicTemplate)({
    id: (0, types_1.asTemplateId)(ID),
    label: "04 · Hook Wall",
    version: 1,
    description: "One visual, up to four hooks that land word by word: the animated text layer of a short-form post, fitted and drawn the same way every render. One hook renders the post itself; several render them side by side to compare.",
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
        const count = Array.isArray(props === null || props === void 0 ? void 0 : props.hooks) ? props.hooks.filter((h) => String(h).trim()).length : DEFAULTS.hooks.length;
        const sec = numberOr(props === null || props === void 0 ? void 0 : props.durationSec, DEFAULTS.durationSec, exports.HOOK_WALL2_MIN_SEC, exports.HOOK_WALL2_MAX_SEC);
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
exports.default = exports.HookWallV2;
/* ── input: the schema is documentation, render() is the gate ── */
function numberOr(v, fallback, min, max) {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}
function pickText(value, fallback, name) {
    if (value === undefined || value === null)
        return fallback;
    if (typeof value !== "string")
        throw new Error(`${ID}: ${name} must be a string.`);
    return (0, text_1.cleanCopy)(value);
}
function pickHooks(value) {
    if (value === undefined || value === null)
        return [...DEFAULTS.hooks];
    if (!Array.isArray(value))
        throw new Error(`${ID}: hooks must be an array of one to ${exports.HOOK_WALL2_MAX_HOOKS} strings.`);
    const hooks = value.map((v, i) => pickText(v, "", `hooks[${i}]`)).filter((h) => h.length > 0);
    if (hooks.length < 1 || hooks.length > exports.HOOK_WALL2_MAX_HOOKS) {
        throw new Error(`${ID}: hooks must carry one to ${exports.HOOK_WALL2_MAX_HOOKS} non-empty lines. Got ${hooks.length}.`);
    }
    return hooks;
}
function pickColor(value, fallback, name) {
    const s = typeof value === "string" ? value.trim() : "";
    if (s.length === 0)
        return fallback;
    if (!HEX.test(s))
        throw new Error(`${ID}: ${name} ${JSON.stringify(value)} must be #rrggbb.`);
    return s;
}
function pickOne(value, allowed, fallback, name) {
    if (value === undefined || value === null || value === "")
        return fallback;
    if (!allowed.includes(value))
        throw new Error(`${ID}: ${name} must be one of ${allowed.join(", ")}. Got ${JSON.stringify(value)}.`);
    return value;
}
function pickSeconds(value) {
    if (value === undefined || value === null)
        return DEFAULTS.durationSec;
    const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    if (typeof n !== "number" || !Number.isInteger(n) || n < exports.HOOK_WALL2_MIN_SEC || n > exports.HOOK_WALL2_MAX_SEC) {
        throw new Error(`${ID}: durationSec must be a whole number from ${exports.HOOK_WALL2_MIN_SEC} to ${exports.HOOK_WALL2_MAX_SEC}. Got ${JSON.stringify(value)}.`);
    }
    return n;
}
function pickMedia(value, name) {
    var _a;
    if (value === undefined || value === null)
        return "";
    if (!Array.isArray(value))
        throw new Error(`${ID}: ${name} must be an array of zero or one path.`);
    const refs = value.map((v) => String(v).trim()).filter(Boolean);
    if (refs.length > 1)
        throw new Error(`${ID}: ${name} accepts zero or one file (got ${refs.length}).`);
    return (_a = refs[0]) !== null && _a !== void 0 ? _a : "";
}
const ASSET_ID_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;
function mix(a, b, t) {
    const pa = parseInt(String(a).slice(1), 16);
    const pb = parseInt(String(b).slice(1), 16);
    const ch = (sa, sb) => Math.round(sa * t + sb * (1 - t));
    const r = ch((pa >> 16) & 255, (pb >> 16) & 255);
    const g = ch((pa >> 8) & 255, (pb >> 8) & 255);
    const bl = ch(pa & 255, pb & 255);
    return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}
/* ── sources ── */
function textSource(fit, color, label, hAlign, overlay) {
    return (0, template_utils_1.tag)({
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
    }, label);
}
/**
 * The outlined hook: the glyph path of the fitted block, laid out in the
 * hook rect's own pixel space (so the mask scales 1:1), returned twice - a
 * dark tile whose mask is the path filled AND stroked, and a white tile
 * whose mask is the path filled.
 */
function outlinedHook(text, fit, rect, edge, overlay) {
    const fontPath = (0, text_1.facePath)(fit.face);
    const d = (0, template_utils_1.textToPath)(text, { fontSize: fit.px, hAlign: "center", vAlign: "middle", lineHeight: text_1.LINE, ...(fontPath ? { fontPath } : {}) }, { width: rect.w, height: rect.h });
    const bounds = { x: 0, y: 0, width: rect.w, height: rect.h };
    return {
        edgeTile: (0, template_utils_1.makeColorTile)(HOOK_DARK, { mask: { kind: "inline-mask", localPath: d, bounds, strokes: [{ d, width: 2 * edge }] }, ...(overlay ? { overlay } : {}) }),
        fillTile: (0, template_utils_1.makeColorTile)(HOOK_LIGHT, { mask: { kind: "inline-mask", localPath: d, bounds }, ...(overlay ? { overlay } : {}) }),
    };
}
async function render(props, ctx) {
    var _a;
    const hooks = pickHooks(props.hooks);
    const style = pickOne(props.hookStyle, ["outline", "box"], DEFAULTS.hookStyle, "hookStyle");
    const position = pickOne(props.hookPosition, ["top", "middle"], DEFAULTS.hookPosition, "hookPosition");
    const asked = pickOne(props.hookMotion, ["words", "lines", "pop", "none"], DEFAULTS.hookMotion, "hookMotion");
    const title = pickText(props.title, DEFAULTS.title, "title");
    const note = pickText(props.note, DEFAULTS.note, "note");
    const accent = pickColor(props.accent, DEFAULTS.accent, "accent");
    const bg = pickColor(props.background, DEFAULTS.background, "background");
    const ink = pickColor(props.ink, DEFAULTS.ink, "ink");
    const visualRef = pickMedia(props.visual, "visual");
    // The visual: an id-shaped ref IS the asset id (a host's picker hands one
    // over); a filesystem path gets a fixed id with the path in the manifest.
    const assets = {};
    const visualId = visualRef ? (0, types_1.asAssetId)(ASSET_ID_RE.test(visualRef) ? visualRef : "visual") : undefined;
    let isVideo = false;
    if (visualId) {
        const known = (_a = ctx.media) === null || _a === void 0 ? void 0 : _a[visualId];
        if (known && known.kind === "audio")
            throw new Error(`${ID}: visual must be an image or a video (got audio).`);
        isVideo = known ? known.kind === "video" : VIDEO_EXT.test(visualRef);
        assets[visualId] = { kind: "file", path: visualRef, mediaType: isVideo ? "video" : "image" };
    }
    const W = Math.max(1, Math.round(ctx.target.width));
    const H = Math.max(1, Math.round(ctx.target.height));
    const L = layoutHookWall2({ hooks, title, note, style, position, motion: asked }, W, H);
    /** A unit hops up into its place at `atSec`: an offset and a gate, nothing per pixel. */
    const arrive = (atSec) => atSec === null ? undefined : (0, template_utils_1.entrance)({ kind: "slide-up", durationMs: 140, atSec, ease: "easeOut" });
    const pieces = [];
    const piece = (rect, importance, source) => pieces.push({ rect: { ...rect, importance }, source });
    if (L.title)
        piece(L.title.rect, 2, (0, template_utils_1.bindProp)(textSource(L.title.fit, ink, "title", "left"), "title"));
    if (L.note)
        piece(L.note.rect, 2, (0, template_utils_1.bindProp)(textSource(L.note.fit, mix(ink, bg, 0.62), "note", "left"), "note"));
    L.tiles.forEach((t, i) => {
        // ── the visual, or the stand-in scene ──
        if (visualId) {
            piece(t.rect, 1, (0, template_utils_1.bindProp)((0, template_utils_1.tag)({
                type: "media",
                mediaType: isVideo ? "video" : "image",
                assetId: visualId,
                placement: { fit: "cover" },
                editor: { owner: "template" },
            }, "post"), "visual", 0));
        }
        else {
            // Alone, the post IS the canvas: its sky is the document background, never a full-frame rect.
            if (L.wall)
                piece(t.rect, 1, (0, template_utils_1.bindProp)((0, template_utils_1.tag)((0, template_utils_1.makeColorTile)(SCENE.sky), "post"), "visual", 0));
            const groundH = Math.round(0.34 * t.rect.h);
            const ground = { x: t.rect.x, y: t.rect.y + t.rect.h - groundH, w: t.rect.w, h: groundH };
            const sunD = Math.max(4, Math.round(0.36 * t.rect.w));
            const sun = { x: t.rect.x + Math.round(0.5 * t.rect.w - sunD / 2), y: ground.y - Math.round(0.62 * sunD), w: sunD, h: sunD };
            piece(sun, 2, (0, template_utils_1.tag)((0, template_utils_1.makeColorTile)(SCENE.sun, { mask: { kind: "inline-mask", ...(0, dsl_stdlib_1.circleMask)(sunD, sunD) } }), "scene-sun"));
            const groundTile = (0, template_utils_1.tag)((0, template_utils_1.makeColorTile)(SCENE.ground), "scene-ground");
            piece(ground, 3, L.wall ? groundTile : (0, template_utils_1.bindProp)(groundTile, "visual", 0));
        }
        // ── the hook ──
        if (style === "box") {
            // The label arrives with the first unit, so a moving hook never shows an empty label.
            const first = t.units[0].atSec;
            const labelGate = first === null ? {} : { overlay: { enable: `gte(t,${first})`, window: { startSec: first } } };
            piece(t.hook, 4, (0, template_utils_1.tag)((0, template_utils_1.makeColorTile)(HOOK_LIGHT, { effects: { rounding: { cornerStyle: "rounded", borderRadius: 0.35 } }, ...labelGate }), `hook-label-${i}`));
        }
        t.units.forEach((u, j) => {
            const overlay = arrive(u.atSec);
            const label = `hook-${i}-${j}`;
            const bound = (src) => (j === 0 ? (0, template_utils_1.bindProp)(src, "hooks", i) : src);
            if (style === "box") {
                piece(u.rect, 5, bound(textSource({ ...t.fit, lines: u.text.split("\n") }, HOOK_DARK, label, "center", overlay)));
            }
            else {
                const { edgeTile, fillTile } = outlinedHook(u.text, t.fit, u.rect, L.edge, overlay);
                piece(u.rect, 4, (0, template_utils_1.tag)(edgeTile, `hook-edge-${i}-${j}`));
                piece(u.rect, 5, bound((0, template_utils_1.tag)(fillTile, label)));
            }
        });
        if (t.index)
            piece(t.index.rect, 2, i === 0 ? (0, template_utils_1.bindProp)(textSource(t.index.fit, accent, `index-${i}`, "left"), "accent") : textSource(t.index.fit, accent, `index-${i}`, "left"));
    });
    const pinned = (0, template_utils_1.resolvePinnedDurationMs)(ctx);
    const durationMs = pinned !== undefined ? Math.round(pinned) : pickSeconds(props.durationSec) * 1000;
    const placed = (0, template_utils_1.placeInsetPieces)({ rootW: W, rootH: H, pieces });
    const doc = {
        kind: "mosaic_document",
        version: 1,
        m0: (0, dsl_stdlib_1.toM0String)(placed.m0, ID),
        assets,
        size: { width: W, height: H },
        fps: ctx.target.fps,
        ...(isVideo || L.motion !== "none" ? { durationMs } : {}),
        // Alone with no visual, the page IS the stand-in sky.
        backgroundColor: !L.wall && !visualId ? SCENE.sky : bg,
        sources: placed.sources,
        editor: { label: `Hook Wall - ${hooks.length} ${hooks.length === 1 ? "hook" : "hooks"}, ${style}, ${L.motion}` },
    };
    return (0, layout_1.withLayoutIntent)(doc, ctx, { templateId: ID, constraints: hookWall2Contract(L, style), debug: props.debugLayout === true });
}
