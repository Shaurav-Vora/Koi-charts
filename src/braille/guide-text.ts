import { grammar, modelOnly, rules } from "../commands/grammar.ts";

/**
 * The command guide as plain lines, ready to be translated into braille and embossed.
 *
 * Print layout does not survive a braille page: there are no fonts, no bold, and forty cells to
 * a line. Structure is carried by capitalised headings, blank lines between entries, and a
 * two-cell indent, all of which read the same on paper as they do on a refreshable display.
 */
export function guideLines(): string[] {
  const lines: string[] = ["KOI CHARTS -- COMMAND REFERENCE", ""];
  lines.push("With local commands enabled, the supported phrases below are processed without a Gemini request. Other phrasing is sent to Gemini for interpretation and may require clarification.", "");
  lines.push("THREE RULES", "");
  rules.forEach((rule, index) => lines.push(`${index + 1}. ${rule}`));
  lines.push("");
  for (const section of grammar) {
    lines.push(section.title.toUpperCase(), "");
    for (const entry of section.entries) {
      lines.push(`  ${entry.form}`);
      lines.push(`  ${entry.purpose}`);
      if (entry.alternatives) lines.push(`  Also: ${entry.alternatives.join("; ")}.`);
      for (const example of entry.examples) lines.push(`  Say: ${example.say}`);
      lines.push("");
    }
  }
  lines.push("SENT TO BE INTERPRETED", "");
  for (const entry of modelOnly) {
    lines.push(`  Say: ${entry.say}`);
    lines.push(`  ${entry.why}`);
    lines.push("");
  }
  return lines;
}
