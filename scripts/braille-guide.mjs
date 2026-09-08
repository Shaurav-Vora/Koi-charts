import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brailleGuide, grades } from "../src/braille/translate.mjs";

/** Regenerates the embossable command guide. Run `npm run braille` after editing grammar.ts. */
const out = resolve(dirname(fileURLToPath(import.meta.url)), "../public/braille");
mkdirSync(out, { recursive: true });
for (const grade of Object.keys(grades)) {
  const file = resolve(out, `koi-charts-guide-ueb-grade-${grade}.brf`);
  writeFileSync(file, brailleGuide(Number(grade)), "ascii");
  console.log(`${grades[grade].name}: ${file}`);
}
