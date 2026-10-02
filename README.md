# m0saic-outreach

**Personalized outreach video as a template.** Your agent already writes the
cold message. Have it fill a props file instead, and the message is a video
with the recipient's name and face on the first frame.

![Example clip: a made-up brand writing to @qsbuilds](examples/northwind-to-qsbuilds/clip.gif)

*The example above, with sound-free MP4: [`examples/northwind-to-qsbuilds/clip.mp4`](examples/northwind-to-qsbuilds/clip.mp4).
It was rendered from [this 22-line JSON file](examples/northwind-to-qsbuilds/props.json)
and one profile picture. Nobody opened an editor.*

## The idea

An outreach agent does three things per recipient: looks at their profile,
decides why they are worth writing to, writes the message. The output is
text, and text from an agent reads like text from an agent.

This repo is one [m0saic](https://m0saic.io) template,
`@outreach/invite/why-you/v1`. It takes what the agent already has and
renders a 15-second clip in four beats:

1. **Hello** - their picture, "Hey Quentin," and their handle. It is on
   screen from frame 0, so the thumbnail in a DM is their own name and face.
2. **Why you?** - one to three reasons, landing one at a time. This is the
   question a cold message never answers.
3. **The pitch** - your brand, tagline and a sentence or two.
4. **The ask** - the call to action and the link, held to the last frame.

The agent does no video work. It writes JSON; m0saic lays out, fits and
animates. The same props render the same pixels, so a list of a thousand
recipients is a loop, and a clip you approved once stays approved.

## Render one: three pastes

You need Node 18.17+. `dist/` is committed, so a clone renders with no
`npm install` in the repo and no build.

**1. Install m0saic** (once per machine; `setup` fetches a pinned ffmpeg
and asks before it downloads):

```
npm i -g m0saic && m0saic setup
```

**2. Get the template:**

```
git clone https://github.com/m0saic-dev/m0saic-outreach && cd m0saic-outreach
```

**3. Render it** at its defaults (a made-up brand writing to a made-up Alex):

```
m0saic make @outreach/invite/why-you/v1 --template-repo . -o demo.mp4
```

That takes about 20 seconds on a laptop. To make it yours, hand it props.
Anything you leave out keeps its default:

```
m0saic make @outreach/invite/why-you/v1 --template-repo . -o jordan.mp4 --props '{"recipientName":"Jordan","recipientHandle":"@jordanships","brandName":"Acme","tagline":"Ship it faster","accent":"#5eead4","background":"#0b1020"}'
```

To reproduce the clip at the top of this page, picture included:

```
node tools/outreach.mjs examples/northwind-to-qsbuilds/props.json -o quentin.mp4
```

Other canvases re-flow:

```
node tools/outreach.mjs examples/northwind-to-qsbuilds/props.json -o wide.mp4 -w 1920 -h 1080
node tools/outreach.mjs examples/northwind-to-qsbuilds/props.json -o reel.mp4 -w 1080 -h 1920
```

`tools/outreach.mjs` is a thin wrapper over
`m0saic make @outreach/invite/why-you/v1 --template-repo . --props @file.json`.
It exists because a picture prop needs an absolute path at render time and a
props file that travels wants a relative one; the wrapper resolves
`recipientImage` against the JSON file.

## The props

Everything is optional except the two names. An empty string removes that
line and the layout closes up.

| Prop | What it is | Example |
|---|---|---|
| `recipientName` | Who the clip is for. Required. | `"Quentin"` |
| `recipientHandle` | Their handle, under the greeting. | `"@qsbuilds"` |
| `recipientImage` | A profile picture, cropped to a disc. Without one the disc shows their initials. | `"avatar.jpg"` |
| `greeting` | The word before the name. | `"Hey"` |
| `question` | The line that opens beat two. | `"Why you?"` |
| `reasons` | One to three reasons, a line each (two lines at most when wrapped). | `["You ship in public."]` |
| `brandName` | Who is writing. Required. | `"Northwind"` |
| `tagline` | Under the brand name, in the accent. | `"Warm intros, on autopilot"` |
| `pitch` | One or two sentences. Breaks at the sentences when it can. | |
| `ctaLabel` | The line above the link. | `"Your personal invite"` |
| `ctaUrl` | The link, in the pill. | `"northwind.example/invite/quentin"` |
| `signoff` | Who signed it. | `"Sam, founder of Northwind"` |
| `accent`, `background`, `ink` | Your brand colours, `#rrggbb`. | `"#5eead4"` |
| `durationSec` | Clip length, 8 to 60. The beats keep their shares. | `15` |

Copy is fitted, never clipped: a long name shrinks, a long reason wraps to
two lines, and only at the smallest size does anything get an ellipsis.
Text is Latin script. Emoji and other scripts in scraped profile copy are
dropped rather than drawn as empty boxes.

## Render a list

Put what every clip shares in `shared` and one object per person in
`recipients`:

```json
{
  "shared": {
    "brandName": "Northwind",
    "tagline": "Warm intros, on autopilot",
    "pitch": "Tell Northwind who you need to meet. It finds the shortest trusted path there.",
    "ctaLabel": "Your invite is waiting",
    "signoff": "Sam, founder of Northwind",
    "accent": "#7c9cff"
  },
  "recipients": [
    {
      "recipientName": "Alex",
      "recipientHandle": "@alexbuilds",
      "recipientImage": "avatars/alex.jpg",
      "reasons": ["You ship in public, every single day.", "Your agents already do the busywork."],
      "ctaUrl": "northwind.example/invite/alex"
    }
  ]
}
```

```
node tools/outreach.mjs recipients.json --out-dir out
```

One MP4 per recipient lands in `out/`, named after the handle, rendered one
at a time. `--dry` prints the plan without rendering.

## Wiring it into an agent

The step your agent adds is small. For each recipient it already researches,
ask it for the JSON object above instead of (or as well as) the message
text, then run the command. In practice the prompt change is one paragraph:

> For each recipient, return a JSON object with `recipientName`,
> `recipientHandle`, the path of their downloaded profile picture as
> `recipientImage`, and `reasons`: up to three specific, true, one-line
> reasons this person is a fit, each under 60 characters, drawn from their
> public profile. Do not flatter and do not invent.

The reasons are the whole clip. A reason that could be sent to anyone
("you're a top builder") makes a personalized video feel more automated,
not less. A reason that names what the person actually does is what makes
them wonder how the video was made.

## In Mosaic Desktop

Templates → **Add source** → paste this repo's URL → consent. The template
opens in Make with every line bound to its prop: double-click a line to
edit it in place, drop a picture on the disc.

## About the example

`examples/northwind-to-qsbuilds` is addressed to this repo's author,
[@qsbuilds](https://x.com/qsbuilds), so the recipient is real and the
picture is his own. The sender, Northwind, is made up, and so is everything
in the template's defaults.

## Develop

```
npm install
npm run verify     # build + lint + jest + loader contract + dependency policy
m0saic doctor .    # the same conventions, from the CLI
```

The template is `src/invite/why-you/v1/why-you.ts`; its header comment is
the design. Its test sweeps the layout contract at seven canvases with
defaults, long copy, one reason, a picture and nothing optional.
`dist/` and `template-manifest.json` are committed, so run `npm run build`
before every commit. A shipped template never changes: a fix is a `v2`
folder. Agents: read [`AGENTS.md`](AGENTS.md) first.

This is a third-party template repo (namespace `@outreach`, unsigned).
Loading any template repo runs its code on your machine; `src/` is the
whole story and `dist/` is its build.

## License

MIT. Built with the `@m0saic/*` packages from npm. The example profile
picture belongs to its subject and is not covered by the license.
