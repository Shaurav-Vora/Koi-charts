import { parseControl, parseFuzzyControl, parseSimpleAddition } from "./fast-path";
import { parseTemplate } from "./templates";
import { commandSchema, type GraphCommand } from "./schema";

const EDIT_START = /^(?:add|create|insert|make|place|put|new|move|rename|relabel|change|delete|remove|erase|connect|link|join|draw)\b/i;

function outsideQuotes(text: string, index: number): boolean {
  return (text.slice(0, index).match(/"/g)?.length ?? 0) % 2 === 0;
}

function splitEditSequence(text: string): string[] | null {
  const clauses: string[] = [];
  const separators = /\b(?:and\s+then|then|and)\b/gi;
  let start = 0;
  for (const match of text.matchAll(separators)) {
    const index = match.index;
    if (!outsideQuotes(text, index)) continue;
    const following = text.slice(index + match[0].length).replace(/^[\s,]+/, "");
    if (!EDIT_START.test(following)) continue;
    const clause = text.slice(start, index).replace(/[\s,]+$/, "");
    if (!clause) return null;
    clauses.push(clause);
    start = index + match[0].length;
    while (/[\s,]/.test(text[start] ?? "")) start++;
  }
  if (!clauses.length) return null;
  const finalClause = text.slice(start).trim();
  return finalClause ? [...clauses, finalClause] : null;
}

const parseOne = (text: string, approximate: boolean): GraphCommand | null =>
  parseControl(text) ?? parseSimpleAddition(text) ?? parseTemplate(text) ?? (approximate ? parseFuzzyControl(text) : null);

/**
 * The whole local recognition chain, in the one order it is ever applied: exact control phrases,
 * then exact templates, then approximate matching over the control vocabulary. Approximation
 * runs last so it only ever sees what nothing else could read.
 *
 * Everything this returns still passes through commandSchema and the graph invariants before it
 * reaches the chart. Recognition happens before validation, never instead of it.
 */
export function parseLocal(text: string, { approximate = true } = {}): GraphCommand | null {
  const direct = parseOne(text, approximate);
  if (direct) return direct;
  const clauses = splitEditSequence(text);
  if (!clauses) return null;
  const commands = clauses.map(clause => parseOne(clause, false));
  if (commands.some(command => !command)) return null;
  const compound = commandSchema.safeParse({ kind: "compound", commands });
  return compound.success ? compound.data : null;
}
