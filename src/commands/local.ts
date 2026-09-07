import { parseControl, parseFuzzyControl, parseSimpleAddition } from "./fast-path";
import { parseTemplate } from "./templates";
import type { GraphCommand } from "./schema";

/**
 * The whole local recognition chain, in the one order it is ever applied: exact control phrases,
 * then exact templates, then approximate matching over the control vocabulary. Approximation
 * runs last so it only ever sees what nothing else could read.
 *
 * Everything this returns still passes through commandSchema and the graph invariants before it
 * reaches the chart. Recognition happens before validation, never instead of it.
 */
export function parseLocal(text: string, { approximate = true } = {}): GraphCommand | null {
  return parseControl(text) ?? parseSimpleAddition(text) ?? parseTemplate(text) ?? (approximate ? parseFuzzyControl(text) : null);
}
