# AGENTS.md

Entry point for coding agents working in this repo. Humans want
[`README.md`](README.md).

## What this repo is

One-off marketing templates, each written for a specific job and kept
generic: an agent fills a props file and m0saic renders. Today:
`@outreach/invite/why-you/v1` (a personalized clip per recipient) and
`@outreach/social/live-hooks/v1` (the animated hook layer of a short-form
post; `hook-wall/v1` is its superseded static first version),
plus the hello-world front door. The namespace is `@outreach` (`src/repo.ts`); it
does not carry the m0saic name on purpose - hosts flag an unsigned repo
that calls itself m0saic.

This repo is **public**. No real company and no third person is named
anywhere in it: not in a default, a preview, an example, a comment or a
commit message. The one real person is the repo's author, who is the
recipient in `examples/`; every sender is made up.

## Before you write a template: the knowledge base and the examples

The reasoning behind every rule here lives in **`@m0saic/knowledge`** — the
m0 handbook, the engine mental models, the template-authoring contract, as
plain Markdown. After `npm install` it is at
`node_modules/@m0saic/knowledge/README.md` (start there, then
`docs/m0saic-thesis.md`, then the router in `docs/README.md`); on GitHub at
[m0saic-packages/packages/knowledge](https://github.com/m0saic-project/m0saic-packages/tree/main/packages/knowledge).

Then read code. Three public repos cover most of the product surface:

- [m0saic-template-repo-starter](https://github.com/m0saic-project/m0saic-template-repo-starter)
  — ~80 one-concept lessons, the curriculum; this repo is its compact twin.
- [m0saic-community-templates](https://github.com/m0saic-project/m0saic-community-templates)
  — the public library, one folder per publisher, signed releases.
- [m0saic-packages/packages/templates](https://github.com/m0saic-project/m0saic-packages/tree/main/packages/templates)
  — the official library that ships in the product; the house standard.

## The loop

```
npm run build        # tsc → copy assets → regenerate template-manifest.json → conventions gate
npm run verify       # build + lint + jest + loader contract + dependency policy
node tools/outreach.mjs examples/northwind-to-qsbuilds/props.json -o clip.mp4   # resolves the picture path, then m0saic make
```

`dist/` and `template-manifest.json` are generated AND committed (hosts load
the repo straight from GitHub). Never hand-edit them; change `src/`, rebuild,
commit both.

## Adding a template

1. `src/<pack>/<slug>/v1/<slug>.ts` — a plain template object via
   `defineMosaicTemplate`; deterministic, duration from `ctx.target`, every
   optional prop with a default, randomness seeded through a prop.
2. A row in `src/<pack>/registry.ts` (id `@<your-handle>/<pack>/<slug>/v1`,
   title with its `NN · ` ordinal).
3. A unit test beside it asserting something deterministic (geometry, the
   resolved tree, or a validation error).
4. `npm run verify` green; `m0saic doctor .` reports no blocking finding.

A template that has shipped never changes again: a fix is a new `v2` folder
and `deprecated: { replacement }` on the old one.

## What why-you/v1 already settled

- Geometry is one pure function (`layoutWhyYou`), the contract is another
  (`whyYouContract`), and `render()` returns `withLayoutIntent(...)`
  (`src/_shared/layout.ts`) so the test can sweep the seven canvases.
- Text is svg-rasterized and measured in the face it is drawn in; fit at
  `cell * 0.94 - 2px`, size the rect FROM the fitted block.
- Frame 0 is the finished greeting (no entrance on beat one): it is the
  thumbnail. Later beats use `entrance` / `exit` / `composeMotion`, which
  carry their own `window`.
- The canvas is `document.backgroundColor`, never a full-frame rect.
- A file prop needs an absolute path at render; `tools/outreach.mjs`
  resolves a relative one against the props file (why-you only).
- Shared text fitting lives in `src/_shared/text.ts` (the social pack uses it;
  why-you/v1 shipped with its own copy and is not edited).
- A changed template is a NEW folder. The manifest refuses two versions
  of one pack/slug, so the animated hook-wall shipped as `live-hooks/v1`
  and `hook-wall/v1` carries `deprecated: { replacement }`.
- live-hooks: each word is its own tight rect with a `slide-up` entrance
  (an offset and a gate, nothing per pixel). Gated tiles ride one overlay
  chain: the engine warns past 20 (`OVERLAY_CHAIN_DEEP`); 33 words (chain
  55) rendered correctly and `LIVE_HOOKS_MAX_UNITS` is set there. Nested
  sub-mosaics per tile are the way to lift it.
- hook-wall / live-hooks: an outlined hook is the glyph path from `textToPath` as two
  masked colour tiles (stroked dark, filled white) on one rect - the svg
  rasterizer has no stroke. Output kind and canvas come from
  `resolveOutputHints(props)`; the static hints are its answer at defaults.
- A template built as a private demo for someone renders their version
  into the gitignored `out/private/`; nothing of theirs is committed.

## Rules that fail silently

- An m0 string you did not validate (`validateM0String` from `@m0saic/dsl`).
- A split count above 12 that is not 5-smooth (`weightedSplit(…, { precision: 120 })`).
- A handle matching `/m0saic/i` — reserved; the guard is exact-match on
  release signatures, so a lookalike name earns a warning, never trust.
