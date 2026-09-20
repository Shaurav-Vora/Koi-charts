import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ExportMenu from "./ExportMenu";
import { graphFixture } from "../test/fixtures";
import { layoutGraph } from "./layout";
import type { FlowGraph } from "../graph/types";

const empty: FlowGraph = { schemaVersion: 1, nodes: [], edges: [] };
const saved: { name: string; type: string }[] = [];

beforeEach(() => {
  saved.length = 0;
  // jsdom has no object URLs and no real downloader, so the file is caught at the anchor.
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    saved.push({ name: this.download, type: "" });
  });
});
afterEach(() => vi.restoreAllMocks());

describe("saving the chart as a picture", () => {
  const mount = (graph = graphFixture()) => render(<ExportMenu graph={graph} layout={layoutGraph(graph)} />);

  it("keeps editable project actions with the image exports in one heading group", () => {
    render(<ExportMenu graph={empty} layout={layoutGraph(empty)} projectControls={<><button>Save project</button><button>Open project</button></>} />);

    const group = screen.getByRole("group", { name: "Project and image exports" });
    expect(group).toContainElement(screen.getByRole("button", { name: "Save project" }));
    expect(group).toContainElement(screen.getByRole("button", { name: "Open project" }));
    for (const label of ["SVG", "PNG", "JPEG", "PDF"]) expect(screen.getByRole("button", { name: label })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save project" })).toBeEnabled();
  });

  it("offers each format as its own button, with no menu to open first", () => {
    mount();
    for (const label of ["SVG", "PNG", "JPEG", "PDF"]) expect(screen.getByRole("button", { name: label })).toBeEnabled();
  });

  it("says what it saved, because a download is silent to a screen reader", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "SVG" }));
    await waitFor(() => expect(screen.getByTestId("export-status")).toHaveTextContent(/^Saved koi-chart-.+\.svg$/));
    expect(saved.at(-1)!.name).toMatch(/\.svg$/);
  });

  it("writes a PDF without a browser canvas, so it works wherever the page loads", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "PDF" }));
    await waitFor(() => expect(saved.at(-1)!.name).toMatch(/\.pdf$/));
  });

  it("disables image exports for an empty chart without adding another header line", () => {
    mount(empty);
    expect(screen.getByRole("button", { name: "SVG" })).toBeDisabled();
    expect(screen.getByTestId("export-status")).toBeEmptyDOMElement();
  });
});
