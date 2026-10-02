import type { LayoutConstraint } from "@m0saic/template-utils";
/**
 * `@outreach/invite/why-you/v1` - a short clip addressed to ONE person: their
 * name and face, the reasons you picked them, your pitch, their link.
 *
 * ONE CONCEPT: **the message is a props file.** An agent that already writes
 * a cold DM per recipient has everything this needs - a name, a handle, a
 * profile picture, a few facts, the link. It writes those into JSON and the
 * render is the personalised video; nothing is edited and nothing is
 * prompted per frame. The same props render the same pixels, so a batch of
 * a thousand is a loop.
 *
 * Four beats, timed as shares of the clip so any duration keeps the rhythm:
 *
 *   1. hello    - the picture, "Hey <name>," and the handle. Static from
 *                 frame 0: the first frame is the thumbnail, and their own
 *                 name and face is what stops the scroll.
 *   2. why you  - the question a cold message never answers, then one to
 *                 three reasons, landing one at a time.
 *   3. the pitch - brand, tagline, one paragraph.
 *   4. the ask  - the call to action, the link in a pill, who signed it. It
 *                 holds to the last frame, so a paused clip shows the link.
 *
 * The rule that bites: **a file prop needs an ABSOLUTE path.** A relative
 * `recipientImage` does not resolve at render and the clip fails on a
 * missing input. `tools/outreach.mjs` resolves paths against the props file
 * for you. With no picture the disc shows the recipient's initials, so a
 * profile without an avatar still gets a personal first frame.
 *
 * Text is Latin (the bundled Roboto): emoji and other scripts in scraped
 * profile copy are dropped rather than drawn as empty boxes, and curly
 * quotes and long dashes are folded to their ASCII forms.
 */
export type WhyYouProps = {
    /** Who the clip is for - the name in the greeting, and the initials on the disc. Required. */
    recipientName?: string;
    /** Their handle, under the greeting. Empty removes the line. */
    recipientHandle?: string;
    /** Zero or one profile picture (absolute path). Empty draws the initials disc. */
    recipientImage?: string[];
    /** The word before the name. Empty leaves the name alone. */
    greeting?: string;
    /** The line that opens beat two. Empty removes it. */
    question?: string;
    /** One to three reasons you picked this person, one line each. */
    reasons?: string[];
    /** Who is writing - the wordmark, and the big line of beat three. Required. */
    brandName?: string;
    /** The brand's tagline, under its name. Empty removes it. */
    tagline?: string;
    /** One or two sentences on what you offer. Empty removes it. */
    pitch?: string;
    /** The line above the link. Empty removes it. */
    ctaLabel?: string;
    /** The link, in the pill. Empty removes the pill. */
    ctaUrl?: string;
    /** Who signed it, under the link. Empty removes it. */
    signoff?: string;
    /** The disc ring, the question, the rule, the pill, the progress line (#rrggbb). */
    accent?: string;
    /** The page (#rrggbb). */
    background?: string;
    /** The text (#rrggbb). */
    ink?: string;
    /** Clip length in whole seconds (8..60). The four beats keep their shares. */
    durationSec?: number;
    /** Dev-only: check the layout contract and draw it over the frame. */
    debugLayout?: boolean;
};
export declare const WHY_YOU_MIN_SEC = 8;
export declare const WHY_YOU_MAX_SEC = 60;
export declare const WHY_YOU_MAX_REASONS = 3;
export type WhyYouBeats = {
    /** Clip length in seconds. */
    total: number;
    /** Where beats two, three and four begin. */
    cuts: [number, number, number];
    /** Exit fade length. */
    fade: number;
    /** Entrance ramp length. */
    rise: number;
    /** Delay between two staggered entrances. */
    stagger: number;
};
/**
 * The beats as shares of the clip - 17% hello, 37% why you (three reasons
 * are the most to read), 26% the pitch, 20% the ask - with ramps that
 * shorten on a short clip, so the last reason has always landed before its
 * beat fades.
 */
export declare function whyYouBeats(totalSec: number): WhyYouBeats;
export type WhyYouFace = "regular" | "bold" | "italic";
export type WhyYouRect = {
    x: number;
    y: number;
    w: number;
    h: number;
};
export type WhyYouFit = {
    lines: string[];
    px: number;
    face: WhyYouFace;
    width: number;
    h: number;
};
export type WhyYouBlock = {
    fit: WhyYouFit;
    rect: WhyYouRect;
};
export type WhyYouCopy = {
    recipientName: string;
    recipientHandle: string;
    hasImage: boolean;
    greeting: string;
    question: string;
    reasons: string[];
    brandName: string;
    tagline: string;
    pitch: string;
    ctaLabel: string;
    ctaUrl: string;
    signoff: string;
};
export type WhyYouLayout = {
    W: number;
    H: number;
    /** Landscape puts the disc beside the greeting; everything else stacks. */
    wide: boolean;
    wordmark: WhyYouBlock;
    bar: WhyYouRect;
    /** The accent ring: a square, so the disc stays round. */
    avatar: WhyYouRect;
    /** The picture (or the initials disc), inset by the ring. */
    avatarInner: WhyYouRect;
    initials: WhyYouFit | null;
    hello: WhyYouBlock;
    handle: WhyYouBlock | null;
    question: WhyYouBlock | null;
    rule: WhyYouRect;
    reasons: WhyYouBlock[];
    brand: WhyYouBlock;
    tagline: WhyYouBlock | null;
    pitch: WhyYouBlock | null;
    ctaLabel: WhyYouBlock | null;
    pill: WhyYouRect | null;
    ctaUrl: WhyYouFit | null;
    signoff: WhyYouBlock | null;
};
/** Up to two initials: the first letters of the first two words that start with a letter or digit. */
export declare function whyYouInitials(name: string): string;
/**
 * The whole geometry. Chrome first (the wordmark top-left, the progress line
 * on the bottom edge), then each beat as a left-aligned stack centred in the
 * stage between them. Every text rect is sized from its fitted block, so the
 * contract's `textFits` checks the real copy against the real box.
 */
export declare function layoutWhyYou(copy: WhyYouCopy, W: number, H: number): WhyYouLayout;
/**
 * What the geometry promises: every fitted text fits the box it got, the
 * disc is a square (so its mask is a circle), the wordmark lives in the top
 * band and the progress line spans the bottom edge.
 */
export declare function whyYouContract(L: WhyYouLayout): LayoutConstraint[];
export declare const WhyYouV1: import("@m0saic/types").MosaicTemplate<WhyYouProps, import("@m0saic/types").MosaicTemplateOutputs, import("@m0saic/types").MosaicTemplateUpstreamVariables, import("@m0saic/types").MosaicTemplateUpstreamData, import("@m0saic/types").MosaicTemplateSidecars>;
export default WhyYouV1;
