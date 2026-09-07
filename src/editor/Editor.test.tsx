import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Editor from "./Editor";

function add(label: string) {
  fireEvent.change(screen.getByLabelText("Node label"), { target: { value: label } });
  fireEvent.click(screen.getByRole("button", { name: "Add node" }));
}
function action(value: string) { fireEvent.change(screen.getByLabelText("Editing action"), { target: { value } }); }

describe("manual editor", () => {
  it("adds through the real command engine and supports undo/redo", () => {
    render(<Editor />); fireEvent.click(screen.getByText("Keyboard editing & advanced commands")); add("Begin");
    expect(screen.getByRole("region", { name: "Chart structure" })).toHaveTextContent("Begin");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("region", { name: "Chart structure" })).not.toHaveTextContent("Begin");
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByRole("region", { name: "Chart structure" })).toHaveTextContent("Begin");
  });
  it("connects nodes and requires confirmation before deleting their connections", () => {
    render(<Editor />); fireEvent.click(screen.getByText("Keyboard editing & advanced commands")); add("Begin"); add("Check"); action("connect");
    fireEvent.change(screen.getByLabelText("Connection label (optional)"), { target: { value: "next" } });
    fireEvent.click(screen.getByRole("button", { name: "Connect nodes" }));
    expect(screen.getByRole("region", { name: "Chart structure" })).toHaveTextContent("next");
    action("delete"); fireEvent.click(screen.getByRole("button", { name: "Delete node" }));
    expect(screen.getByRole("button", { name: "Confirm deletion" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("region", { name: "Chart structure" })).toHaveTextContent("Check");
    fireEvent.click(screen.getByRole("button", { name: "Delete node" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm deletion" }));
    expect(screen.getByRole("region", { name: "Chart structure" })).not.toHaveTextContent("Check");
  });
  it("renames and inspects through canonical commands", () => {
    render(<Editor />); fireEvent.click(screen.getByText("Keyboard editing & advanced commands")); add("Begin"); action("rename");
    fireEvent.change(screen.getByLabelText("New label"), { target: { value: "Start here" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename node" }));
    expect(screen.getByRole("region", { name: "Chart structure" })).toHaveTextContent("Start here");
    fireEvent.click(screen.getByRole("button", { name: "Inspect focus" }));
    expect(screen.getByRole("region", { name: "Command feedback" })).toHaveTextContent("No incoming connections");
  });
  it("focuses from the structured outline without stealing keyboard focus", () => {
    render(<Editor />); fireEvent.click(screen.getByText("Keyboard editing & advanced commands")); add("Begin"); add("Check");
    const button = within(screen.getByRole("region", { name: "Chart structure" })).getByRole("button", { name: "Focus Begin" });
    button.focus(); fireEvent.click(button);
    expect(document.activeElement).toBe(button);
    expect(screen.getByRole("region", { name: "Focused node" })).toHaveTextContent("Begin");
  });
  it("rejects a blank semantic label with persistent feedback", () => {
    render(<Editor />); fireEvent.click(screen.getByText("Keyboard editing & advanced commands")); add("   ");
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByRole("region", { name: "Chart structure" })).toHaveTextContent("No nodes yet");
  });
});


it("inserts shapes directly and edits their labels without dropdowns", () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole("button", { name: "Insert decision" }));
  expect(screen.getByRole("region", { name: "Chart structure" })).toHaveTextContent("Decision");
  fireEvent.change(screen.getByLabelText("Shape label"), { target: { value: "Approved?" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply label" }));
  expect(screen.getByRole("region", { name: "Chart structure" })).toHaveTextContent("Approved?");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.getByRole("region", { name: "Chart structure" })).toHaveTextContent("Decision");
});

it("palette insertion follows the last added node, not the selected node", () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole("button", { name: "Insert start" }));
  fireEvent.click(screen.getByRole("button", { name: "Insert process" }));
  fireEvent.click(within(screen.getByRole("region", { name: "Chart structure" })).getByRole("button", { name: "Focus Start" }));
  fireEvent.click(screen.getByRole("button", { name: "Insert decision" }));
  const nodes = Array.from(document.querySelectorAll('.react-flow__node'));
  const x = (label: string) => Number(nodes.find(n => n.textContent?.includes(label))?.getAttribute('style')?.match(/translate\(([-\d.]+)px/)?.[1]);
  expect(x("Process")).toBeGreaterThan(x("Start"));
  expect(x("Decision")).toBeGreaterThan(x("Process"));
});

it("renames a shape inline on double click and allows cancelling",()=>{
 render(<Editor />);
 fireEvent.click(screen.getByRole("button",{name:"Insert process"}));
 const canvas=within(screen.getByRole("region",{name:"Visual flowchart"}));
 fireEvent.doubleClick(canvas.getByRole("button",{name:"Focus Process"}));
 let input=screen.getByRole("textbox",{name:"Rename shape"});
 fireEvent.change(input,{target:{value:"Validate payment"}});
 fireEvent.submit(input.closest("form")!);
 expect(screen.getByRole("region",{name:"Chart structure"})).toHaveTextContent("Validate payment");
 fireEvent.doubleClick(canvas.getByRole("button",{name:"Focus Validate payment"}));
 input=screen.getByRole("textbox",{name:"Rename shape"});
 fireEvent.change(input,{target:{value:"Discard me"}});fireEvent.keyDown(input,{key:"Escape"});
 expect(screen.getByRole("region",{name:"Chart structure"})).not.toHaveTextContent("Discard me");
});

it("speech previews never change committed graph, history or tactile pins",async()=>{
 const {act}=await import("@testing-library/react");
 const {createEditorCoordinator}=await import("./coordinator");
 const coordinator=createEditorCoordinator(async()=>({kind:"add_node",type:"start",label:"Begin",placement:null}));
 render(<Editor coordinator={coordinator}/>);
 act(()=>coordinator.turns.start("test"));
 const before=coordinator.getSnapshot().editor;
 const tactile=screen.getByRole("region",{name:"Tactile display simulator"}).innerHTML;
 await act(()=>coordinator.turns.accept({sessionId:"test",turnId:"1",text:"add a start called Begin",final:false}));
 expect(screen.getByRole("note",{name:"Speech preview"})).toHaveTextContent("Begin");
 expect(coordinator.getSnapshot().editor).toBe(before);
 expect(screen.getByRole("region",{name:"Tactile display simulator"}).innerHTML).toBe(tactile);
 await act(()=>coordinator.turns.accept({sessionId:"test",turnId:"1",text:"add a start called Begin",final:true}));
 expect(screen.queryByRole("note",{name:"Speech preview"})).not.toBeInTheDocument();
 expect(screen.getByRole("region",{name:"Chart structure"})).toHaveTextContent("Begin");
 expect(coordinator.getSnapshot().editor.engine.history.past).toHaveLength(1);
});

// The view controls sit on the canvas, so they must follow the same focus the voice cursor moves.
it("enables fitting once shapes exist and centring once one is selected", () => {
  render(<Editor />);
  expect(screen.getByRole("button", { name: "Fit chart" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Center selection" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Load large example" }));
  expect(screen.getByRole("button", { name: "Fit chart" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Center selection" })).toBeEnabled();
});

// Provenance is diagnostic: an author who sees the wrong shape appear needs to know whether a
// template misread them or the model did, without reading logs they cannot see.
it("labels where a command came from and lets the author send everything to the model", async () => {
  const { act } = await import("@testing-library/react");
  const { createEditorCoordinator } = await import("./coordinator");
  const { localCommandPreference } = await import("./preference");
  localCommandPreference.write(true);
  const coordinator = createEditorCoordinator(async () => ({ kind: "add_node", type: "end", label: "Interpreted", placement: null }));
  render(<Editor coordinator={coordinator} />);
  act(() => coordinator.turns.start("test"));
  await act(() => coordinator.turns.accept({ sessionId: "test", turnId: "1", text: "Add a start called Begin.", final: true }));
  expect(screen.getByRole("region", { name: "Command feedback" })).toHaveTextContent("Local command");
  expect(screen.getByRole("region", { name: "Chart structure" })).toHaveTextContent("Begin");

  const toggle = screen.getByRole("switch", { name: "Fast local commands" });
  expect(toggle).toHaveAttribute("aria-checked", "true");
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-checked", "false");
  await act(() => coordinator.turns.accept({ sessionId: "test", turnId: "2", text: "Add a process called Review.", final: true }));
  expect(screen.getByRole("region", { name: "Command feedback" })).toHaveTextContent("Gemini");
  expect(screen.getByRole("region", { name: "Chart structure" })).toHaveTextContent("Interpreted");
  localCommandPreference.write(true);
});
