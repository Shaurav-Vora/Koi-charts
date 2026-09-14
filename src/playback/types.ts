export type PlaybackRouteStep = { nodeId: string; viaEdgeId: string | null };
export type PlaybackChoice = { id: string; label: string; destinationLabel: string };
export type PlaybackStatus =
  | "idle"
  | "choosing_start"
  | "paused"
  | "choosing_branch"
  | "complete"
  | "blocked";

export type PlaybackState = {
  status: PlaybackStatus;
  graphVersion: number | null;
  currentNodeId: string | null;
  route: PlaybackRouteStep[];
  choices: PlaybackChoice[];
  visitCounts: Record<string, number>;
  message: string;
};

export type PlaybackAction =
  | { type: "start"; graphVersion: number }
  | { type: "choose_start"; nodeId: string; graphVersion: number }
  | { type: "next"; graphVersion: number }
  | { type: "choose_branch"; edgeId: string; graphVersion: number }
  | { type: "back"; graphVersion: number }
  | { type: "repeat"; graphVersion: number }
  | { type: "restart"; graphVersion: number }
  | { type: "stop"; graphVersion: number }
  | { type: "graph_changed"; graphVersion: number };
