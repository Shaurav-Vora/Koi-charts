/**
 * Approximate matching against a fixed vocabulary, used only where a wrong answer is cheap to
 * undo. Two gates must both pass: the best candidate has to clear a confidence floor, and it has
 * to be clearly ahead of the best *different* command. A percentage alone says how alike two
 * strings are, not whether the author meant one of them, so a near-tie is refused outright.
 */
export type Candidate<T> = { phrase: string; value: T };
export type MatchOptions = { floor?: number; margin?: number };

/** Speech arrives formatted, so case, punctuation and spacing carry no intent. */
const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function ratio(a: string, b: string): number {
  const left = Array.from(a), right = Array.from(b);
  let row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 0; i < left.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < right.length; j++) next.push(Math.min(next[j] + 1, row[j + 1] + 1, row[j] + (left[i] === right[j] ? 0 : 1)));
    row = next;
  }
  return 1 - row[right.length] / Math.max(left.length, right.length, 1);
}

/**
 * Enough stemming to see past dictation's inflection — "cancelled" and "cancel" are the same
 * request. Deliberately not phonetic: a homophone such as "undue" for "undo" is far away by edit
 * distance and stays that way, because guessing across sound-alikes needs a model, not a ratio.
 */
const stem = (query: string) => query.split(" ")
  .map(word => (word.length > 4 ? word.replace(/(?:ings?|ing|es|ed|s)$/, "") : word).replace(/([bcdfglmnprst])$/, "$1"))
  .join(" ");

export function bestMatch<T>(text: string, candidates: readonly Candidate<T>[], options: MatchOptions = {}): T | null {
  const { floor = 0.78, margin = 0.15 } = options;
  const query = normalize(text);
  // Too short to distinguish: at two characters, half the vocabulary is one edit away.
  if (query.length < 3) return null;
  const words = query.split(" ").length;
  const exact = candidates.find(candidate => normalize(candidate.phrase) === query);
  if (exact) return exact.value;
  // A control phrase has a fixed length, so an utterance with extra words is saying something
  // more than the command: dropping those words would silently discard what the author asked.
  const stemmed = stem(query);
  const ranked = candidates.filter(candidate => normalize(candidate.phrase).split(" ").length === words)
    .map(candidate => ({ value: candidate.value, score: ratio(stemmed, stem(normalize(candidate.phrase))) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < floor) return null;
  // Compared by command, not by phrase: "next" and "go next" are one another's synonyms, and a
  // tie between them is not an ambiguity the author needs to resolve.
  const rival = ranked.find(candidate => JSON.stringify(candidate.value) !== JSON.stringify(best.value));
  return !rival || best.score - rival.score >= margin ? best.value : null;
}
