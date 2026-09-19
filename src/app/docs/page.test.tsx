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
 const desktopNav = screen.getByRole("navigation", { name: "Documentation sections" });
 expect(desktopNav.querySelectorAll(".docs-nav-group")).toHaveLength(3);
 expect(screen.getByRole("link", { name: "Start building" })).toHaveAttribute("href", "#getting-started");
 expect(screen.getByRole("link", { name: "Test a route" })).toHaveAttribute("href", "#testing-chart");
 expect(screen.getByRole("heading", { name: "Choose how you work" })).toBeVisible();
});

it("places a collapsed mobile section browser after the introduction", () => {
 const { container } = render(<Documentation />);
 const hero = container.querySelector(".docs-hero");
 const disclosure = container.querySelector(".docs-mobile-navigation");

 expect(hero).not.toBeNull();
 expect(disclosure).not.toBeNull();
 if (!hero || !disclosure) throw new Error("Documentation navigation structure is missing");
 expect(hero.compareDocumentPosition(disclosure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(disclosure).not.toHaveAttribute("open");
 expect(within(disclosure as HTMLElement).getByText("Browse documentation")).toBeVisible();
 expect(within(disclosure as HTMLElement).getByRole("navigation", {
  name: "Mobile documentation sections",
  hidden: true,
 })).toBeInTheDocument();
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
 const desktopNav = screen.getByRole("navigation", { name: "Documentation sections" });
 expect(within(desktopNav).getByRole("link", { name: "Checking a chart" })).toHaveAttribute("href", "#checking-chart");
 const checking = within(section as HTMLElement);
 expect(checking.getByRole("heading", { name: "Checking a chart" })).toBeVisible();

 const text = section?.textContent ?? "";
 for (const phrase of ["Check chart", "Next issue", "Previous issue", "Repeat issue", "Close check", "Required", "Review"]) {
  expect(text).toContain(phrase);
 }
 expect(text).toMatch(/without calling Gemini/i);
 expect(text).toMatch(/recalculates as you edit/i);
 expect(text).toMatch(/internal identifiers/i);
 expect(text).toMatch(/names the shape or connection being edited/i);
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
 expect(text).toMatch(/use Check chart for structural issues/i);
});

it("documents creating a connected shape from an empty canvas drop", () => {
 const { container } = render(<Documentation />);
 const text = container.querySelector("#getting-started")?.textContent ?? "";

 expect(text).toMatch(/drop (?:the )?connection on empty canvas/i);
 expect(text).toMatch(/choose (?:a|the) shape/i);
 expect(text).toMatch(/release point/i);
 expect(text).toMatch(/compact/i);
 expect(text).toMatch(/auto arrange/i);
 expect(text).toMatch(/fit/i);
});

it("documents recognized local command sequences", () => {
 const { container } = render(<Documentation />);
 const text = container.querySelector("#getting-started")?.textContent ?? "";

 expect(text).toMatch(/then[\s\S]*and then/i);
 expect(text).toMatch(/complete request[\s\S]*Gemini/i);
});
it("documents editable project files as a local, undoable workflow", () => {
 const { container } = render(<Documentation />);
 const section = container.querySelector("#exports");
 expect(section).not.toBeNull();
 const exporting = within(section as HTMLElement);
 for (const heading of ["Continue editing later", "Open a saved project", "Share a non-editable copy"]) {
  expect(exporting.getByRole("heading", { name: heading })).toBeVisible();
 }
 const text = section?.textContent ?? "";
 for (const phrase of [
  "Save project",
  "Open project",
  ".koi",
  "JSON",
  "Undo",
  "2 MiB",
  "processed locally",
  "API keys",
  "SVG",
  "PNG",
  "JPEG",
  "PDF",
  "Confirm delete",
 ]) expect(text).toContain(phrase);
 expect(text).toMatch(/voice[\s\S]*Save project/i);
 expect(text).toMatch(/Open project[\s\S]*Enter/i);
 expect(text).toMatch(/replaces[\s\S]*current chart/i);
});
