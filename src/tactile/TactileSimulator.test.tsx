import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import type { FlowGraph } from "../graph/types";
import TactileSimulator from "./TactileSimulator";

const emptyGraph: FlowGraph = { schemaVersion: 1, nodes: [], edges: [] };
const populatedGraph: FlowGraph = {
  schemaVersion: 1,
  nodes: [{ id: "start", type: "start", label: "Start" }],
  edges: [],
};

it("shows the in-matrix empty cue only while no tactile pins are raised", () => {
  const { container, rerender } = render(
    <TactileSimulator graph={emptyGraph} focus={null} version={0} displayIds={{}} />,
  );

  expect(container.querySelector(".tactile-empty-cue")).not.toBeNull();
  expect(container.querySelector(".tactile-empty-cue text")).toHaveTextContent("No pins raised");

  rerender(
    <TactileSimulator graph={populatedGraph} focus="start" version={1} displayIds={{ start: "N1" }} />,
  );

  expect(container.querySelector(".tactile-empty-cue")).toBeNull();
});
