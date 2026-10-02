"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhyYouV1 = exports.WHY_YOU_MAX_REASONS = exports.WHY_YOU_MAX_SEC = exports.WHY_YOU_MIN_SEC = void 0;
exports.whyYouBeats = whyYouBeats;
exports.whyYouInitials = whyYouInitials;
exports.layoutWhyYou = layoutWhyYou;
exports.whyYouContract = whyYouContract;
const types_1 = require("@m0saic/types");
const dsl_stdlib_1 = require("@m0saic/dsl-stdlib");
const template_utils_1 = require("@m0saic/template-utils");
const layout_1 = require("../../../_shared/layout");
const ID = "@outreach/invite/why-you/v1";
const HEX = /^#[0-9a-fA-F]{6}$/;
exports.WHY_YOU_MIN_SEC = 8;
exports.WHY_YOU_MAX_SEC = 60;
exports.WHY_YOU_MAX_REASONS = 3;
/** Generic on purpose: this repo is public, so the defaults name nobody real. */
const DEFAULTS = {
    recipientName: "Alex",
    recipientHandle: "@alexbuilds",
    greeting: "Hey",
    question: "Why you?",
    reasons: [
        "You ship in public, every single day.",
        "Your agents already do the busywork.",
        "You asked how this video was made.",
    ],
    brandName: "Northwind",
    tagline: "Warm intros, on autopilot",
    pitch: "Tell Northwind who you need to meet. It finds the shortest trusted path there and asks for the intro.",
    ctaLabel: "Your invite is waiting",
    ctaUrl: "northwind.example/invite/alex",
    signoff: "Sam, founder of Northwind",
    accent: "#7c9cff",
    background: "#0e1116",
    ink: "#f3f1ec",
    durationSec: 15,
};
const propsSchema = (0, template_utils_1.definePropsSchema)({
    recipientName: {
        type: "string",
        required: false,
        description: "Who the clip is for: the name in the greeting, and the initials on the disc when there is no picture.",
        meta: { control: { placeholder: DEFAULTS.recipientName }, ui: { label: "Recipient name", order: 1, primary: true } },
    },
    recipientHandle: {
        type: "string",
        required: false,
        description: "Their handle, drawn under the greeting. Empty removes the line.",
        meta: { control: { placeholder: DEFAULTS.recipientHandle }, ui: { label: "Recipient handle", order: 2 } },
    },
    recipientImage: {
        type: "media[]",
        required: false,
        description: "Zero or one profile picture, cropped to the disc - an absolute path from the CLI, or a picked file in Make. Empty draws the recipient's initials.",
        meta: { control: { multiple: false, picker: "file", accept: ["image"] }, ui: { label: "Recipient picture", order: 3, primary: true } },
    },
    greeting: {
        type: "string",
        required: false,
        description: "The word before the name on the first frame. Empty leaves the name alone.",
        meta: { control: { placeholder: DEFAULTS.greeting }, ui: { label: "Greeting", order: 4 } },
    },
    question: {
        type: "string",
        required: false,
        description: "The line that opens the second beat, above the reasons. Empty removes it.",
        meta: { control: { placeholder: DEFAULTS.question }, ui: { label: "Question", order: 5 } },
    },
    reasons: {
        type: "string[]",
        required: false,
        description: "One to three reasons you picked this person. Each lands on its own beat and wraps to two lines at most.",
        meta: { ui: { label: "Reasons (1-3)", order: 6, primary: true } },
    },
    brandName: {
        type: "string",
        required: false,
        description: "Who is writing: the small wordmark on every frame, and the big line of the third beat.",
        meta: { control: { placeholder: DEFAULTS.brandName }, ui: { label: "Brand", order: 7, primary: true } },
    },
    tagline: {
        type: "string",
        required: false,
        description: "The brand's tagline, in the accent under its name. Empty removes it.",
        meta: { control: { placeholder: DEFAULTS.tagline }, ui: { label: "Tagline", order: 8 } },
    },
    pitch: {
        type: "string",
        required: false,
        description: "One or two sentences on what you offer, wrapped under the tagline. Empty removes it.",
        meta: { control: { placeholder: DEFAULTS.pitch }, ui: { label: "Pitch", order: 9 } },
    },
    ctaLabel: {
        type: "string",
        required: false,
        description: "The line above the link on the last beat. Empty removes it.",
        meta: { control: { placeholder: DEFAULTS.ctaLabel }, ui: { label: "Call to action", order: 10 } },
    },
    ctaUrl: {
        type: "string",
        required: false,
        description: "The link, drawn in the pill and held to the last frame. Empty removes the pill.",
        meta: { control: { placeholder: DEFAULTS.ctaUrl }, ui: { label: "Link", order: 11, primary: true } },
    },
    signoff: {
        type: "string",
        required: false,
        description: "Who signed it, under the link. Empty removes it.",
        meta: { control: { placeholder: DEFAULTS.signoff }, ui: { label: "Sign-off", order: 12 } },
    },
    accent: {
        type: "string",
        required: false,
        description: "The accent - the disc ring, the question, the rule beside the reasons, the pill and the progress line - as #rrggbb.",
        meta: { constraints: { isColor: true }, control: { colorPicker: true, defaultColor: DEFAULTS.accent }, ui: { label: "Accent", order: 13 } },
    },
    background: {
        type: "string",
        required: false,
        description: "The page colour as #rrggbb.",
        meta: { constraints: { isColor: true }, control: { colorPicker: true, defaultColor: DEFAULTS.background }, ui: { label: "Background", order: 14 } },
    },
    ink: {
        type: "string",
        required: false,
        description: "The text colour as #rrggbb. Secondary lines are this colour mixed toward the page.",
        meta: { constraints: { isColor: true }, control: { colorPicker: true, defaultColor: DEFAULTS.ink }, ui: { label: "Text", order: 15 } },
    },
    durationSec: {
        type: "number",
        required: false,
        description: "Clip length in whole seconds (8..60). The four beats keep their shares; an explicit duration pin overrides it.",
        meta: { constraints: { min: exports.WHY_YOU_MIN_SEC, max: exports.WHY_YOU_MAX_SEC }, ui: { label: "Length (s)", order: 16 } },
    },
    debugLayout: {
        type: "boolean",
        required: false,
        description: "Dev-only: check the layout contract (every text fits its box, the disc stays round, the progress line holds the bottom edge) and draw it over the frame.",
        meta: { ui: { label: "Debug layout", order: 17 } },
    },
});
/**
 * The beats as shares of the clip - 17% hello, 37% why you (three reasons
 * are the most to read), 26% the pitch, 20% the ask - with ramps that
 * shorten on a short clip, so the last reason has always landed before its
 * beat fades.
 */
function whyYouBeats(totalSec) {
    const D = round3(totalSec);
    return {
        total: D,
        cuts: [round3(0.17 * D), round3(0.54 * D), round3(0.8 * D)],
        fade: round3(Math.min(0.3, 0.04 * D)),
        rise: round3(Math.min(0.45, 0.06 * D)),
        stagger: round3(Math.min(0.4, 0.045 * D)),
    };
}
const LINE = 1.25;
/** The fit budget inside a cell: `cell * 0.94 - 2px` (the layout contract's rule). */
const budget = (cellW) => Math.max(8, Math.floor(cellW * 0.94 - 2));
/** A rect sized FROM its fitted text, carrying the slack the budget promises. */
const blockH = (lines, px) => Math.ceil((lines * LINE * px + 2) / 0.94);
function widthOf(text, px, face) {
    var _a;
    const fontPath = face === "regular"
        ? undefined
        : (_a = (0, template_utils_1.resolveFontFile)({ weight: face === "bold" ? "bold" : "normal", style: face === "italic" ? "italic" : "normal" })) === null || _a === void 0 ? void 0 : _a.path;
    return (0, template_utils_1.measureText)(text, { fontSize: px, ...(fontPath ? { fontPath } : {}) }).width;
}
/** Greedy word-wrap in the face that will be drawn. Never breaks a word. */
function wrapLines(text, px, maxW, face) {
    const lines = [];
    let cur = "";
    for (const word of text.split(" ").filter(Boolean)) {
        const next = cur ? `${cur} ${word}` : word;
        if (cur && widthOf(next, px, face) > maxW) {
            lines.push(cur);
            cur = word;
        }
        else
            cur = next;
    }
    if (cur)
        lines.push(cur);
    return lines;
}
/**
 * Rebalance a wrapped block: the same line count, the shortest longest line.
 * Greedy wrap at the largest size leaves a one-word last line; this moves
 * the breaks and can never undo a fit.
 */
function balanceLines(text, px, maxW, face, lines) {
    if (lines.length < 2)
        return lines;
    let best = lines;
    let lo = 0;
    let hi = maxW;
    for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        const tried = wrapLines(text, px, mid, face);
        if (tried.length <= lines.length && tried.every((l) => widthOf(l, px, face) <= maxW)) {
            best = tried;
            hi = mid;
        }
        else
            lo = mid;
    }
    return best;
}
/**
 * The copy broken at its sentences: short sentences share a line while they
 * fit, a long one wraps (balanced) on its own lines. "Anyone you need.
 * Through people you trust. / Gigi is the agent ..." reads better than an
 * even split through the middle of a sentence. Null when the copy is one
 * sentence or a line would not fit.
 */
function sentenceLines(text, px, maxW, face) {
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length < 2)
        return null;
    const groups = [];
    let cur = "";
    for (const sentence of sentences) {
        const next = cur ? `${cur} ${sentence}` : sentence;
        if (cur && widthOf(next, px, face) > maxW) {
            groups.push(cur);
            cur = sentence;
        }
        else
            cur = next;
    }
    if (cur)
        groups.push(cur);
    const lines = groups.flatMap((group) => balanceLines(group, px, maxW, face, wrapLines(group, px, maxW, face)));
    return lines.some((l) => widthOf(l, px, face) > maxW) ? null : lines;
}
/**
 * The lines a block is drawn with at a size it is known to fit: sentence
 * breaks when they cost at most one extra line and still fit the cell,
 * else the greedy wrap rebalanced.
 */
function composeLines(text, px, maxW, face, maxLines, maxH) {
    const greedy = wrapLines(text, px, maxW, face);
    const bySentence = sentenceLines(text, px, maxW, face);
    if (bySentence && bySentence.length <= Math.min(maxLines, greedy.length + 1) && blockH(bySentence.length, px) <= maxH)
        return bySentence;
    return balanceLines(text, px, maxW, face, greedy);
}
/** Cut to fit with a trailing "..." - the last resort, after shrinking. */
function ellipsize(text, px, maxW, face, force = false) {
    if (!force && widthOf(text, px, face) <= maxW)
        return text;
    let t = text;
    while (t.length > 1 && widthOf(`${t}...`, px, face) > maxW)
        t = t.slice(0, -1);
    return `${t.trimEnd()}...`;
}
/**
 * Fit copy into a cell: the largest size (maxPx down to minPx) whose wrapped
 * block fits the width budget, the line cap and the height. At the floor it
 * drops lines and ellipsizes - a degrade, never an overflow.
 */
function fitBlock(text, cellW, cellMaxH, maxPx, minPx, maxLines, face) {
    const maxW = budget(cellW);
    let px = Math.max(minPx, Math.round(maxPx));
    let lines = wrapLines(text, px, maxW, face);
    const fits = () => lines.length <= maxLines && blockH(lines.length, px) <= cellMaxH && lines.every((l) => widthOf(l, px, face) <= maxW);
    while (px > minPx && !fits()) {
        px = Math.max(minPx, Math.min(px - 1, Math.round(px * 0.94)));
        lines = wrapLines(text, px, maxW, face);
    }
    const keep = Math.max(1, Math.min(maxLines, lines.length, Math.floor((cellMaxH * 0.94 - 2) / (LINE * px)) || 1));
    if (keep < lines.length) {
        lines = lines.slice(0, keep);
        lines[keep - 1] = ellipsize(lines[keep - 1], px, maxW, face, true);
    }
    else
        lines = composeLines(text, px, maxW, face, maxLines, cellMaxH);
    lines = lines.map((l) => ellipsize(l, px, maxW, face));
    const width = lines.reduce((m, l) => Math.max(m, widthOf(l, px, face)), 0);
    return { lines, px, face, width, h: blockH(lines.length, px) };
}
/** The reasons share ONE size: the largest at which every row fits two lines and the stack fits its height. */
function fitRows(rows, cellW, maxTotalH, maxPx, minPx) {
    const maxW = budget(cellW);
    const gapAt = (px) => Math.round(0.6 * px);
    let px = Math.max(minPx, Math.round(maxPx));
    const ok = () => {
        let total = (rows.length - 1) * gapAt(px);
        for (const row of rows) {
            const lines = composeLines(row, px, maxW, "regular", 2, Number.MAX_SAFE_INTEGER);
            if (lines.length > 2 || lines.some((l) => widthOf(l, px, "regular") > maxW))
                return false;
            total += blockH(lines.length, px);
        }
        return total <= maxTotalH;
    };
    while (px > minPx && !ok())
        px = Math.max(minPx, Math.min(px - 1, Math.round(px * 0.94)));
    return { fits: rows.map((row) => fitBlock(row, cellW, Number.MAX_SAFE_INTEGER, px, px, 2, "regular")), gap: gapAt(px) };
}
/** Up to two initials: the first letters of the first two words that start with a letter or digit. */
function whyYouInitials(name) {
    const words = name.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
    return words.slice(0, 2).map((w) => { var _a, _b; return ((_b = (_a = w.match(/[\p{L}\p{N}]/u)) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : "").toUpperCase(); }).join("");
}
/**
 * The whole geometry. Chrome first (the wordmark top-left, the progress line
 * on the bottom edge), then each beat as a left-aligned stack centred in the
 * stage between them. Every text rect is sized from its fitted block, so the
 * contract's `textFits` checks the real copy against the real box.
 */
function layoutWhyYou(copy, W, H) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const S = Math.min(W, H);
    const wide = W / H >= 1.3;
    const m = Math.max(6, Math.round(0.07 * S));
    const minPx = Math.max(6, Math.round(0.018 * S));
    const contentW = Math.max(32, W - 2 * m);
    const gap = Math.max(2, Math.round(0.03 * S));
    const tight = Math.max(1, Math.round(0.012 * S));
    const clamp = (r) => {
        const x = Math.max(0, Math.min(W - 1, Math.round(r.x)));
        const y = Math.max(0, Math.min(H - 1, Math.round(r.y)));
        return { x, y, w: Math.max(1, Math.min(W - x, Math.round(r.w))), h: Math.max(1, Math.min(H - y, Math.round(r.h))) };
    };
    const at = (fit, x, y, w) => ({ fit, rect: clamp({ x, y, w, h: fit.h }) });
    // ── chrome ──
    const wordmarkW = Math.round(0.7 * contentW);
    const wordmark = at(fitBlock(copy.brandName, wordmarkW, Number.MAX_SAFE_INTEGER, 0.036 * S, minPx, 1, "bold"), m, m, wordmarkW);
    const barH = Math.max(2, Math.round(0.008 * S));
    const bar = clamp({ x: 0, y: H - barH, w: W, h: barH });
    const stageTop = m + wordmark.rect.h + Math.round(0.4 * m);
    const stageH = Math.max(24, H - barH - m - stageTop);
    /** Top of a stack of `heights` (with `gaps` between them), centred in the stage. */
    const stackTop = (heights, gaps) => {
        const total = heights.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
        return stageTop + Math.max(0, Math.floor((stageH - total) / 2));
    };
    // ── beat 1: hello ──
    const helloText = copy.greeting ? `${copy.greeting} ${copy.recipientName},` : copy.recipientName;
    let avatar;
    let hello;
    let handle;
    if (wide) {
        const d = Math.max(8, Math.min(Math.round(0.62 * stageH), Math.round(0.3 * contentW)));
        const colX = m + d + Math.round(0.06 * S);
        const colW = Math.max(24, W - m - colX);
        const helloFit = fitBlock(helloText, colW, 0.6 * stageH, 0.13 * S, minPx, 2, "bold");
        const handleFit = copy.recipientHandle ? fitBlock(copy.recipientHandle, colW, 0.2 * stageH, 0.05 * S, minPx, 1, "regular") : null;
        const y0 = stackTop([helloFit.h, (_a = handleFit === null || handleFit === void 0 ? void 0 : handleFit.h) !== null && _a !== void 0 ? _a : 0], [handleFit ? tight : 0]);
        avatar = clamp({ x: m, y: stageTop + Math.floor((stageH - d) / 2), w: d, h: d });
        hello = at(helloFit, colX, y0, colW);
        handle = handleFit ? at(handleFit, colX, y0 + helloFit.h + tight, colW) : null;
    }
    else {
        const d = Math.max(8, Math.min(Math.round(0.44 * stageH), Math.round(0.6 * contentW)));
        const helloFit = fitBlock(helloText, contentW, 0.28 * stageH, 0.14 * S, minPx, 2, "bold");
        const handleFit = copy.recipientHandle ? fitBlock(copy.recipientHandle, contentW, 0.12 * stageH, 0.05 * S, minPx, 1, "regular") : null;
        const y0 = stackTop([d, helloFit.h, (_b = handleFit === null || handleFit === void 0 ? void 0 : handleFit.h) !== null && _b !== void 0 ? _b : 0], [gap, handleFit ? tight : 0]);
        avatar = clamp({ x: m, y: y0, w: d, h: d });
        hello = at(helloFit, m, y0 + d + gap, contentW);
        handle = handleFit ? at(handleFit, m, y0 + d + gap + helloFit.h + tight, contentW) : null;
    }
    const ring = Math.max(1, Math.round(0.035 * avatar.w));
    const avatarInner = clamp({ x: avatar.x + ring, y: avatar.y + ring, w: avatar.w - 2 * ring, h: avatar.h - 2 * ring });
    const initialsText = whyYouInitials(copy.recipientName);
    const initials = !copy.hasImage && initialsText
        ? fitBlock(initialsText, Math.round(0.8 * avatarInner.w), avatarInner.h, 0.42 * avatarInner.w, minPx, 1, "bold")
        : null;
    // ── beat 2: why you ──
    const ruleW = Math.max(2, Math.round(0.008 * S));
    const rowX = m + ruleW + Math.round(0.035 * S);
    const rowW = Math.max(24, W - m - rowX);
    const questionFit = copy.question ? fitBlock(copy.question, contentW, 0.24 * stageH, 0.1 * S, minPx, 2, "italic") : null;
    const questionGap = questionFit ? gap : 0;
    const rows = fitRows(copy.reasons, rowW, 0.92 * stageH - ((_c = questionFit === null || questionFit === void 0 ? void 0 : questionFit.h) !== null && _c !== void 0 ? _c : 0) - questionGap, 0.056 * S, minPx);
    const rowsH = rows.fits.reduce((a, f) => a + f.h, 0) + (rows.fits.length - 1) * rows.gap;
    const y2 = stackTop([(_d = questionFit === null || questionFit === void 0 ? void 0 : questionFit.h) !== null && _d !== void 0 ? _d : 0, rowsH], [questionGap]);
    const question = questionFit ? at(questionFit, m, y2, contentW) : null;
    const reasons = [];
    let rowY = y2 + ((_e = questionFit === null || questionFit === void 0 ? void 0 : questionFit.h) !== null && _e !== void 0 ? _e : 0) + questionGap;
    for (const fit of rows.fits) {
        reasons.push(at(fit, rowX, rowY, rowW));
        rowY += fit.h + rows.gap;
    }
    const lastRow = reasons[reasons.length - 1].rect;
    const rule = clamp({ x: m, y: reasons[0].rect.y, w: ruleW, h: lastRow.y + lastRow.h - reasons[0].rect.y });
    // ── beat 3: the pitch ──
    const pitchW = wide ? Math.round(0.74 * contentW) : contentW;
    const brandFit = fitBlock(copy.brandName, contentW, 0.34 * stageH, 0.2 * S, minPx, 2, "bold");
    const taglineFit = copy.tagline ? fitBlock(copy.tagline, contentW, 0.18 * stageH, 0.07 * S, minPx, 2, "italic") : null;
    const pitchFit = copy.pitch ? fitBlock(copy.pitch, pitchW, 0.36 * stageH, 0.046 * S, minPx, 4, "regular") : null;
    const y3 = stackTop([brandFit.h, (_f = taglineFit === null || taglineFit === void 0 ? void 0 : taglineFit.h) !== null && _f !== void 0 ? _f : 0, (_g = pitchFit === null || pitchFit === void 0 ? void 0 : pitchFit.h) !== null && _g !== void 0 ? _g : 0], [taglineFit ? tight : 0, pitchFit ? gap : 0]);
    const brand = at(brandFit, m, y3, contentW);
    const taglineY = y3 + brandFit.h + (taglineFit ? tight : 0);
    const tagline = taglineFit ? at(taglineFit, m, taglineY, contentW) : null;
    const pitch = pitchFit ? at(pitchFit, m, taglineY + ((_h = taglineFit === null || taglineFit === void 0 ? void 0 : taglineFit.h) !== null && _h !== void 0 ? _h : 0) + gap, pitchW) : null;
    // ── beat 4: the ask ──
    const ctaLabelFit = copy.ctaLabel ? fitBlock(copy.ctaLabel, contentW, 0.3 * stageH, 0.085 * S, minPx, 2, "bold") : null;
    const urlPad = Math.round(0.9 * 0.048 * S);
    const ctaUrl = copy.ctaUrl ? fitBlock(copy.ctaUrl, Math.max(24, contentW - 2 * urlPad), Number.MAX_SAFE_INTEGER, 0.048 * S, minPx, 1, "bold") : null;
    const pillH = ctaUrl ? Math.round(2.2 * ctaUrl.px) : 0;
    const pillW = ctaUrl ? Math.min(contentW, Math.ceil(ctaUrl.width / 0.94) + 4 + 2 * Math.round(0.9 * ctaUrl.px)) : 0;
    const signoffFit = copy.signoff ? fitBlock(copy.signoff, contentW, 0.16 * stageH, 0.04 * S, minPx, 2, "regular") : null;
    const y4 = stackTop([(_j = ctaLabelFit === null || ctaLabelFit === void 0 ? void 0 : ctaLabelFit.h) !== null && _j !== void 0 ? _j : 0, pillH, (_k = signoffFit === null || signoffFit === void 0 ? void 0 : signoffFit.h) !== null && _k !== void 0 ? _k : 0], [ctaLabelFit && ctaUrl ? gap : 0, signoffFit && (ctaUrl || ctaLabelFit) ? gap : 0]);
    const ctaLabel = ctaLabelFit ? at(ctaLabelFit, m, y4, contentW) : null;
    const pillY = y4 + (ctaLabelFit ? ctaLabelFit.h + (ctaUrl ? gap : 0) : 0);
    const pill = ctaUrl ? clamp({ x: m, y: pillY, w: pillW, h: pillH }) : null;
    const signoffY = pillY + pillH + (signoffFit && (ctaUrl || ctaLabelFit) ? gap : 0);
    const signoff = signoffFit ? at(signoffFit, m, signoffY, contentW) : null;
    return {
        W, H, wide,
        wordmark, bar,
        avatar, avatarInner, initials,
        hello, handle,
        question, rule, reasons,
        brand, tagline, pitch,
        ctaLabel, pill, ctaUrl, signoff,
    };
}
/**
 * What the geometry promises: every fitted text fits the box it got, the
 * disc is a square (so its mask is a circle), the wordmark lives in the top
 * band and the progress line spans the bottom edge.
 */
function whyYouContract(L) {
    var _a, _b, _c, _d, _e, _f;
    const out = [];
    const fits = (label, fit) => {
        if (fit)
            out.push((0, layout_1.textFitsMeasured)(label, fit.lines.join("\n"), fit.px, fit.width));
    };
    fits("wordmark", L.wordmark.fit);
    fits("hello", L.hello.fit);
    fits("handle", (_a = L.handle) === null || _a === void 0 ? void 0 : _a.fit);
    fits("initials", L.initials);
    fits("question", (_b = L.question) === null || _b === void 0 ? void 0 : _b.fit);
    L.reasons.forEach((r, i) => fits(`reason-${i}`, r.fit));
    fits("brand", L.brand.fit);
    fits("tagline", (_c = L.tagline) === null || _c === void 0 ? void 0 : _c.fit);
    fits("pitch", (_d = L.pitch) === null || _d === void 0 ? void 0 : _d.fit);
    fits("cta-label", (_e = L.ctaLabel) === null || _e === void 0 ? void 0 : _e.fit);
    fits("cta-url", L.ctaUrl);
    fits("signoff", (_f = L.signoff) === null || _f === void 0 ? void 0 : _f.fit);
    out.push({ label: "avatar-ring", aspect: 1 });
    out.push({ label: "avatar", aspect: 1 });
    out.push({ label: "wordmark", within: { yFrac: [0, 0.3] } });
    out.push({ label: "progress", minWidthFrac: 0.98, within: { yFrac: [0.9, 1] } });
    return out;
}
exports.WhyYouV1 = (0, template_utils_1.defineMosaicTemplate)({
    id: (0, types_1.asTemplateId)(ID),
    label: "02 · Why You",
    version: 1,
    description: "A personalized cold-open clip: greets one person by name and face, answers why them in three lines, pitches the brand and ends on their invite link. One props file per recipient.",
    capabilities: { tier: "core" },
    tags: ["invite", "outreach", "personalized", "cold-open", "dm", "marketing", "agent", "video"],
    outputHints: {
        width: 1080,
        height: 1080,
        fps: 30,
        durationMs: DEFAULTS.durationSec * 1000,
        format: { kind: "video", container: "mp4" },
        note: "A square clip for a DM by default; 1920x1080 and 1080x1920 re-flow. The clip is durationSec long; an explicit --durationMs overrides it.",
    },
    // The length is a knob: a host seeds its Duration field from the props.
    resolveOutputHints: (props) => {
        const sec = numberOr(props === null || props === void 0 ? void 0 : props.durationSec, DEFAULTS.durationSec, exports.WHY_YOU_MIN_SEC, exports.WHY_YOU_MAX_SEC);
        return { durationMs: Math.round(sec * 1000) };
    },
    propsSchema,
    defaultProps: {
        recipientName: DEFAULTS.recipientName,
        recipientHandle: DEFAULTS.recipientHandle,
        recipientImage: [],
        greeting: DEFAULTS.greeting,
        question: DEFAULTS.question,
        reasons: [...DEFAULTS.reasons],
        brandName: DEFAULTS.brandName,
        tagline: DEFAULTS.tagline,
        pitch: DEFAULTS.pitch,
        ctaLabel: DEFAULTS.ctaLabel,
        ctaUrl: DEFAULTS.ctaUrl,
        signoff: DEFAULTS.signoff,
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
exports.default = exports.WhyYouV1;
/* ── input: the schema is documentation, render() is the gate ── */
/** A finite number in range, or the fallback - for the hints resolver, which must never throw. */
function numberOr(v, fallback, min, max) {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}
/**
 * Copy an agent scraped from a profile: fold typographic punctuation to
 * ASCII, drop what the bundled font cannot draw (emoji, other scripts),
 * collapse whitespace. undefined = the default, "" = removed.
 */
function pickText(value, fallback, name) {
    if (value === undefined || value === null)
        return fallback;
    if (typeof value !== "string")
        throw new Error(`${ID}: ${name} must be a string.`);
    return value
        .replace(/[‘’′]/g, "'")
        .replace(/[“”″]/g, '"')
        .replace(/[‐-―]/g, "-")
        .replace(/…/g, "...")
        .replace(/[^\x20-\x7e¡-ſ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function pickReasons(value) {
    if (value === undefined || value === null)
        return [...DEFAULTS.reasons];
    if (!Array.isArray(value))
        throw new Error(`${ID}: reasons must be an array of one to ${exports.WHY_YOU_MAX_REASONS} strings.`);
    const rows = value.map((v, i) => pickText(v, "", `reasons[${i}]`)).filter((r) => r.length > 0);
    if (rows.length < 1 || rows.length > exports.WHY_YOU_MAX_REASONS) {
        throw new Error(`${ID}: reasons must carry one to ${exports.WHY_YOU_MAX_REASONS} non-empty lines. Got ${rows.length}.`);
    }
    return rows;
}
function pickColor(value, fallback, name) {
    const s = typeof value === "string" ? value.trim() : "";
    if (s.length === 0)
        return fallback;
    if (!HEX.test(s))
        throw new Error(`${ID}: ${name} ${JSON.stringify(value)} must be #rrggbb.`);
    return s;
}
function pickSeconds(value) {
    if (value === undefined || value === null)
        return DEFAULTS.durationSec;
    const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    if (typeof n !== "number" || !Number.isInteger(n) || n < exports.WHY_YOU_MIN_SEC || n > exports.WHY_YOU_MAX_SEC) {
        throw new Error(`${ID}: durationSec must be a whole number from ${exports.WHY_YOU_MIN_SEC} to ${exports.WHY_YOU_MAX_SEC}. Got ${JSON.stringify(value)}.`);
    }
    return n;
}
/** A zero-or-one media prop: an array of path strings; more than one is an error. */
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
/* ── colour ── */
function rgb(c) {
    const n = parseInt(String(c).slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Linear byte mix, `t` of `a` over `1 - t` of `b`: a static stand-in for opacity that costs no overlay layer. */
function mix(a, b, t) {
    const [ar, ag, ab] = rgb(a);
    const [br, bg, bb] = rgb(b);
    const ch = (x, y) => Math.round(x * t + y * (1 - t));
    return `#${((1 << 24) + (ch(ar, br) << 16) + (ch(ag, bg) << 8) + ch(ab, bb)).toString(16).slice(1)}`;
}
function luminance(c) {
    const [r, g, b] = rgb(c);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
/** Whichever of the two reads better on `fill`. */
function onColor(fill, a, b) {
    const l = luminance(fill);
    return Math.abs(luminance(a) - l) >= Math.abs(luminance(b) - l) ? a : b;
}
function round3(n) {
    return Math.round(n * 1000) / 1000;
}
/* ── sources ── */
/** One svg-rasterized text block (the bundled font, no drawtext), aligned inside its rect. */
function textSource(fit, color, label, overlay, hAlign = "left") {
    return (0, template_utils_1.tag)({
        type: "text",
        rasterizer: "svg",
        renderMode: { kind: "image" },
        layers: [
            {
                content: { kind: "literal", text: fit.lines.join("\n") },
                style: {
                    fontSize: fit.px,
                    fontColor: color,
                    ...(fit.face === "bold" ? { fontWeight: "bold" } : {}),
                    ...(fit.face === "italic" ? { fontStyle: "italic" } : {}),
                },
                placement: { hAlign, vAlign: "middle" },
            },
        ],
        ...(overlay ? { overlay } : {}),
        editor: { owner: "template" },
    }, label);
}
async function render(props, ctx) {
    var _a;
    const recipientName = pickText(props.recipientName, DEFAULTS.recipientName, "recipientName");
    if (recipientName.length === 0)
        throw new Error(`${ID}: recipientName is required - the clip is addressed to someone.`);
    const brandName = pickText(props.brandName, DEFAULTS.brandName, "brandName");
    if (brandName.length === 0)
        throw new Error(`${ID}: brandName is required - the clip is from someone.`);
    const imageRef = pickMedia(props.recipientImage, "recipientImage");
    const copy = {
        recipientName,
        recipientHandle: pickText(props.recipientHandle, DEFAULTS.recipientHandle, "recipientHandle"),
        hasImage: imageRef.length > 0,
        greeting: pickText(props.greeting, DEFAULTS.greeting, "greeting"),
        question: pickText(props.question, DEFAULTS.question, "question"),
        reasons: pickReasons(props.reasons),
        brandName,
        tagline: pickText(props.tagline, DEFAULTS.tagline, "tagline"),
        pitch: pickText(props.pitch, DEFAULTS.pitch, "pitch"),
        ctaLabel: pickText(props.ctaLabel, DEFAULTS.ctaLabel, "ctaLabel"),
        ctaUrl: pickText(props.ctaUrl, DEFAULTS.ctaUrl, "ctaUrl"),
        signoff: pickText(props.signoff, DEFAULTS.signoff, "signoff"),
    };
    const accent = pickColor(props.accent, DEFAULTS.accent, "accent");
    const bg = pickColor(props.background, DEFAULTS.background, "background");
    const ink = pickColor(props.ink, DEFAULTS.ink, "ink");
    const dim = mix(ink, bg, 0.62);
    // The picture: an id-shaped ref IS the asset id (a host's picker hands one
    // over); a filesystem path gets a fixed id with the path in the manifest.
    const assets = {};
    const imageId = imageRef ? (0, types_1.asAssetId)(ASSET_ID_RE.test(imageRef) ? imageRef : "recipient-image") : undefined;
    if (imageId) {
        assets[imageId] = { kind: "file", path: imageRef, mediaType: "image" };
        const known = (_a = ctx.media) === null || _a === void 0 ? void 0 : _a[imageId];
        if (known && known.kind !== "image")
            throw new Error(`${ID}: recipientImage must be an image (got ${known.kind}).`);
    }
    // An explicit user pin wins and BECOMES the clip; the host-seeded target is never read as one.
    const pinned = (0, template_utils_1.resolvePinnedDurationMs)(ctx);
    const durationMs = pinned !== undefined ? Math.round(pinned) : pickSeconds(props.durationSec) * 1000;
    const T = whyYouBeats(durationMs / 1000);
    const [cut1, cut2, cut3] = T.cuts;
    const W = Math.max(1, Math.round(ctx.target.width));
    const H = Math.max(1, Math.round(ctx.target.height));
    const L = layoutWhyYou(copy, W, H);
    /** Leave before the next beat starts. */
    const leave = (endSec) => (0, template_utils_1.exit)({ kind: "fade", durationMs: T.fade * 1000, atSec: round3(endSec - T.fade) });
    /** Arrive `step` staggers into a beat; `endSec` undefined holds to the last frame. */
    const arrive = (startSec, step, endSec, kind = "rise") => {
        const enter = (0, template_utils_1.entrance)({ kind, durationMs: T.rise * 1000, atSec: round3(startSec + step * T.stagger), ease: "easeOut" });
        return endSec === undefined ? enter : (0, template_utils_1.composeMotion)(enter, leave(endSec));
    };
    const pieces = [];
    const piece = (rect, importance, source) => pieces.push({ rect: { ...rect, importance }, source });
    // ── chrome: on every frame ──
    piece(L.wordmark.rect, 1, textSource(L.wordmark.fit, ink, "wordmark", undefined));
    // One full-width line that slides in from the left over the whole clip: a
    // scalar x offset per frame, so the progress costs nothing per pixel.
    piece(L.bar, 1, (0, template_utils_1.tag)((0, template_utils_1.makeColorTile)(accent, { overlay: { xExpr: `-W*(1-min(1,t/${T.total}))` } }), "progress"));
    // ── beat 1: hello. Static at t=0 - frame 0 is the thumbnail. ──
    const out1 = leave(cut1);
    const disc = { kind: "inline-mask", ...(0, dsl_stdlib_1.circleMask)(L.avatar.w, L.avatar.h) };
    const discInner = { kind: "inline-mask", ...(0, dsl_stdlib_1.circleMask)(L.avatarInner.w, L.avatarInner.h) };
    piece(L.avatar, 1, (0, template_utils_1.bindProp)((0, template_utils_1.tag)((0, template_utils_1.makeColorTile)(accent, { mask: disc, overlay: out1 }), "avatar-ring"), "accent"));
    if (imageId) {
        piece(L.avatarInner, 2, (0, template_utils_1.bindProp)((0, template_utils_1.tag)({
            type: "media",
            mediaType: "image",
            assetId: imageId,
            placement: { fit: "cover" },
            mask: discInner,
            overlay: out1,
            editor: { owner: "template" },
        }, "avatar"), "recipientImage", 0));
    }
    else {
        piece(L.avatarInner, 2, (0, template_utils_1.bindProp)((0, template_utils_1.tag)((0, template_utils_1.makeColorTile)(mix(accent, bg, 0.22), { mask: discInner, overlay: out1 }), "avatar"), "recipientImage", 0));
        if (L.initials)
            piece(L.avatarInner, 3, textSource(L.initials, ink, "initials", out1, "center"));
    }
    piece(L.hello.rect, 2, (0, template_utils_1.bindProps)(textSource(L.hello.fit, ink, "hello", out1), [{ propKey: "recipientName" }, { propKey: "greeting" }]));
    if (L.handle)
        piece(L.handle.rect, 2, (0, template_utils_1.bindProp)(textSource(L.handle.fit, dim, "handle", out1), "recipientHandle"));
    // ── beat 2: why you. The question, then one reason per stagger. ──
    if (L.question)
        piece(L.question.rect, 2, (0, template_utils_1.bindProp)(textSource(L.question.fit, accent, "question", arrive(cut1, 0, cut2)), "question"));
    piece(L.rule, 2, (0, template_utils_1.tag)((0, template_utils_1.makeColorTile)(accent, { overlay: arrive(cut1, 1, cut2, "fade") }), "rule"));
    L.reasons.forEach((row, i) => {
        piece(row.rect, 2, (0, template_utils_1.bindProp)(textSource(row.fit, ink, `reason-${i}`, arrive(cut1, i + 1, cut2)), "reasons", i));
    });
    // ── beat 3: the pitch ──
    piece(L.brand.rect, 2, (0, template_utils_1.bindProp)(textSource(L.brand.fit, ink, "brand", arrive(cut2, 0, cut3)), "brandName"));
    if (L.tagline)
        piece(L.tagline.rect, 2, (0, template_utils_1.bindProp)(textSource(L.tagline.fit, accent, "tagline", arrive(cut2, 1, cut3)), "tagline"));
    if (L.pitch)
        piece(L.pitch.rect, 2, (0, template_utils_1.bindProp)(textSource(L.pitch.fit, dim, "pitch", arrive(cut2, 2, cut3)), "pitch"));
    // ── beat 4: the ask. No exit - a paused clip still shows the link. ──
    if (L.ctaLabel)
        piece(L.ctaLabel.rect, 2, (0, template_utils_1.bindProp)(textSource(L.ctaLabel.fit, ink, "cta-label", arrive(cut3, 0, undefined)), "ctaLabel"));
    if (L.pill && L.ctaUrl) {
        const pillMotion = arrive(cut3, 1, undefined, "fade");
        piece(L.pill, 2, (0, template_utils_1.tag)((0, template_utils_1.makeColorTile)(accent, { effects: { rounding: { cornerStyle: "pill" } }, overlay: pillMotion }), "cta-pill"));
        piece(L.pill, 3, (0, template_utils_1.bindProp)(textSource(L.ctaUrl, onColor(accent, bg, ink), "cta-url", pillMotion, "center"), "ctaUrl"));
    }
    if (L.signoff)
        piece(L.signoff.rect, 2, (0, template_utils_1.bindProp)(textSource(L.signoff.fit, dim, "signoff", arrive(cut3, 2, undefined)), "signoff"));
    const placed = (0, template_utils_1.placeInsetPieces)({ rootW: W, rootH: H, pieces });
    const doc = {
        kind: "mosaic_document",
        version: 1,
        m0: (0, dsl_stdlib_1.toM0String)(placed.m0, ID),
        assets,
        size: { width: W, height: H },
        fps: ctx.target.fps,
        // The length is authored (a prop, or the user's pin), so it out-ranks the hint.
        durationMs,
        backgroundColor: bg,
        sources: placed.sources,
        editor: { label: `Why You - ${copy.recipientName} from ${copy.brandName}` },
    };
    return (0, layout_1.withLayoutIntent)(doc, ctx, { templateId: ID, constraints: whyYouContract(L), debug: props.debugLayout === true });
}
