// Fails if any source file uses physical left/right Tailwind classes (they break RTL).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const bad = /(?<![\w-])(-?(?:ml|mr|pl|pr)-\S|-?(?:left|right)-\S|text-(?:left|right)|border-[lr](?:-|\s|")|rounded-[lr](?:-|\s|")|float-(?:left|right))/;
const roots = ["app", "components"];
const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(tsx|ts|css)$/.test(name)) {
      readFileSync(path, "utf8").split("\n").forEach((line, i) => {
        const m = line.match(bad);
        if (m) hits.push(`${path}:${i + 1}: ${m[1]}`);
      });
    }
  }
}

roots.forEach(walk);
if (hits.length) {
  console.error("Physical left/right classes found (use ms-/me-/ps-/pe-/start-/end-):\n" + hits.join("\n"));
  process.exit(1);
}
console.log("RTL check passed");
