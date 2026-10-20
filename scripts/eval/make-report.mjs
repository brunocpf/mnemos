// Renders raw summary outputs (JSON files from summaries.mjs) into markdown.
// Usage: node scripts/eval/make-report.mjs <dir-with-json> > raw.md
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
for (const f of readdirSync(dir)
  .filter((x) => x.endsWith(".json"))
  .sort()) {
  let d;
  try {
    d = JSON.parse(readFileSync(join(dir, f), "utf8"));
  } catch {
    continue;
  }
  const avg = (
    d.results.reduce((a, r) => a + r.tps, 0) / d.results.length
  ).toFixed(1);
  console.log(`### ${d.id} (${d.dtype}) — avg ${avg} tok/s on CPU\n`);
  for (const r of d.results) {
    console.log(
      `<details><summary>${r.id} (${r.tps} tok/s)</summary>\n\n\`\`\`text\n${r.summary.replace(/```/g, "'''")}\n\`\`\`\n</details>\n`,
    );
  }
}
