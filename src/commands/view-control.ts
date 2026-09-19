export type ViewAction = "arrange" | "compact_on" | "compact_off";
export type ViewActionResult = { outcome: "committed" | "error"; message: string };

const commands: { phrase: string; action: ViewAction }[] = [
  ...["arrange chart", "arrange the chart", "auto arrange chart", "auto arrange the chart"]
    .map(phrase => ({ phrase, action: "arrange" as const })),
  ...["use compact nodes", "compact nodes", "turn compact mode on", "enable compact mode"]
    .map(phrase => ({ phrase, action: "compact_on" as const })),
  ...["use standard nodes", "standard nodes", "turn compact mode off", "disable compact mode"]
    .map(phrase => ({ phrase, action: "compact_off" as const })),
];

export function parseViewControl(text: string): ViewAction | null {
  const spoken = text.toLocaleLowerCase().replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim();
  return commands.find(command => command.phrase === spoken)?.action ?? null;
}
