import { describe, expect, it } from "vitest";
import { grammar, grammarExamples, modelOnly } from "./grammar";
import { parseLocal } from "./local";
import { parseProjectControl } from "./fast-path";
import { parseViewControl } from "./view-control";
import { commandSchema } from "./schema";

/**
 * The contract between the documented syntax and the parser. Every example in the guide is run
 * through the real local chain, so a template that stops recognising a published form fails the
 * build rather than quietly sending authors' words to the model.
 */
describe("spoken grammar", () => {
  it.each(grammarExamples.map(example => [example.say, example] as const))("recognises %s locally", (_say, example) => {
    if (example.projectAction) expect(parseProjectControl(example.say)).toBe(example.projectAction);
    else if (example.viewAction) expect(parseViewControl(example.say)).toBe(example.viewAction);
    else expect(parseLocal(example.say)).toEqual(example.command);
  });

  // AssemblyAI's formatted finals arrive capitalised and punctuated; the guide is written in
  // plain words. Both must reach the same command, or the syntax only works in unit tests.
  it.each(grammarExamples.filter(example => !/[.!?]$/.test(example.say)).map(example => [example.say, example] as const))(
    "recognises %s as dictation formats it", (_say, example) => {
      const spoken = example.say[0].toUpperCase() + example.say.slice(1) + ".";
      if (example.projectAction) expect(parseProjectControl(spoken)).toBe(example.projectAction);
      else if (example.viewAction) expect(parseViewControl(spoken)).toBe(example.viewAction);
      else expect(parseLocal(spoken)).toEqual(example.command);
    });

  it.each(grammarExamples.map(example => [example.say, example] as const))("produces a valid command for %s", (_say, example) => {
    if (example.command) expect(commandSchema.safeParse(example.command).success).toBe(true);
    else if (example.projectAction) expect(["save", "open"]).toContain(example.projectAction);
    else expect(["arrange", "compact_on", "compact_off"]).toContain(example.viewAction);
  });

  it.each(modelOnly.map(entry => [entry.say] as const))("leaves %s to the model", say => {
    expect(parseLocal(say)).toBeNull();
  });

  it("documents every form with at least one example", () => {
    for (const section of grammar) {
      expect(section.entries.length).toBeGreaterThan(0);
      for (const entry of section.entries) expect(entry.examples.length).toBeGreaterThan(0);
    }
  });
});
