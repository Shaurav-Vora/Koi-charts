/** Shared shaping for spoken text, before any rule tries to read it. */
export const collapse = (text: string) => text.trim().replace(/\s+/g, " ");

/**
 * Speech starts with words that carry no instruction — "Now add a decision node" is the same
 * request as "add a decision node". Every rule here is anchored at the start of the utterance,
 * so an unstripped "Now" defeated all of them at once and sent an everyday phrase to the model.
 *
 * Only leading markers are removed. A trailing "please" or "thanks" is left alone because a
 * label may legitimately end with those words: "add a process called Thank you".
 */
const FILLERS = /^(?:please|now|ok|okay|alright|right|so|then|and|well|um|uh|hey|let'?s|lets|can you|could you|would you|i want to|i'?d like to|i want you to)[,]?\s+/i;

export function stripFillers(text: string): string {
  let value = collapse(text);
  // Bounded: "okay so now add…" is real speech, but an endless loop over one is not.
  for (let pass = 0; pass < 3; pass++) {
    const stripped = value.replace(FILLERS, "");
    if (stripped === value || !stripped) return value;
    value = stripped;
  }
  return value;
}
