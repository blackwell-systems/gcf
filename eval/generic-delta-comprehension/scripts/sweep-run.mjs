// Model-sweep driver for the delta-vs-resend gap study (#1 repeated runs + #3 denser
// spectrum). Both arms, standard4, via OpenRouter. Results -> results/sweep/<model>/run<k>/,
// transcripts -> logs/sweep/<model>/run<k>/. Requires OPENROUTER_API_KEY in env.
//
// Controlled, resumable, one-model-at-a-time by default:
//   node scripts/sweep-run.mjs --model <slug>              # run ONE model (all repeats), then stop
//   node scripts/sweep-run.mjs --model a,b,c --conc 3      # run a chosen LIST, 3 in parallel
//   node scripts/sweep-run.mjs --model <slug> --repeats 3
//   node scripts/sweep-run.mjs --all --conc 4              # every model in MODELS (opt-in fan-out)
//   node scripts/sweep-run.mjs --model <slug> --dry-run    # show what WOULD run, spend nothing
//
// Resume: a run is "done" iff its result JSON exists in results/sweep/<model>/run<k>/.
// Completed runs are skipped; only missing/incomplete ones run. Stop anytime and re-invoke
// to continue. --force re-runs even completed ones.
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), ".."));

const MODELS = [
  "meta-llama/llama-3.1-8b-instruct",
  "mistralai/ministral-3b-2512",
  "mistralai/ministral-8b-2512",
  "mistralai/mistral-small-3.2-24b-instruct",
  "meta-llama/llama-3.3-70b-instruct",
  // qwen/qwen-2.5-72b-instruct EXCLUDED: its OpenRouter providers (DeepInfra/Novita, 32k)
  // returned empty responses on large full-resend prompts (~14k tokens, well within limit),
  // tanking its resend score and producing a fake +17.5pp gap. Provider artifact, not signal.
  // Data kept under results/sweep/ + logs/sweep/ as the record. See blank-rate gate in sweep-analyze.mjs.
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
];

// --- args ---
const argv = process.argv.slice(2);
const getFlag = n => argv.includes(`--${n}`);
const getVal = n => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const one = getVal("model");
const all = getFlag("all");
const dryRun = getFlag("dry-run");
const force = getFlag("force");
const REPEATS = parseInt(getVal("repeats") || "3", 10);
const CONC = parseInt(getVal("conc") || "1", 10);  // sequential by default; opt in to parallel

if (!one && !all) {
  console.error("Refusing to run without a target. Use --model <slug[,slug2,...]> or --all.");
  console.error("Known models:\n  " + MODELS.join("\n  "));
  process.exit(2);
}
const targets = one ? one.split(",").map(s => s.trim()).filter(Boolean) : MODELS;

// --- resume: a run is done iff its result JSON exists ---
const sani = s => s.replace(/[/:]/g, "_");
const isDone = (S, k) => {
  const dir = `results/sweep/${S}/run${k}`;
  return existsSync(dir) && readdirSync(dir).some(f => f.endsWith(".json"));
};

const tasks = [];
let skipped = 0;
for (const m of targets) {
  const S = sani(m);
  for (let k = 1; k <= REPEATS; k++) {
    if (!force && isDone(S, k)) { skipped++; continue; }
    tasks.push({ m, S, k });
  }
}

console.log(`targets: ${targets.length} model(s) x ${REPEATS} repeats`);
console.log(`resume: ${skipped} already-complete run(s) will be skipped; ${tasks.length} to run`);
if (dryRun) {
  console.log("--dry-run: would run these (no spend):");
  for (const t of tasks) console.log(`  ${t.m} run${t.k}`);
  process.exit(0);
}
if (!tasks.length) { console.log("nothing to do (all complete)."); process.exit(0); }

function runOne({ m, S, k }) {
  return new Promise(res => {
    const out = `results/sweep/${S}/run${k}`, log = `logs/sweep/${S}/run${k}`;
    mkdirSync(out, { recursive: true });
    mkdirSync(log, { recursive: true });
    const t0 = process.hrtime.bigint();
    const pr = spawn(process.execPath,
      ["scripts/step2-run.mjs", "--backend", "openrouter", "--model", m,
       "--fixtures", "fixtures/standard4", "--outdir", out],
      { env: { ...process.env, STEP2_LOGDIR: log }, stdio: "ignore" });
    pr.on("close", code => {
      const secs = Number(process.hrtime.bigint() - t0) / 1e9;
      console.log(`  ${code === 0 ? "ok  " : "FAIL"} ${m} run${k} (${secs.toFixed(0)}s)`);
      res();
    });
  });
}

let i = 0, active = 0, done = 0;
await new Promise(resolve => {
  const pump = () => {
    if (i >= tasks.length && active === 0) return resolve();
    while (active < CONC && i < tasks.length) {
      active++;
      runOne(tasks[i++]).then(() => { active--; done++; pump(); });
    }
  };
  pump();
});
console.log(`DONE: ${done}/${tasks.length} runs (${skipped} skipped as already complete)`);
