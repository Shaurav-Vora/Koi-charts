import type { FlowGraph } from "../graph/types";
import type { PlaybackStatus } from "../playback/types";

type SuggestionContext = {
  graph: FlowGraph;
  displayIds: Record<string, string>;
  focusedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedNodeCount: number;
  pendingKind: "deletion" | "clarification" | null;
  auditOpen: boolean;
  playbackStatus: PlaybackStatus;
  playbackChoices: { label: string }[];
};

export type CommandSuggestions = {
  context: string;
  commands: string[];
};

const spokenRef = (id: string, displayIds: Record<string, string>) => displayIds[id] ?? id;

/**
 * Keeps the most useful exact local phrases beside the current activity. The ordering mirrors
 * the editor's interaction modes: a pending question must be resolved before another edit,
 * followed by guided modes, direct selection, and finally whole-chart actions.
 */
export function suggestedCommands({
  graph,
  displayIds,
  focusedNodeId,
  selectedEdgeId,
  selectedNodeCount,
  pendingKind,
  auditOpen,
  playbackStatus,
  playbackChoices,
}: SuggestionContext): CommandSuggestions {
  if (pendingKind === "deletion") return { context: "Deletion waiting", commands: ["confirm delete", "cancel"] };
  if (pendingKind === "clarification") return { context: "Choice waiting", commands: ["one", "two", "cancel"] };

  if (playbackStatus !== "idle") {
    if (playbackStatus === "choosing_branch" && playbackChoices.length) {
      return { context: "Choose a route", commands: [...playbackChoices.slice(0, 2).map(choice => `take ${choice.label}`), "stop test"] };
    }
    return { context: "Testing the route", commands: ["next", "repeat", "stop test"] };
  }

  if (auditOpen) return { context: "Reviewing issues", commands: ["next issue", "repeat issue", "close check"] };

  if (selectedEdgeId) {
    const edge = graph.edges.find(candidate => candidate.id === selectedEdgeId);
    if (edge) {
      const source = spokenRef(edge.source, displayIds);
      const target = spokenRef(edge.target, displayIds);
      return {
        context: "Connection selected",
        commands: [
          `label connection from ${source} to ${target} as Yes`,
          `delete the connection from ${source} to ${target}`,
        ],
      };
    }
  }

  if (selectedNodeCount > 1) return { context: `${selectedNodeCount} shapes selected`, commands: ["clear selection", "check chart", "arrange chart"] };

  if (focusedNodeId && graph.nodes.some(node => node.id === focusedNodeId)) {
    return {
      context: "Shape selected",
      commands: ["connect this to a new process called Review", "rename this to New label", "describe this"],
    };
  }

  if (!graph.nodes.length) {
    return {
      context: "Start building",
      commands: ["add a start called Begin", "add a process called Review", "open project"],
    };
  }

  const first = graph.nodes[0];
  return {
    context: "Continue the chart",
    commands: [`focus on ${spokenRef(first.id, displayIds)}`, "check chart", "test chart"],
  };
}
