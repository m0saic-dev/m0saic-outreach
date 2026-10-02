import type { MosaicEngineContext, MosaicSource } from "@m0saic/types";
import { evaluateM0 } from "@m0saic/dsl-stdlib";
import { auditDefaultProps, resolvePropBindings, resolveTemplateOutputHints } from "@m0saic/template-utils";

import { asDocument, targetCtx } from "../../../__testutils__/render";
import { CONTRACT_CANVASES, sweepLayout } from "../../../_shared/layout";
import { budget } from "../../../_shared/text";
import type { HookWallProps } from "./hook-wall";
import { HOOK_SAFE, HookWallV1, layoutHookWall } from "./hook-wall";

const ID = "@outreach/social/hook-wall/v1";

const renderRaw = (props: HookWallProps, ctx: MosaicEngineContext) =>
  Promise.resolve(HookWallV1.render({ ...HookWallV1.defaultProps, ...props }, ctx)).then(asDocument);
const render = (props: HookWallProps = {}, w = 1920, h = 1080) => renderRaw(props, targetCtx(w, h));

const labelOf = (s: MosaicSource) => (s as { editor?: { label?: string } }).editor?.label;
const byLabel = (sources: MosaicSource[], label: string) => sources.filter((s) => labelOf(s) === label);

const LONG = [
  "I could LITERALLY hug the stranger on the train who showed me this exact thing three weeks ago",
  "10 YEARS of doing this the slow way and I am only just NOW finding out there was a shortcut the whole time",
  "nobody",
  "POV: the group chat finally convinced you to try it and now you will not stop talking about it",
];
const ONE = ["POV: you finally stopped doing this by hand"];

describe(ID, () => {
  it("shows every default in the panel", () => {
    expect(auditDefaultProps(HookWallV1)).toEqual([]);
  });

  it("binds each hook by index, the visual, the title, the note and the accent", async () => {
    const doc = await render();
    const { byProp, rejected } = resolvePropBindings(doc, 1920, 1080, { propsSchema: HookWallV1.propsSchema });
    expect(rejected).toEqual([]);
    expect(byProp.hooks).toHaveLength(3);
    for (const key of ["visual", "title", "note", "accent"]) expect(byProp[key]?.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps its layout contract at the seven canvases - both styles, long hooks, one hook, a visual", async () => {
    await sweepLayout(renderRaw, ID, {}, targetCtx);
    await sweepLayout(renderRaw, ID, { hookStyle: "box" }, targetCtx);
    await sweepLayout(renderRaw, ID, { hooks: LONG }, targetCtx);
    await sweepLayout(renderRaw, ID, { hooks: LONG, hookStyle: "box", hookPosition: "middle" }, targetCtx);
    await sweepLayout(renderRaw, ID, { hooks: ONE }, targetCtx);
    await sweepLayout(renderRaw, ID, { hooks: ONE, hookStyle: "box", visual: ["/abs/take.mp4"] }, targetCtx);
    await sweepLayout(renderRaw, ID, { title: "", note: "", visual: ["/abs/take.jpg"] }, targetCtx);
  });

  it("clears its safe minimum at every contract canvas", async () => {
    for (const [w, h] of CONTRACT_CANVASES) {
      for (const hooks of [undefined, ONE]) {
        const ev = evaluateM0(String((await render(hooks ? { hooks } : {}, w, h)).m0), { width: w, height: h });
        expect(ev.feasible && ev.meetsPrecision).toBe(true);
      }
    }
  });

  it("keeps every hook inside the platform's safe area, at one shared size, whatever its length", () => {
    for (const style of ["outline", "box"] as const) {
      for (const [w, h] of [...CONTRACT_CANVASES, [1080, 1920] as const]) {
        for (const hooks of [LONG, ONE]) {
          const L = layoutHookWall({ hooks, title: "A title", note: "A note", style, position: "top" }, w, h);
          expect(new Set(L.tiles.map((t) => t.fit.px)).size).toBe(1);
          for (const t of L.tiles) {
            // The hook rect is inside the safe rect, which is inside the post.
            expect(t.hook.x).toBeGreaterThanOrEqual(t.safe.x);
            expect(t.hook.x + t.hook.w).toBeLessThanOrEqual(t.safe.x + t.safe.w);
            expect(t.hook.y).toBeGreaterThanOrEqual(t.safe.y);
            expect(t.hook.y + t.hook.h).toBeLessThanOrEqual(t.safe.y + t.safe.h);
            expect(t.safe.x + t.safe.w).toBeLessThanOrEqual(Math.ceil(t.rect.x + (1 - HOOK_SAFE.right) * t.rect.w) + 1);
            // The measured text, plus the outline's reach, fits the rect it is drawn in.
            expect(t.fit.width + 2 * L.edge).toBeLessThanOrEqual(Math.max(budget(t.hook.w), t.fit.width));
            expect(t.fit.width).toBeLessThanOrEqual(t.hook.w);
            expect(t.fit.lines.length).toBeLessThanOrEqual(4);
          }
        }
      }
    }
  });

  it("draws an outlined hook as one glyph path twice: stroked dark, filled white", async () => {
    const doc = await render();
    const edge = byLabel(doc.sources, "hook-edge-0")[0] as { mask?: { localPath?: string; strokes?: Array<{ d: string; width: number }> } };
    const fill = byLabel(doc.sources, "hook-0")[0] as { mask?: { localPath?: string; strokes?: unknown } };
    expect(edge.mask?.localPath?.length).toBeGreaterThan(100);
    expect(fill.mask?.localPath).toBe(edge.mask?.localPath);
    expect(edge.mask?.strokes?.[0].d).toBe(edge.mask?.localPath);
    expect(edge.mask?.strokes?.[0].width).toBeGreaterThanOrEqual(2);
    expect(fill.mask?.strokes).toBeUndefined();
  });

  it("is the post itself for one hook, and tiles under a title for several", async () => {
    const wall = await render();
    expect(byLabel(wall.sources, "title")).toHaveLength(1);
    expect(byLabel(wall.sources, "post")).toHaveLength(3);
    const post = await render({ hooks: ONE }, 1080, 1920);
    expect(byLabel(post.sources, "title")).toHaveLength(0);
    expect(byLabel(post.sources, "index-0")).toHaveLength(0);
    // Alone with no visual, the sky is the document background, never a full-frame rect.
    expect(byLabel(post.sources, "post")).toHaveLength(0);
  });

  it("answers its canvas and its kind from the props", () => {
    const hints = (p: HookWallProps) => resolveTemplateOutputHints(HookWallV1, { ...HookWallV1.defaultProps, ...p });
    expect(hints({})).toMatchObject({ width: 1920, height: 1080, format: { kind: "image" } });
    expect(hints({ hooks: ONE })).toMatchObject({ width: 1080, height: 1920, format: { kind: "image" } });
    expect(hints({ visual: ["C:/takes/take.mp4"] })).toMatchObject({ format: { kind: "video", container: "mp4" } });
    expect(hints({ visual: ["C:/takes/take.JPG"] })).toMatchObject({ format: { kind: "image" } });
  });

  it("puts one visual under every tile, and gives a video visual a duration", async () => {
    const still = await render({ visual: ["C:/takes/take.jpg"] });
    expect(still.assets).toEqual({ visual: { kind: "file", path: "C:/takes/take.jpg", mediaType: "image" } });
    expect(byLabel(still.sources, "post")).toHaveLength(3);
    // A still authors no length: the host's own target (the test ctx's 2 s) stands, not durationSec.
    expect(still.durationMs).toBe(2000);
    const clip = await render({ visual: ["C:/takes/take.mp4"], durationSec: 8 });
    expect(clip.assets).toEqual({ visual: { kind: "file", path: "C:/takes/take.mp4", mediaType: "video" } });
    expect(clip.durationMs).toBe(8000);
  });

  it("is deterministic, drops emoji, and fails fast on bad input", async () => {
    expect(await render()).toEqual(await render());
    const L = layoutHookWall({ hooks: ["a"], title: "", note: "", style: "outline", position: "top" }, 1080, 1920);
    expect(L.wall).toBe(false);
    const doc = await render({ hooks: ["so good \u{1F62D}\u270C\uFE0F trust me", "second"], hookStyle: "box" });
    const text = (byLabel(doc.sources, "hook-0")[0] as { layers: Array<{ content: { text: string } }> }).layers[0].content.text;
    expect(text.replace(/\n/g, " ")).toBe("so good trust me");
    await expect(render({ hooks: [] })).rejects.toThrow(/one to 4/);
    await expect(render({ hooks: ["a", "b", "c", "d", "e"] })).rejects.toThrow(/one to 4/);
    await expect(render({ hookStyle: "neon" as never })).rejects.toThrow(/hookStyle/);
    await expect(render({ accent: "orange" })).rejects.toThrow(/#rrggbb/);
    await expect(render({ visual: ["a.jpg", "b.jpg"] })).rejects.toThrow(/zero or one/);
  });
});
