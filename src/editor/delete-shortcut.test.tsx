import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Editor from "./Editor";
import { createEditorCoordinator } from "./coordinator";
vi.mock("../visual/VisualCanvas",()=>({
 default:({onUndo}:{onUndo?:()=>void})=><button type="button" onClick={onUndo}>Undo</button>
}));
it("deletes the selected unconnected node, with undo",()=>{
 const coordinator=createEditorCoordinator();
 render(<Editor coordinator={coordinator}/>);
 fireEvent.click(screen.getByRole("button",{name:"Insert process"}));
 fireEvent.keyDown(document,{key:"Delete"});
 expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(0);
 fireEvent.click(screen.getByRole("button",{name:"Undo"}));
 expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(1);
 fireEvent.keyDown(screen.getByLabelText("Shape label"),{key:"Delete"});
 expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(1);
 fireEvent.keyDown(document,{key:"Delete",repeat:true});
 expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(1);
});
it("requires confirmation for connected nodes and ignores Delete without a selection",()=>{
 const coordinator=createEditorCoordinator();
 render(<Editor coordinator={coordinator}/>);
 act(()=>{
  coordinator.dispatch({type:"command",idSeed:"a",command:{kind:"add_node",type:"start",label:"Start",placement:null}});
  coordinator.dispatch({type:"command",idSeed:"b",command:{kind:"connect_new",source:{kind:"focus"},type:"process",label:"Process"}});
 });
 fireEvent.keyDown(document,{key:"Delete"});
 expect(screen.getByRole("button",{name:"Confirm deletion"})).toBeVisible();
 expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(2);
 fireEvent.click(screen.getByRole("button",{name:"Cancel"}));
 act(()=>coordinator.dispatch({type:"command",idSeed:"c",command:{kind:"clear_focus"}}));
 fireEvent.keyDown(document,{key:"Delete"});
 expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(2);
});
