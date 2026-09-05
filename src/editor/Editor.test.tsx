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
