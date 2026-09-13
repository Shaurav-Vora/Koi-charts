import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import Documentation from "./page";
it("provides documentation navigation, command reference, and export guidance", () => {
 const {container} = render(<Documentation />);
 expect(screen.getByRole("heading", {level:1,name:"Koi charts documentation"})).toBeVisible();
 for(const link of screen.getByRole("navigation", {name:"Documentation sections"}).querySelectorAll("a")) {
  expect(container.querySelector(link.getAttribute("href")!)).not.toBeNull();
 }
 expect(screen.getByRole("heading",{name:"Exporting charts"})).toBeVisible();
});

it("presents the documentation as a structured flowchart field guide", () => {
 const { container } = render(<Documentation />);

 expect(container.querySelector(".docs-hero-route")).not.toBeNull();
 expect(container.querySelectorAll(".docs-nav-group")).toHaveLength(3);
 expect(screen.getByRole("link", { name: "Start building" })).toHaveAttribute("href", "#getting-started");
 expect(screen.getByRole("link", { name: "Test a route" })).toHaveAttribute("href", "#testing-chart");
 expect(screen.getByRole("heading", { name: "Choose how you work" })).toBeVisible();
});

it("documents guided chart testing as a verification workflow", () => {
 const { container } = render(<Documentation />);
 const section = container.querySelector("#testing-chart");

 expect(section).not.toBeNull();
 const testing = within(section as HTMLElement);
 expect(testing.getByRole("heading", { name: "Testing a chart" })).toBeVisible();
 expect(testing.getByText(/verification and walkthrough mode/i)).toBeVisible();

 const text = section?.textContent ?? "";
 for (const instruction of [
  "Test chart",
  "Next step",
  "Back one step",
  "Repeat step",
  "Restart test",
  "Stop test",
  "branch label",
  "dead end",
  "loop",
  "unreachable",
  "chart changes",
 ]) {
  expect(text.toLowerCase()).toContain(instruction.toLowerCase());
 }
});

it("documents structured chart checking as a local accessible workflow", () => {
 const { container } = render(<Documentation />);
 const section = container.querySelector("#checking-chart");

 expect(section).not.toBeNull();
 expect(screen.getByRole("link", { name: "Checking a chart" })).toHaveAttribute("href", "#checking-chart");
 const checking = within(section as HTMLElement);
 expect(checking.getByRole("heading", { name: "Checking a chart" })).toBeVisible();

 const text = section?.textContent ?? "";
 for (const phrase of ["Check chart", "Next issue", "Previous issue", "Repeat issue", "Close check", "Required", "Review"]) {
  expect(text).toContain(phrase);
 }
 expect(text).toMatch(/without calling Gemini/i);
 expect(text).toMatch(/recalculates as you edit/i);
 expect(text).toMatch(/internal identifiers/i);
});

it("documents local voice control and synchronized accessible feedback", () => {
 const { container } = render(<Documentation />);
 const section = container.querySelector("#testing-chart");
 const text = section?.textContent ?? "";

 for (const phrase of ["test chart", "next", "back", "repeat", "take Yes", "restart test", "stop test"]) {
  expect(text).toContain(phrase);
 }
 expect(text).toMatch(/without calling Gemini/i);
 expect(text).toMatch(/visual canvas/i);
 expect(text).toMatch(/Braille information strip/i);
 expect(text).toMatch(/Test route/i);
 expect(text).toMatch(/screen reader/i);
 expect(text).toMatch(/Enter[\s\S]*Space/);
});
