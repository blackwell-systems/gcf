// Analyze the model sweep: per-run comp-only per-record accuracy (delta & resend),
// aggregated per model to mean +/- SD, plus the gap-vs-resend-accuracy trend and the
// format-miss rate (transparency for how much comp-only is correcting). Reads transcripts
// under logs/sweep/<model>/run<k>/. Run from the eval dir: node scripts/sweep-analyze.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs';

const norm = s => String(s).trim().toLowerCase();
const numEq = (a, b) => { const x = Number(a), y = Number(b); return !isNaN(x) && !isNaN(y) && x === y; };
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const sd = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };

// comp-only per-record accuracy for one run's log dir, per arm, + format-miss + blank counts.
// A "blank" is an empty/absent answer: the model failed to respond (e.g. a provider returning
// empty content on large prompts, as qwen-2.5-72b did). High blank rate => the point is a
// non-response artifact, not a comprehension measurement, and is excluded from the trend.
function scoreRun(dir) {
  const A = { delta: { ok: 0, n: 0, fmt: 0, blank: 0 }, full_resend: { ok: 0, n: 0, fmt: 0, blank: 0 } };
  for (const f of readdirSync(dir).filter(f => f.endsWith(".txt"))) {
    const t = readFileSync(`${dir}/${f}`, "utf8");
    const arm = (t.match(/arm=(\w+)/) || [])[1];
    if (!A[arm]) continue;
    const qs = [...t.matchAll(/^\s+(\d+)\. \[(\w+)\] .+? => want=(.+)$/gm)].map(m => ({ i: +m[1], type: m[2], want: m[3] }));
    const parsed = JSON.parse((t.match(/# parsed answers: (\[.*\])/) || [])[1] || "[]");
    const content = (t.split(/===== MODEL (?:CONTENT|RESULT) =====/)[1] || "").toLowerCase();
    for (const x of qs) {
      if (/count/.test(x.type)) continue;  // per-record only; counting is not charted
      A[arm].n++;
      const got = parsed[x.i - 1];
      if (got === "" || got == null) A[arm].blank++;   // model returned nothing
      const ok = norm(got) === norm(x.want) || numEq(got, x.want);
      if (ok) A[arm].ok++;
      else if (content.includes(norm(x.want))) A[arm].fmt++;  // right value present, mis-parsed
    }
  }
  const comp = a => a.n ? 100 * (a.ok + a.fmt) / a.n : null;   // credit formatting misses
  return { delta: comp(A.delta), resend: comp(A.full_resend), fmt: A.delta.fmt + A.full_resend.fmt,
           blank: A.delta.blank + A.full_resend.blank, n: A.delta.n + A.full_resend.n };
}

const SWEEP = "logs/sweep";
if (!existsSync(SWEEP)) { console.error("no logs/sweep yet"); process.exit(1); }
const rows = [];
for (const model of readdirSync(SWEEP).sort()) {
  const runs = readdirSync(`${SWEEP}/${model}`).filter(d => d.startsWith("run"));
  const per = runs.map(r => scoreRun(`${SWEEP}/${model}/${r}`)).filter(x => x.delta != null && x.resend != null);
  if (!per.length) continue;
  const deltas = per.map(x => x.delta), resends = per.map(x => x.resend), gaps = per.map(x => x.delta - x.resend);
  rows.push({
    model, runs: per.length,
    delta: mean(deltas), resend: mean(resends), gap: mean(gaps), gapSD: sd(gaps),
    fmtRate: 100 * mean(per.map(x => x.fmt / x.n)),
    blankRate: 100 * mean(per.map(x => x.blank / x.n)),
  });
}

// Trust gate: a point is EXCL-blanks if the model failed to respond too often (non-response
// artifact); otherwise CLEAN/ok/MESSY by how much the comp-only format correction is doing.
const BLANK_MAX = 5, FMT_CLEAN = 10, FMT_OK = 35;
const status = r => r.blankRate >= BLANK_MAX ? "EXCL-blanks" : r.fmtRate < FMT_CLEAN ? "CLEAN" : r.fmtRate < FMT_OK ? "ok" : "MESSY";

rows.sort((a, b) => a.resend - b.resend);  // weakest (lowest resend accuracy) first
console.log("model".padEnd(42) + "runs  delta   resend  gap(+/-SD)      fmt%  blank%  trust");
for (const r of rows) {
  console.log(r.model.padEnd(42) + String(r.runs).padEnd(6) +
    r.delta.toFixed(1).padStart(6) + "  " + r.resend.toFixed(1).padStart(6) + "  " +
    (`${r.gap >= 0 ? "+" : ""}${r.gap.toFixed(1)} +/- ${r.gapSD.toFixed(1)}`).padEnd(15) + "  " +
    r.fmtRate.toFixed(0).padStart(3) + "   " + r.blankRate.toFixed(0).padStart(3) + "    " + status(r));
}
const clean = rows.filter(r => status(r) === "CLEAN");
console.log("\n# CLEAN trend pairs (resend_accuracy, gap) — excludes blank-artifact and format-messy points:");
console.log(JSON.stringify(clean.map(r => [+r.resend.toFixed(1), +r.gap.toFixed(1)])));
const excluded = rows.filter(r => status(r) === "EXCL-blanks");
if (excluded.length) console.log("EXCLUDED (blank artifact): " + excluded.map(r => `${r.model} (${r.blankRate.toFixed(0)}% blank)`).join(", "));
