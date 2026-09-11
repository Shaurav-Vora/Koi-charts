import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("Voice is not connected yet.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /start listening/i })).not.toBeInTheDocument();
  });
});
