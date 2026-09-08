/** The interpoint page every embosser and braille reader assumes unless told otherwise. */
export const CELLS_PER_LINE = 40;
export const LINES_PER_PAGE = 25;

/**
 * Wraps one translated line to the width of a braille page. Braille has no smaller type to fall
 * back on, so a line that overruns is not squeezed — it continues on the next one, indented two
 * cells, which is how a reader tells a continuation from a new entry by touch alone.
 *
 * A word longer than the line is left whole rather than split: a braille word broken across
 * lines can change what it says, because contractions are read as units.
 */
export function wrap(line: string, width = CELLS_PER_LINE): string[] {
  const indent = /^ +/.exec(line)?.[0].length ?? 0;
  const words = line.trim().split(" ").filter(Boolean);
  if (!words.length) return [""];
  const out: string[] = [];
  let current = " ".repeat(indent);
  let empty = true;
  for (const word of words) {
    const candidate = empty ? current + word : `${current} ${word}`;
    if (!empty && candidate.length > width) {
      out.push(current);
      current = " ".repeat(indent + 2) + word;
    } else current = candidate;
    empty = false;
  }
  out.push(current);
  return out;
}

/**
 * Lays wrapped lines onto pages separated by a form feed, which is what a .brf file is: braille
 * ASCII, one character per cell, with the page breaks the embosser will honour.
 */
export function paginate(lines: string[], perPage = LINES_PER_PAGE): string {
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += perPage) pages.push(lines.slice(index, index + perPage));
  // A trailing blank line at the foot of a page is a wasted cell of paper, not a separator.
  return pages.map(page => page.join("\r\n").replace(/(\r\n)+$/, "")).join("\r\n\f") + "\r\n";
}
