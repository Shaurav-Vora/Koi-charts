const letters = [1,3,9,25,17,11,27,19,10,26,5,7,13,29,21,15,31,23,14,30,37,39,58,45,61,53];
export function toBraille(text: string) {
  let cells = "", number = false;
  const unsupported = new Set<string>();
  for (const char of text) {
    if (/^[0-9]$/.test(char)) {
      if (!number) cells += "⠼";
      cells += String.fromCodePoint(0x2800 + letters[(Number(char) + 9) % 10]); number = true;
    } else if (/^[a-zA-Z]$/.test(char)) {
      // A grade-one indicator separates letters a-j from a preceding number.
      if (number && /^[a-j]$/i.test(char)) cells += "⠰";
      if (char !== char.toLowerCase()) cells += "⠠";
      cells += String.fromCodePoint(0x2800 + letters[char.toLowerCase().charCodeAt(0) - 97]); number = false;
    } else if (char === " ") { cells += "⠀"; number = false; }
    else { unsupported.add(char); cells += "⠿"; number = false; }
  }
  return { cells, unsupported: [...unsupported] };
}
