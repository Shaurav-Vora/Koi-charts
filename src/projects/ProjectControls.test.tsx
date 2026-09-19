import { act, createRef } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { graphFixture } from "../test/fixtures";
import { serializeKoiProject } from "./koi-file";
import ProjectControls, { type ProjectControlsHandle } from "./ProjectControls";
import { KOI_MIME_TYPE, MAX_KOI_FILE_BYTES } from "./types";

const downloads: Array<{ blob: Blob; name: string }> = [];
let currentBlob: Blob | null = null;

function bytesFor(graph = graphFixture()) {
  return new TextEncoder().encode(serializeKoiProject(graph)).buffer;
}

function fileStub(name: string, bytes: ArrayBuffer) {
  return {
    name,
    size: bytes.byteLength,
    arrayBuffer: vi.fn(async () => bytes),
  } as unknown as File;
}

beforeEach(() => {
  downloads.length = 0;
  currentBlob = null;
  URL.createObjectURL = vi.fn(blob => {
    currentBlob = blob as Blob;
    return "blob:project";
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ blob: currentBlob!, name: this.download });
  });
});

afterEach(() => vi.restoreAllMocks());

const mount = (options: {
  graph?: ReturnType<typeof graphFixture>;
  onImport?: (graph: ReturnType<typeof graphFixture>, filename: string) => void;
  onResult?: (result: { outcome: "committed" | "error"; message: string }) => void;
  ref?: React.Ref<ProjectControlsHandle>;
} = {}) => {
  const graph = options.graph ?? graphFixture();
  return render(<ProjectControls
    ref={options.ref}
    graph={graph}
    onImport={options.onImport ?? vi.fn()}
    onResult={options.onResult ?? vi.fn()}
  />);
};

describe("editable project controls", () => {
  it("saves an empty editable project with the Koi MIME type and extension", async () => {
    const onResult = vi.fn();
    mount({ graph: { schemaVersion: 1, nodes: [], edges: [] }, onResult });

    const save = screen.getByRole("button", { name: "Save project" });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0].name).toMatch(/^koi-chart-\d{4}-\d{2}-\d{2}-\d{6}\.koi$/);
    expect(downloads[0].blob.type).toBe(KOI_MIME_TYPE);
    expect(onResult).toHaveBeenCalledWith({ outcome: "committed", message: expect.stringMatching(/^Saved koi-chart-.+\.koi\.$/) });
  });

  it("exposes a restricted native file input from the visible Open control", () => {
    const { container } = mount();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const click = vi.spyOn(input, "click");

    expect(input).toHaveAttribute("accept", `.koi,${KOI_MIME_TYPE}`);
    fireEvent.click(screen.getByRole("button", { name: "Open project" }));
    expect(click).toHaveBeenCalledOnce();
  });

  it("imports a valid file once without a duplicate result announcement", async () => {
    const onImport = vi.fn();
    const onResult = vi.fn();
    const { container } = mount({ onImport, onResult });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = fileStub("checkout.koi", bytesFor());

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onImport).toHaveBeenCalledOnce());
    expect(onImport).toHaveBeenCalledWith(graphFixture(), "checkout.koi");
    expect(onResult).not.toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it("allows choosing the same valid file again", async () => {
    const onImport = vi.fn();
    const { container } = mount({ onImport });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = fileStub("repeat.koi", bytesFor());

    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(2));
  });

  it("rejects oversized and invalid files before changing the chart", async () => {
    const onImport = vi.fn();
    const onResult = vi.fn();
    const { container } = mount({ onImport, onResult });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const oversized = {
      name: "huge.koi",
      size: MAX_KOI_FILE_BYTES + 1,
      arrayBuffer: vi.fn(),
    } as unknown as File;

    fireEvent.change(input, { target: { files: [oversized] } });
    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith({ outcome: "error", message: "This file is too large to open." }));
    expect(oversized.arrayBuffer).not.toHaveBeenCalled();

    const invalid = fileStub("broken.koi", new TextEncoder().encode("not json").buffer);
    fireEvent.change(input, { target: { files: [invalid] } });
    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith({ outcome: "error", message: "This file could not be read." }));
    expect(onImport).not.toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it("uses a stable public message when the browser cannot read a file", async () => {
    const onResult = vi.fn();
    const { container } = mount({ onResult });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const unreadable = {
      name: "unreadable.koi",
      size: 20,
      arrayBuffer: vi.fn(async () => { throw new Error("private browser failure"); }),
    } as unknown as File;

    fireEvent.change(input, { target: { files: [unreadable] } });

    await waitFor(() => expect(onResult).toHaveBeenCalledWith({ outcome: "error", message: "This file could not be read." }));
  });

  it("keeps picker cancellation silent", () => {
    const onImport = vi.fn();
    const onResult = vi.fn();
    const { container } = mount({ onImport, onResult });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [] } });

    expect(onImport).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("prepares imperative Open without trying to launch a picker", async () => {
    const ref = createRef<ProjectControlsHandle>();
    const { container } = mount({ ref });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const click = vi.spyOn(input, "click");
    let result: Awaited<ReturnType<ProjectControlsHandle["run"]>> | undefined;

    await act(async () => { result = await ref.current!.run("open"); });

    expect(screen.getByRole("button", { name: "Open project" })).toHaveFocus();
    expect(click).not.toHaveBeenCalled();
    expect(result).toEqual({ outcome: "committed", message: "Open project ready. Press Enter to choose a Koi file." });
  });

  it("uses the same download path for imperative Save", async () => {
    const ref = createRef<ProjectControlsHandle>();
    mount({ ref });

    const result = await ref.current!.run("save");

    expect(downloads).toHaveLength(1);
    expect(result).toEqual({ outcome: "committed", message: expect.stringMatching(/^Saved koi-chart-.+\.koi\.$/) });
  });
});
