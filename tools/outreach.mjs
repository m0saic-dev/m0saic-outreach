#!/usr/bin/env node
/**
 * outreach — render one clip per recipient from a JSON file.
 *
 *   node tools/outreach.mjs <file.json> [-o out.mp4] [--out-dir dir] [-w 1080] [-h 1080] [--dry]
 *
 * The file is either ONE props object (see examples/northwind-to-qsbuilds/props.json),
 * or a batch:
 *
 *   { "shared": { ...props every clip has... },
 *     "recipients": [ { ...props for one person... }, ... ] }
 *
 * A batch writes <out-dir>/<handle-or-name>.mp4 per recipient, one render at
 * a time. This wrapper exists for one reason: a file prop needs an ABSOLUTE
 * path at render, and a props file that travels (a repo, an agent's
 * workspace) wants a relative one. `recipientImage` may be a string or a
 * one-element array, relative to the JSON file; it is resolved here.
 *
 * Everything else is `m0saic make @outreach/invite/why-you/v1 --props @file`.
 * CLI resolution and Windows quoting: same rules as tools/gen-previews.mjs
 * (M0SAIC_CLI env override, shell spawn on win32).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IS_WIN = process.platform === "win32";
const TEMPLATE = "@outreach/invite/why-you/v1";

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const VALUE_FLAGS = new Set(["-o", "--out-dir", "-w", "-h"]);
const input = argv.find((a, i) => !a.startsWith("-") && !VALUE_FLAGS.has(argv[i - 1]));
const DRY = argv.includes("--dry");
if (!input) {
  console.error("usage: node tools/outreach.mjs <file.json> [-o out.mp4] [--out-dir dir] [-w 1080] [-h 1080] [--dry]");
  process.exit(2);
}
if (!fs.existsSync(path.join(ROOT, "dist", "index.js"))) {
  console.error("outreach: dist/index.js is missing - run `npm install && npm run build` first.");
  process.exit(1);
}

const file = path.resolve(input);
const baseDir = path.dirname(file);
const parsed = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
const batch = Array.isArray(parsed.recipients);
const jobs = batch ? parsed.recipients.map((r) => ({ ...(parsed.shared ?? {}), ...r })) : [parsed];
if (jobs.length === 0) {
  console.error("outreach: the file names no recipients.");
  process.exit(1);
}

/** A string or an array of paths -> an array of absolute paths that exist. */
function resolveImage(value, who) {
  if (value === undefined || value === null || value === "") return [];
  const refs = (Array.isArray(value) ? value : [value]).map((v) => String(v).trim()).filter(Boolean);
  return refs.map((ref) => {
    const abs = path.isAbsolute(ref) ? ref : path.resolve(baseDir, ref);
    if (!fs.existsSync(abs)) {
      console.error(`outreach: ${who}: recipientImage ${JSON.stringify(ref)} not found (looked at ${abs}).`);
      process.exit(1);
    }
    return abs.split(path.sep).join("/");
  });
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "recipient";

function resolveCli() {
  const env = process.env.M0SAIC_CLI;
  if (env && env.trim().length > 0) {
    if (env.endsWith(".js")) return { cmd: process.execPath, prefix: [env] };
    return { cmd: env, prefix: [] };
  }
  return { cmd: "m0saic", prefix: [] };
}

function quoteArg(arg) {
  if (!IS_WIN) return arg;
  return /[\s"@()^&|<>]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

function runCli(args) {
  const { cmd, prefix } = resolveCli();
  const full = [...prefix, ...args];
  const result = IS_WIN
    ? spawnSync([cmd, ...full.map(quoteArg)].join(" "), { shell: true, stdio: "inherit" })
    : spawnSync(cmd, full, { stdio: "inherit" });
  if (result.error && result.error.code === "ENOENT") {
    console.error("outreach: cannot find the m0saic CLI. Install it (npm i -g m0saic) or set M0SAIC_CLI.");
    process.exit(1);
  }
  return result.status ?? 1;
}

const outDir = path.resolve(flag("--out-dir") ?? (batch ? "out" : "."));
const size = [...(flag("-w") ? ["-w", flag("-w")] : []), ...(flag("-h") ? ["-h", flag("-h")] : [])];
const used = new Set();
let failures = 0;

jobs.forEach((props, i) => {
  const who = props.recipientHandle || props.recipientName || `recipient ${i + 1}`;
  const resolved = { ...props, recipientImage: resolveImage(props.recipientImage, who) };
  let name = slug(who);
  for (let n = 2; used.has(name); n++) name = `${slug(who)}-${n}`;
  used.add(name);
  const out = !batch && flag("-o") ? path.resolve(flag("-o")) : path.join(outDir, `${name}.mp4`);
  if (DRY) {
    console.log(`${who} -> ${out}`);
    return;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = path.join(os.tmpdir(), `outreach-${process.pid}-${i}.json`);
  fs.writeFileSync(tmp, JSON.stringify(resolved));
  try {
    console.log(`\n[${i + 1}/${jobs.length}] ${who}`);
    // Exit 3 = the CLI wrote an error card instead of the clip: a failure here.
    const status = runCli(["make", TEMPLATE, "--template-repo", ROOT, "--props", `@${tmp}`, ...size, "-o", out, "--quiet"]);
    if (status !== 0) {
      failures += 1;
      console.error(`x ${who}: m0saic exited ${status}`);
    }
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

if (!DRY) console.log(`\noutreach: ${jobs.length - failures}/${jobs.length} rendered${failures ? `, ${failures} failed` : ""}.`);
process.exit(failures ? 1 : 0);
