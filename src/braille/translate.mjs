import { createRequire } from "node:module";
import { guideLines } from "./guide-text.ts";
import { paginate, wrap } from "./emboss.ts";

/**
 * Real braille, produced by liblouis — the translator screen readers and embossers themselves
 * use. Contracted braille is not a substitution cipher: "the" is one cell, "decision" contracts
 * in the middle, and the rules depend on where a word sits. Nothing here may be hand-made, so a
 * reader can trust that what their fingers find is what the page says.
 *
 * liblouis is GPL, and is used only here, as a build-time tool. Its output is data, so nothing
 * it produces and nothing in the application is a derivative work of it.
 */
export const grades = {
  2: { table: "en-ueb-g2.ctb", name: "Unified English Braille, Grade 2 (contracted)" },
  1: { table: "en-ueb-g1.ctb", name: "Unified English Braille, Grade 1 (uncontracted)" },
};

let cached;
function louis() {
  if (cached) return cached;
  const require = createRequire(import.meta.url);
  // The easy API is used only to mount the table folder: tables live on an in-memory filesystem
  // the module sets up, not on disk paths.
  require("liblouis").enableOnDemandTableLoading();
  cached = require("liblouis-build");
  return cached;
}

/**
 * lou_translateString is called directly rather than through the easy API, whose wrapper sizes
 * the output buffer to the length of the input and then reports that size in bytes where
 * liblouis counts characters. Braille is routinely longer than its print — a digit gains a
 * number sign, a capital gains a mark, a capitalised heading gains a passage indicator — so the
 * wrapper writes past its own allocation and corrupts the heap instead of failing. Four times
 * the input is ample for every table here.
 */
export function translate(text, grade) {
  const capi = louis();
  const inputLength = text.length, capacity = inputLength * 4 + 64;
  const input = capi._malloc((inputLength + 1) * 2), output = capi._malloc((capacity + 1) * 2);
  const inputLengthAt = capi._malloc(4), outputLengthAt = capi._malloc(4);
  try {
    capi.stringToUTF16(text, input, (inputLength + 1) * 2);
    capi.setValue(inputLengthAt, inputLength, "i32");
    capi.setValue(outputLengthAt, capacity, "i32");
    const types = ["string", "number", "number", "number", "number", "number", "number", "number"];
    const ok = capi.ccall("lou_translateString", "number", types,
      [`/tables/${grades[grade].table}`, input, inputLengthAt, output, outputLengthAt, null, null, 0]);
    if (!ok) throw new Error(`liblouis could not translate with ${grades[grade].table}`);
    const length = capi.getValue(outputLengthAt, "i32");
    return String.fromCharCode(...capi.HEAPU16.slice(output >> 1, (output >> 1) + length));
  } finally {
    for (const pointer of [input, output, inputLengthAt, outputLengthAt]) capi._free(pointer);
  }
}

/** The whole guide as one .brf: braille ASCII, forty cells by twenty-five lines. */
export function brailleGuide(grade) {
  // Line by line, because a heading and an example must not be run together by the translator.
  const lines = guideLines().flatMap(line => (line.trim() ? wrap(`${" ".repeat(indentOf(line))}${translate(line.trim(), grade)}`) : [""]));
  return paginate(lines);
}

const indentOf = line => /^ +/.exec(line)?.[0].length ?? 0;
