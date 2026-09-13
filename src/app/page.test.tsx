import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("application shell", () => {
  it("exposes both empty representations and idle status to assistive technology", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Koi charts", level: 1 })).toBeVisible();
    expect(screen.getByRole("navigation", {name:"Main navigation"})).toContainElement(screen.getByRole("link",{name:"Documentation"}));
    expect(screen.getByRole("link",{name:"Documentation"})).toHaveAttribute("href","/docs");
    expect(screen.getByRole("region", { name: "Visual flowchart" })).toHaveTextContent("Your chart starts here");
    expect(screen.getByRole("region", { name: "Tactile display simulator" })).toHaveTextContent("No pins raised");
    expect(screen.getByRole("status")).toHaveTextContent("Microphone off");
  });

  it("provides a skip link to the workspace and labels unavailable voice honestly", () => {
    render(<Home />);

    const workspace = screen.getByRole("main");
    expect(screen.getByRole("link", { name: "Skip to workspace" })).toHaveAttribute("href", `#${workspace.id}`);
    expect(workspace).toHaveAttribute("tabindex", "-1");
    expect(screen.queryByText("Voice is not connected yet.")).not.toBeInTheDocument();
    expect(screen.getByRole("complementary",{name:"Workspace shortcuts"})).toBeVisible();
    expect(screen.queryByRole("button", { name: /start listening/i })).not.toBeInTheDocument();
  });

  it("introduces the empty workspace with direct paths into voice and visual authoring", () => {
    render(<Home />);

    const welcome = screen.getByRole("region", { name: "Flowcharts everyone can follow." });
    expect(within(welcome).getByRole("heading", { name: "Flowcharts everyone can follow." })).toBeVisible();
    expect(within(welcome).getByRole("link", { name: "Start with voice" })).toHaveAttribute("href", "#voice-workspace");
    expect(within(welcome).getByRole("link", { name: "Choose a shape" })).toHaveAttribute("href", "#shape-palette");
    expect(within(welcome).getByText("Visual canvas")).toBeVisible();
    expect(within(welcome).getByText("Tactile display")).toBeVisible();
    expect(within(welcome).getByText("Spoken guidance")).toBeVisible();
  });

  it("returns to the compact workspace heading after building begins", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "Insert start" }));

    expect(screen.queryByRole("region", { name: "Flowcharts everyone can follow." })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your workspace" })).toBeVisible();
  });
});
