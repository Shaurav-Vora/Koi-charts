import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("public homepage", () => {
  it("introduces Koi Charts and leads into the workspace", () => {
    render(<Home />);

    const hero = screen.getByRole("region", { name: "Flowcharts everyone can follow." });
    expect(within(hero).getByRole("heading", { level: 1, name: "Flowcharts everyone can follow." })).toBeVisible();
    expect(within(hero).getByRole("link", { name: "Open workspace" })).toHaveAttribute("href", "/workspace");
    expect(within(hero).getByRole("link", { name: "Read documentation" })).toHaveAttribute("href", "/docs");
  });

  it("demonstrates the synchronized chart views without rendering the editor", () => {
    render(<Home />);

    const demonstration = screen.getByRole("region", { name: "One chart, three ways to understand it" });
    expect(within(demonstration).getByRole("heading", { name: "Visual canvas" })).toBeVisible();
    expect(within(demonstration).getByRole("heading", { name: "Tactile display" })).toBeVisible();
    expect(within(demonstration).getByRole("heading", { name: "Spoken outline" })).toBeVisible();
    expect(within(demonstration).getByText(/Changes appear everywhere at once/i)).toBeVisible();
    expect(screen.queryByRole("region", { name: "Visual flowchart" })).not.toBeInTheDocument();
  });

  it("explains the authoring workflow as three clear steps", () => {
    render(<Home />);

    const workflow = screen.getByRole("region", { name: "How Koi Charts works" });
    expect(within(workflow).getByRole("heading", { name: "Build the structure" })).toBeVisible();
    expect(within(workflow).getByRole("heading", { name: "Follow every view" })).toBeVisible();
    expect(within(workflow).getByRole("heading", { name: "Test the route" })).toBeVisible();
  });

  it("anchors the review route to the decision's right point with an arrowhead", () => {
    const { container } = render(<Home />);

    const desktopRoute = container.querySelector(".home-route-to-decision");
    const mobileRoute = container.querySelector(".home-route-to-decision-mobile");

    expect(desktopRoute).toHaveAttribute("d", "M54.5 53 V77.5 H29.5");
    expect(desktopRoute).toHaveAttribute("marker-end", "url(#home-route-arrow)");
    expect(mobileRoute).toHaveAttribute("d", "M67 53 V82 H42");
    expect(mobileRoute).toHaveAttribute("marker-end", "url(#home-route-arrow)");
  });

  it("centres each decision label as one counter-rotated block", () => {
    const { container } = render(<Home />);
    const labels = Array.from(container.querySelectorAll(".home-decision-copy"));

    expect(labels).toHaveLength(2);
    for (const label of labels) expect(label).toHaveTextContent("DecisionApproved?");
  });

  it("ends with a clear workspace action", () => {
    render(<Home />);

    const closingAction = screen.getByRole("region", { name: "Start building" });
    expect(within(closingAction).getByRole("link", { name: "Open workspace" })).toHaveAttribute("href", "/workspace");
    expect(within(closingAction).getByText(/charts remain in this browser session/i)).toBeVisible();
  });
});
