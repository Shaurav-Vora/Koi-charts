export type TactileMode = "overview" | "focus";
export type TactileFrame = { version: number; width: number; height: number; raisedPins: { x: number; y: number }[]; brailleCells: string; text: string; focusedNodeId: string | null; mode: TactileMode; unsupported: string[]; nodeIds: string[]; edgeIds: string[] };
export type TactileAdapter = { render(frame: TactileFrame): Promise<void> };
