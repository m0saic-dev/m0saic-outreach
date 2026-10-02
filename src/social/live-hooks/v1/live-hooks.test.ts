import type { MosaicEngineContext, MosaicSource } from "@m0saic/types";
import { evaluateM0 } from "@m0saic/dsl-stdlib";
import { auditDefaultProps, resolvePropBindings, resolveTemplateOutputHints } from "@m0saic/template-utils";

import { asDocument, targetCtx } from "../../../__testutils__/render";
import { CONTRACT_CANVASES, sweepLayout } from "../../../_shared/layout";
import type { LiveHooksProps } from "./live-hooks";
import { LIVE_HOOKS_MAX_UNITS, LIVE_HOOKS_SAFE, LiveHooksV1, layoutLiveHooks, liveHooksTimes } from "./live-hooks";

const ID = "@outreach/social/live-hooks/v1";

const renderRaw = (props: LiveHooksProps, ctx: MosaicEngineContext) =>
  Promise.resolve(LiveHooksV1.render({ ...LiveHooksV1.defaultProps, ...props }, ctx)).then(asDocument);
const render = (props: LiveHooksProps = {}, w = 1920, h = 1080) => renderRaw(props, targetCtx(w, h));

const labelOf = (s: MosaicSource) => (s as { editor?: { label?: string } }).editor?.label;
const byLabel = (sources: MosaicSource[], label: string) => sources.filter((s) => labelOf(s) === label);
const overlayOf = (s: MosaicSource | undefined) =>
  (s as { overlay?: { enable?: string; yExpr?: string; window?: { startSec?: number } } } | undefined)?.overlay;

const LONG = [
  "I could LITERALLY hug the stranger on the train who showed me this exact thing three weeks ago",
  "10 YEARS of doing this the slow way and I am only just NOW finding out there was a shortcut the whole time",
  "nobody",
  "POV: the group chat finally convinced you to try it and now you will not stop talking about it",
];
const ONE = ["POV: you finally stopped doing this by hand"];
const copy = (hooks: string[], motion: "words" | "lines" | "pop" | "none", style: "outline" | "box" = "outline") =>
  ({ hooks, title: "A title", note: "A note", style, position: "top" as const, motion });

describe(ID, () => {
  it("shows every default in the panel", () => {
    expect(auditDefaultProps(LiveHooksV1)).toEqual([]);
  });

  it("binds each hook by index, the visual, the title, the note and the accent", async () => {
    const doc = await render();
    const { byProp, rejected } = resolvePropBindings(doc, 1920, 1080, { propsSchema: LiveHooksV1.propsSchema });
    expect(rejected).toEqual([]);
    expect(byProp.hooks).toHaveLength(3);
    for (const key of ["visual", "title", "note", "accent"]) expect(byProp[key]?.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps its layout contract at the seven canvases - every motion, both styles, long hooks, one hook, a visual", async () => {
    await sweepLayout(renderRaw, ID, {}, targetCtx);
    await sweepLayout(renderRaw, ID, { hookStyle: "box" }, targetCtx);
    await sweepLayout(renderRaw, ID, { hookMotion: "lines" }, targetCtx);
    await sweepLayout(renderRaw, ID, { hookMotion: "none", hookStyle: "box" }, targetCtx);
    await sweepLayout(renderRaw, ID, { hooks: LONG }, targetCtx);
    await sweepLayout(renderRaw, ID, { hooks: LONG, hookStyle: "box", hookPosition: "middle" }, targetCtx);
    await sweepLayout(renderRaw, ID, { hooks: ONE }, targetCtx);
    await sweepLayout(renderRaw, ID, { hooks: ONE, hookStyle: "box", visual: ["/abs/take.mp4"] }, targetCtx);
    await sweepLayout(renderRaw, ID, { title: "", note: "", visual: ["/abs/take.jpg"], hookMotion: "pop" }, targetCtx);
  });

  it("clears its safe minimum at every contract canvas", async () => {
    for (const [w, h] of CONTRACT_CANVASES) {
      for (const hooks of [undefined, ONE]) {
        const ev = evaluateM0(String((await render(hooks ? { hooks } : {}, w, h)).m0), { width: w, height: h });
        expect(ev.feasible && ev.meetsPrecision).toBe(true);
      }
    }
  });

  it("keeps every hook inside the safe area and every unit inside its post, at one shared size", () => {
    for (const style of ["outline", "box"] as const) {
      for (const motion of ["words", "lines", "pop", "none"] as const) {
        for (const [w, h] of [...CONTRACT_CANVASES, [1080, 1920] as const]) {
          for (const hooks of [LONG, ONE]) {
            const L = layoutLiveHooks(copy(hooks, motion, style), w, h);
            expect(new Set(L.tiles.map((t) => t.fit.px)).size).toBe(1);
            for (const t of L.tiles) {
              expect(t.hook.x).toBeGreaterThanOrEqual(t.safe.x);
              expect(t.hook.x + t.hook.w).toBeLessThanOrEqual(t.safe.x + t.safe.w);
              expect(t.hook.y).toBeGreaterThanOrEqual(t.safe.y);
              expect(t.hook.y + t.hook.h).toBeLessThanOrEqual(t.safe.y + t.safe.h);
              expect(t.safe.x + t.safe.w).toBeLessThanOrEqual(Math.ceil(t.rect.x + (1 - LIVE_HOOKS_SAFE.right) * t.rect.w) + 1);
              expect(t.fit.width).toBeLessThanOrEqual(t.hook.w);
              expect(t.fit.lines.length).toBeLessThanOrEqual(4);
              expect(t.units.length).toBeGreaterThanOrEqual(1);
              for (const u of t.units) {
                expect(u.rect.x).toBeGreaterThanOrEqual(t.rect.x);
                expect(u.rect.x + u.rect.w).toBeLessThanOrEqual(t.rect.x + t.rect.w);
                expect(u.rect.y).toBeGreaterThanOrEqual(t.rect.y);
                expect(u.rect.y + u.rect.h).toBeLessThanOrEqual(t.rect.y + t.rect.h);
              }
            }
          }
        }
      }
    }
  });

  it("cuts a hook into its words, in reading order, without losing one", () => {
    const hooks = ["nobody told me it could be this easy", "3 things I wish I knew a year ago"];
    const L = layoutLiveHooks(copy(hooks, "words"), 1920, 1080);
    expect(L.motion).toBe("words");
    L.tiles.forEach((t, i) => {
      expect(t.units.map((u) => u.text).join(" ")).toBe(hooks[i]);
      // Words on one line run left to right; a new line starts further down.
      for (let j = 1; j < t.units.length; j++) {
        const a = t.units[j - 1].rect;
        const b = t.units[j].rect;
        expect(b.y > a.y || b.x > a.x).toBe(true);
      }
    });
    const lines = layoutLiveHooks(copy(hooks, "lines"), 1920, 1080);
    lines.tiles.forEach((t) => expect(t.units.map((u) => u.text)).toEqual(t.fit.lines));
  });

  it("lands units in order, tiles one after another, and steps the motion down past its budget", () => {
    const times = liveHooksTimes([3, 2], "words");
    expect(times[0]).toEqual([0.3, 0.43, 0.56]);
    expect(times[1][0] as number).toBeGreaterThan(times[0][0] as number);
    expect(liveHooksTimes([2], "none")).toEqual([[null, null]]);

    const long = layoutLiveHooks(copy(LONG, "words"), 1920, 1080);
    const units = long.tiles.reduce((a, t) => a + t.units.length, 0);
    expect(long.motion).not.toBe("words");
    expect(units).toBeLessThanOrEqual(LIVE_HOOKS_MAX_UNITS);
    expect(layoutLiveHooks(copy(ONE, "words"), 1080, 1920).motion).toBe("words");
  });

  it("moves a unit with an offset and a gate, and leaves a still alone", async () => {
    const doc = await render();
    const first = overlayOf(byLabel(doc.sources, "hook-0-0")[0]);
    expect(first?.enable).toBe("gte(t,0.3)");
    expect(first?.yExpr).toBeDefined();
    expect(first?.window?.startSec).toBe(0.3);
    expect(overlayOf(byLabel(doc.sources, "hook-edge-0-0")[0])).toEqual(first);
    const still = await render({ hookMotion: "none" });
    expect(overlayOf(byLabel(still.sources, "hook-0-0")[0])).toBeUndefined();
    expect(byLabel(still.sources, "hook-0-1")).toHaveLength(0);
  });

  it("draws an outlined unit as one glyph path twice: stroked dark, filled white", async () => {
    const doc = await render();
    const edge = byLabel(doc.sources, "hook-edge-0-0")[0] as { mask?: { localPath?: string; strokes?: Array<{ d: string; width: number }> } };
    const fill = byLabel(doc.sources, "hook-0-0")[0] as { mask?: { localPath?: string; strokes?: unknown } };
    expect(edge.mask?.localPath?.length).toBeGreaterThan(50);
    expect(fill.mask?.localPath).toBe(edge.mask?.localPath);
    expect(edge.mask?.strokes?.[0].d).toBe(edge.mask?.localPath);
    expect(fill.mask?.strokes).toBeUndefined();
  });

  it("is the post itself for one hook, and tiles under a title for several", async () => {
    const wall = await render();
    expect(byLabel(wall.sources, "title")).toHaveLength(1);
    expect(byLabel(wall.sources, "post")).toHaveLength(3);
    const post = await render({ hooks: ONE }, 1080, 1920);
    expect(byLabel(post.sources, "title")).toHaveLength(0);
    expect(byLabel(post.sources, "post")).toHaveLength(0);
  });

  it("answers its canvas and its kind from the props", () => {
    const hints = (p: LiveHooksProps) => resolveTemplateOutputHints(LiveHooksV1, { ...LiveHooksV1.defaultProps, ...p });
    expect(hints({})).toMatchObject({ width: 1920, height: 1080, format: { kind: "video", container: "mp4" } });
    expect(hints({ hooks: ONE })).toMatchObject({ width: 1080, height: 1920, format: { kind: "video" } });
    expect(hints({ hookMotion: "none" })).toMatchObject({ format: { kind: "image", container: "png" } });
    expect(hints({ hookMotion: "none", visual: ["C:/takes/take.mp4"] })).toMatchObject({ format: { kind: "video" } });
  });

  it("gives a clip its length, and a still none", async () => {
    expect((await render({ durationSec: 8 })).durationMs).toBe(8000);
    // A still authors no length: the host's own target (the test ctx's 2 s) stands.
    expect((await render({ hookMotion: "none", visual: ["C:/takes/take.jpg"] })).durationMs).toBe(2000);
    const clip = await render({ hookMotion: "none", visual: ["C:/takes/take.mp4"] });
    expect(clip.assets).toEqual({ visual: { kind: "file", path: "C:/takes/take.mp4", mediaType: "video" } });
    expect(clip.durationMs).toBe(6000);
  });

  it("is deterministic, drops emoji, and fails fast on bad input", async () => {
    expect(await render()).toEqual(await render());
    const doc = await render({ hooks: ["so good \u{1F62D}\u270C\uFE0F trust me", "second"], hookStyle: "box", hookMotion: "none" });
    const text = (byLabel(doc.sources, "hook-0-0")[0] as { layers: Array<{ content: { text: string } }> }).layers[0].content.text;
    expect(text.replace(/\n/g, " ")).toBe("so good trust me");
    await expect(render({ hooks: [] })).rejects.toThrow(/one to 4/);
    await expect(render({ hookMotion: "spin" as never })).rejects.toThrow(/hookMotion/);
    await expect(render({ hookStyle: "neon" as never })).rejects.toThrow(/hookStyle/);
    await expect(render({ accent: "orange" })).rejects.toThrow(/#rrggbb/);
    await expect(render({ visual: ["a.jpg", "b.jpg"] })).rejects.toThrow(/zero or one/);
  });
});
