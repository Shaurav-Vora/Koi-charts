import { stripFillers } from "./phrasing";
import { choiceWords } from "../feedback/choices";

const ordinals = ["first", "second", "third"];
/** "Number two", "option 2", "the second one" — all the ways a spoken choice arrives. */
const trim = /^(?:option|choice|number|node|shape|connection|answer)\s+|^the\s+|\s+one$/g;

/**
 * Reads a reply to a numbered clarification. Returns the index the author chose, or null when
 * the reply is something else entirely — a rephrased command, or a label. Refusing here leaves
 * the question standing, which is recoverable; guessing would edit the wrong shape.
 */
export function parseChoice(text: string, count: number): number | null {
  const clean = stripFillers(text).toLowerCase().replace(/[.!?]+$/, "").replace(trim, "").trim();
  const digit = /^([1-9])$/.exec(clean);
  const index = digit ? Number(digit[1]) - 1 : Math.max(choiceWords.indexOf(clean as typeof choiceWords[number]), ordinals.indexOf(clean));
  return index >= 0 && index < Math.min(count, choiceWords.length) ? index : null;
}
