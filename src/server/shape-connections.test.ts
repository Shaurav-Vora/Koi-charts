// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createRoutes } from "./routes";
import { createEngineState, execute } from "../commands/execute";
import { nodeTypes } from "../graph/types";

afterEach(() => vi.restoreAllMocks());
it.each(nodeTypes)("connects this %s node to each new shape without a model guess", async sourceType => {
 const transport = vi.fn();
 const routes = createRoutes({ transport, env: () => ({ GEMINI_API_KEY: "test" }) });
 let serial = 0;
 let state = execute(createEngineState(), { kind: "add_node", type: sourceType, label: sourceType, placement: null }, () => `node-${++serial}`).state;
 for (const targetType of nodeTypes) {
  const sourceId = state.focusedNodeId;
  const currentType = state.graph.nodes.find(n => n.id === sourceId)!.type;
  const response = await routes.interpret(new Request("http://localhost/api/commands/interpret", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
   transcript: `connect this ${currentType} node to a new ${targetType} node`,
   graph: state.graph, focusedNodeId: sourceId, recentNodeId: state.recentNodeId, pending: null,
  }) }));
  expect(response.status).toBe(200);
  const result = execute(state, (await response.json()).command, () => `node-${++serial}`);
  expect(result.outcome).toBe("committed");
  expect(result.state.graph.edges.at(-1)).toMatchObject({ source: sourceId, target: result.state.focusedNodeId });
  expect(result.state.focusedNodeId).not.toBe(sourceId);
  state = result.state;
 }
 expect(state.graph.nodes).toHaveLength(5);
 expect(state.graph.edges).toHaveLength(4);
 expect(transport).not.toHaveBeenCalled();
});
it("does not interpret this process as a selected Start node", async () => {
 vi.spyOn(console, "warn").mockImplementation(() => {});
 const transport = vi.fn();
 const response = await createRoutes({ transport, env: () => ({ GEMINI_API_KEY: "test" }) }).interpret(new Request("http://localhost/api/commands/interpret", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
  transcript: "connect this process node to a new decision node",
  graph: { schemaVersion: 1, nodes: [{ id: "s", type: "start", label: "Start" }], edges: [] },
  focusedNodeId: "s", recentNodeId: "s", pending: null,
 }) }));
 expect(response.status).toBe(400);
 expect((await response.json()).error.message).toContain("Select the process node");
 expect(transport).not.toHaveBeenCalled();
});
