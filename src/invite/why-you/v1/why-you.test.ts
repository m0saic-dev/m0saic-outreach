import type { MosaicEngineContext, MosaicSource } from "@m0saic/types";
import { evaluateM0 } from "@m0saic/dsl-stdlib";
import { auditDefaultProps, resolvePropBindings, resolveTemplateOutputHints } from "@m0saic/template-utils";

import { asDocument, targetCtx } from "../../../__testutils__/render";
import { CONTRACT_CANVASES, layoutIntentOf, sweepLayout } from "../../../_shared/layout";
import type { WhyYouProps } from "./why-you";
import { WHY_YOU_MAX_SEC, WHY_YOU_MIN_SEC, WhyYouV1, layoutWhyYou, whyYouBeats, whyYouInitials } from "./why-you";

const ID = "@outreach/invite/why-you/v1";

const renderRaw = (props: WhyYouProps, ctx: MosaicEngineContext) =>
  Promise.resolve(WhyYouV1.render({ ...WhyYouV1.defaultProps, ...props }, ctx)).then(asDocument);
const render = (props: WhyYouProps = {}, w = 1080, h = 1080) => renderRaw(props, targetCtx(w, h));

const labelOf = (s: MosaicSource) => (s as { editor?: { label?: string } }).editor?.label;
const byLabel = (sources: MosaicSource[], label: string) => sources.find((s) => labelOf(s) === label);
const textOf = (s: MosaicSource | undefined) =>
  ((s as { layers?: Array<{ content: { text?: string } }> } | undefined)?.layers ?? []).map((l) => l.content.text ?? "").join("\n");
const overlayOf = (s: MosaicSource | undefined) =>
  (s as { overlay?: { alpha?: string; window?: { startSec?: number; endSec?: number } } } | undefined)?.overlay;

/** The copy an agent is most likely to hand over when it goes wrong: long, scraped, three full reasons. */
const LONG: WhyYouProps = {
  recipientName: "Maximiliana Featherstonehaugh-Abernathy",
  recipientHandle: "@maximiliana_featherstonehaugh_abernathy_builds",
  reasons: [
    "You have shipped a public changelog entry every single working day for the last three years running.",
    "Your team already runs four agents in production and writes about what breaks, in detail, every week.",
    "You asked in public how a video like this one gets made without anybody opening an editor.",
  ],
  brandName: "Northwind Intelligence Cooperative",
  tagline: "Warm introductions to exactly the right person, on autopilot, forever",
  pitch:
    "Tell Northwind who you need to meet and why. It searches your own network first, then asks the agents of the people you trust, finds the shortest path there and writes the introduction for you to approve.",
  ctaLabel: "Your personal invite is waiting for you right here",
  ctaUrl: "northwind-intelligence-cooperative.example/invite/maximiliana-featherstonehaugh",
  signoff: "Samantha Okonkwo-Lindqvist, co-founder and chief executive of Northwind Intelligence Cooperative",
};

describe(ID, () => {
  it("shows every default in the panel - no fallback hides in render()", () => {
    expect(auditDefaultProps(WhyYouV1)).toEqual([]);
  });

  it("binds every rect that shows a prop, and refuses none", async () => {
    const doc = await render();
    const { byProp, rejected } = resolvePropBindings(doc, 1080, 1080, { propsSchema: WhyYouV1.propsSchema });
    expect(rejected).toEqual([]);
    for (const key of ["recipientName", "greeting", "recipientHandle", "recipientImage", "question", "brandName", "tagline", "pitch", "ctaLabel", "ctaUrl", "signoff", "accent"]) {
      expect(byProp[key]?.length).toBeGreaterThanOrEqual(1);
    }
    // One handle per reason, by index.
    expect(byProp.reasons).toHaveLength(3);
  });

  it("keeps its layout contract at the seven canvases - defaults, long copy, one reason, a picture, bare", async () => {
    await sweepLayout(renderRaw, ID, {}, targetCtx);
    await sweepLayout(renderRaw, ID, LONG, targetCtx);
    await sweepLayout(renderRaw, ID, { reasons: ["One reason is enough."] }, targetCtx);
    await sweepLayout(renderRaw, ID, { recipientImage: ["/abs/avatar.jpg"] }, targetCtx);
    await sweepLayout(renderRaw, ID, { recipientHandle: "", greeting: "", question: "", tagline: "", pitch: "", ctaLabel: "", ctaUrl: "", signoff: "" }, targetCtx);
  });

  it("clears its safe minimum at every contract canvas", async () => {
    for (const [w, h] of CONTRACT_CANVASES) {
      const ev = evaluateM0(String((await render({}, w, h)).m0), { width: w, height: h });
      expect(ev.feasible && ev.meetsPrecision).toBe(true);
    }
  });

  it("keeps every rect inside the canvas, and the disc square, for long copy", () => {
    const copy = {
      recipientName: LONG.recipientName as string,
      recipientHandle: LONG.recipientHandle as string,
      hasImage: false,
      greeting: "Hey",
      question: "Why you?",
      reasons: LONG.reasons as string[],
      brandName: LONG.brandName as string,
      tagline: LONG.tagline as string,
      pitch: LONG.pitch as string,
      ctaLabel: LONG.ctaLabel as string,
      ctaUrl: LONG.ctaUrl as string,
      signoff: LONG.signoff as string,
    };
    for (const [w, h] of CONTRACT_CANVASES) {
      const L = layoutWhyYou(copy, w, h);
      const rects = [
        L.wordmark.rect, L.bar, L.avatar, L.avatarInner, L.hello.rect, L.handle?.rect, L.question?.rect, L.rule,
        ...L.reasons.map((r) => r.rect), L.brand.rect, L.tagline?.rect, L.pitch?.rect, L.ctaLabel?.rect, L.pill, L.signoff?.rect,
      ].filter((r): r is NonNullable<typeof r> => Boolean(r));
      for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(w);
        expect(r.y + r.h).toBeLessThanOrEqual(h);
      }
      expect(L.avatar.w).toBe(L.avatar.h);
      // A reason never takes more than two lines, whatever its length.
      for (const r of L.reasons) expect(r.fit.lines.length).toBeLessThanOrEqual(2);
    }
  });

  it("times the four beats as shares of the clip, and lands the last reason before its beat fades", () => {
    for (const sec of [WHY_YOU_MIN_SEC, 15, WHY_YOU_MAX_SEC]) {
      const T = whyYouBeats(sec);
      const [c1, c2, c3] = T.cuts;
      expect(c1).toBeGreaterThan(0);
      expect(c2).toBeGreaterThan(c1);
      expect(c3).toBeGreaterThan(c2);
      expect(T.total).toBeGreaterThan(c3);
      // Third reason: three staggers in, plus its ramp, is done before the exit fade starts.
      expect(c1 + 3 * T.stagger + T.rise).toBeLessThan(c2 - T.fade);
      // Sign-off: two staggers into the last beat, done before the clip ends.
      expect(c3 + 2 * T.stagger + T.rise).toBeLessThan(T.total);
    }
  });

  it("makes frame 0 the greeting: beat one has no entrance, only an exit", async () => {
    const doc = await render();
    const hello = byLabel(doc.sources, "hello");
    expect(textOf(hello)).toBe("Hey Alex,");
    expect(overlayOf(hello)?.window?.startSec).toBeUndefined();
    expect(overlayOf(hello)?.window?.endSec).toBeCloseTo(whyYouBeats(15).cuts[0], 3);
    // The ask holds to the last frame: an entrance, no exit.
    const url = overlayOf(byLabel(doc.sources, "cta-url"));
    expect(url?.window?.startSec).toBeGreaterThan(whyYouBeats(15).cuts[2]);
    expect(url?.window?.endSec).toBeUndefined();
  });

  it("follows durationSec, and an explicit pin overrides it", async () => {
    expect((await render({ durationSec: 20 })).durationMs).toBe(20000);
    expect(resolveTemplateOutputHints(WhyYouV1, { ...WhyYouV1.defaultProps, durationSec: 20 }).durationMs).toBe(20000);
    expect(resolveTemplateOutputHints(WhyYouV1, WhyYouV1.defaultProps).durationMs).toBe(WhyYouV1.outputHints?.durationMs);
    const pinned = { ...targetCtx(1080, 1080), userIntent: { durationMs: 9000 } } as unknown as MosaicEngineContext;
    expect((await renderRaw({}, pinned)).durationMs).toBe(9000);
  });

  it("draws a picture in the disc when given one, and the initials when not", async () => {
    const bare = await render();
    expect(textOf(byLabel(bare.sources, "initials"))).toBe("A");
    expect(Object.keys(bare.assets ?? {})).toEqual([]);

    const pictured = await render({ recipientImage: ["C:/people/quentin.jpg"] });
    expect(byLabel(pictured.sources, "initials")).toBeUndefined();
    const avatar = byLabel(pictured.sources, "avatar") as { type?: string; mask?: { kind?: string } };
    expect(avatar.type).toBe("media");
    expect(avatar.mask?.kind).toBe("inline-mask");
    expect(pictured.assets).toEqual({ "recipient-image": { kind: "file", path: "C:/people/quentin.jpg", mediaType: "image" } });
    expect(whyYouInitials("Quentin Smith Jr")).toBe("QS");
  });

  it("cleans scraped copy instead of drawing empty boxes", async () => {
    const doc = await render({
      recipientName: "Zo\u00eb \u{1F680}",
      tagline: "\u201cWarm\u201d intros \u2014 on autopilot\u2026",
    });
    expect(textOf(byLabel(doc.sources, "hello"))).toBe("Hey Zo\u00eb,");
    expect(textOf(byLabel(doc.sources, "tagline")).replace(/\n/g, " ")).toBe('"Warm" intros - on autopilot...');
  });

  it("drops an emptied line and keeps the rest", async () => {
    const doc = await render({ recipientHandle: "", tagline: "", signoff: "" });
    for (const label of ["handle", "tagline", "signoff"]) expect(byLabel(doc.sources, label)).toBeUndefined();
    for (const label of ["hello", "brand", "pitch", "cta-url"]) expect(byLabel(doc.sources, label)).toBeDefined();
  });

  it("is deterministic, stamps its contract, and fails fast on bad input", async () => {
    expect(await render()).toEqual(await render());
    expect(layoutIntentOf(await render())?.constraints.length).toBeGreaterThan(10);
    await expect(render({ accent: "gold" })).rejects.toThrow(/#rrggbb/);
    await expect(render({ recipientName: "  " })).rejects.toThrow(/recipientName is required/);
    await expect(render({ reasons: [] })).rejects.toThrow(/one to 3/);
    await expect(render({ reasons: ["a", "b", "c", "d"] })).rejects.toThrow(/one to 3/);
    await expect(render({ durationSec: 3 })).rejects.toThrow(/durationSec/);
    await expect(render({ recipientImage: ["a.jpg", "b.jpg"] })).rejects.toThrow(/zero or one/);
  });
});
