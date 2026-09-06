import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ArrowInspector from "./ArrowInspector";
import { createEngineState, execute } from "../commands/execute";
import type { GraphCommand } from "../commands/schema";
import type { EngineState } from "../graph/types";

const source = { id: "d", type: "decision" as const, label: "Approved?" };
const target = { id: "p", type: "process" as const, label: "Ship" };
const edge = { id: "e", source: "d", target: "p" };
it("labels decision branches through the engine and preserves undo", () => {
 const initial: EngineState = { ...createEngineState(), graph: {schemaVersion: 1, nodes: [source, target], edges: [edge]} };
 let state = initial;
 const onCommand = (command: GraphCommand) => { state = execute(state, command, () => "unused").state; };
 render(<ArrowInspector edge={edge} source={source} target={target} onCommand={onCommand} onClose={() => {}} />);
 fireEvent.click(screen.getByRole("button", {name: "Yes"}));
 expect(state.graph.edges[0].label).toBe("Yes");
 fireEvent.click(screen.getByRole("button", {name: "No"}));
 expect(state.graph.edges[0].label).toBe("No");
 state = execute(state, {kind:"undo"}, () => "unused").state;
 expect(state.graph.edges[0].label).toBe("Yes");
 fireEvent.change(screen.getByLabelText("Arrow label"), {target: {value: "Try again"}});
 fireEvent.click(screen.getByRole("button", {name: "Apply label"}));
 expect(state.graph.edges[0].label).toBe("Try again");
 fireEvent.click(screen.getByRole("button", {name: "Clear label"}));
 expect(state.graph.edges[0].label).toBeUndefined();
 expect(state.graph.nodes).toEqual(initial.graph.nodes);
});
it("reserves branch shortcuts for decisions and supports closing with Escape", () => {
 const close = vi.fn();
 render(<ArrowInspector edge={edge} source={{...source,type:"process"}} target={target} onCommand={() => {}} onClose={close} />);
 expect(screen.queryByRole("group", {name:"Decision branch label"})).not.toBeInTheDocument();
 fireEvent.keyDown(screen.getByLabelText("Arrow label"), {key:"Escape"});
 expect(close).toHaveBeenCalledOnce();
});
