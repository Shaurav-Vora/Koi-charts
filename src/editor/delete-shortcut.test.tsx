import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Editor from "./Editor";
import { createEditorCoordinator } from "./coordinator";
vi.mock("../visual/VisualCanvas",()=>({
 default:({graph,onUndo,onArrange,onSelectedNodeIdsChange,onSelectionComplete}:{graph:{nodes:{id:string}[]};onUndo?:()=>void;onArrange?:()=>void;onSelectedNodeIdsChange?:(ids:string[])=>void;onSelectionComplete?:(ids:string[])=>void})=><>
  <button type="button" onClick={onUndo}>Undo</button>
  <button type="button" onClick={onArrange}>Auto arrange chart</button>
  <button type="button" onClick={()=>{const ids=graph.nodes.map(node=>node.id);onSelectedNodeIdsChange?.(ids);onSelectionComplete?.(ids);}}>Select every shape</button>
 </>
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
it("opens selected shape controls as a closable canvas overlay",()=>{
 const coordinator=createEditorCoordinator();
 render(<Editor coordinator={coordinator}/>);
 fireEvent.click(screen.getByRole("button",{name:"Insert process"}));
 const inspector=screen.getByRole("form",{name:"Selected shape"});
 expect(inspector).toHaveClass("canvas-inspector");
 expect(inspector.parentElement).toHaveClass("canvas-wrap");
 expect(within(screen.getByRole("complementary",{name:"Shapes"})).queryByRole("form",{name:"Selected shape"})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Close shape editor"}));
 expect(screen.queryByRole("form",{name:"Selected shape"})).not.toBeInTheDocument();
 expect(coordinator.getSnapshot().editor.engine.focusedNodeId).toBeNull();
});
it("deletes a marquee selection as one undoable edit",()=>{
 const coordinator=createEditorCoordinator();
 render(<Editor coordinator={coordinator}/>);
 fireEvent.click(screen.getByRole("button",{name:"Insert start"}));
 fireEvent.click(screen.getByRole("button",{name:"Insert process"}));
 fireEvent.click(screen.getByRole("button",{name:"Select every shape"}));
 expect(screen.queryByRole("form",{name:"Selected shape"})).not.toBeInTheDocument();
 fireEvent.keyDown(document,{key:"Delete"});
 expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(0);
 fireEvent.click(screen.getByRole("button",{name:"Undo"}));
 expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(2);
});
it("auto-arranges the graph as one undoable edit",()=>{
 const coordinator=createEditorCoordinator();
 render(<Editor coordinator={coordinator}/>);
 fireEvent.click(screen.getByRole("button",{name:"Insert start"}));
 fireEvent.click(screen.getByRole("button",{name:"Insert process"}));
 const before=structuredClone(coordinator.getSnapshot().editor.engine.graph);
 fireEvent.click(screen.getByRole("button",{name:"Auto arrange chart"}));
 expect(coordinator.getSnapshot().editor.message).toBe("Chart arranged.");
 fireEvent.click(screen.getByRole("button",{name:"Undo"}));
 expect(coordinator.getSnapshot().editor.engine.graph).toEqual(before);
});
