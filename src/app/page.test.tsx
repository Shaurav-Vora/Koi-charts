import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("public homepage", () => {
  it("introduces Koi Charts and leads into the workspace", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1, name: "Flowcharts everyone can follow." })).toBeVisible();
    expect(screen.getByRole("link", { name: "Open workspace" })).toHaveAttribute("href", "/workspace");
    expect(screen.getByRole("link", { name: "Read documentation" })).toHaveAttribute("href", "/docs");
  });

  it("demonstrates the synchronized chart views without rendering the editor", () => {
    render(<Home />);

    const demonstration = screen.getByRole("region", { name: "One chart, three ways to understand it" });
    expect(within(demonstration).getByText("Visual canvas")).toBeVisible();
    expect(within(demonstration).getByText("Tactile display")).toBeVisible();
    expect(within(demonstration).getByText("Spoken outline")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Visual flowchart" })).not.toBeInTheDocument();
  });
});
