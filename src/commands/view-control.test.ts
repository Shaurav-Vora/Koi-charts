import { describe, expect, it } from "vitest";
import { parseViewControl } from "./view-control";

describe("local canvas view commands", () => {
  it.each([
    ["Arrange chart.", "arrange"],
    ["Auto arrange the chart", "arrange"],
    ["Use compact nodes.", "compact_on"],
    ["Turn compact mode on", "compact_on"],
    ["Use standard nodes.", "compact_off"],
    ["Turn compact mode off", "compact_off"],
  ] as const)("recognises %s", (spoken, action) => {
    expect(parseViewControl(spoken)).toBe(action);
  });

  it.each(["arrange Process", "make it compact later", "turn mode on"])("does not guess from %s", spoken => {
    expect(parseViewControl(spoken)).toBeNull();
  });
});