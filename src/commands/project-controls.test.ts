import { describe, expect, it } from "vitest";
import { parseControl, parseProjectControl } from "./fast-path";

const projectPhrases = [
  ["save project", "save"],
  ["export project", "save"],
  ["download project", "save"],
  ["open project", "open"],
  ["import project", "open"],
  ["load project", "open"],
] as const;

describe("local project controls", () => {
  it.each(projectPhrases)("routes %s locally", (phrase, action) => {
    expect(parseProjectControl(phrase)).toBe(action);
    expect(parseProjectControl(`Please ${phrase}.`)).toBe(action);
  });

  it.each(["confirm delete", "confirm deletion", "yes, delete it"])("recognises exact safe confirmation phrase: %s", phrase => {
    expect(parseControl(phrase)).toEqual({ kind: "confirm" });
  });

  it.each([
    "confirm delete process",
    "export this project to PDF",
    "save the project as an image",
    "open project and add a start",
  ])("does not overmatch %s", phrase => {
    expect(parseProjectControl(phrase)).toBeNull();
    if (phrase.startsWith("confirm")) expect(parseControl(phrase)).toBeNull();
  });
});
