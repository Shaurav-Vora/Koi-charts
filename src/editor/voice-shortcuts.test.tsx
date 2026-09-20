import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Editor from "./Editor";
import { createEditorCoordinator } from "./coordinator";

const voice = vi.hoisted(() => ({
  active: false,
  level: 0,
  connectionStatus: "idle" as const,
  start: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("./useVoice", () => ({ useVoice: () => voice }));
vi.mock("../visual/VisualCanvas", () => ({ default: () => null }));

class Utterance { constructor(public text: string) {} }

afterEach(() => {
  cleanup();
  voice.active = false;
  voice.start.mockReset();
  voice.stop.mockReset();
  localStorage.clear();
  vi.unstubAllGlobals();
});

it("exposes and runs the voice toggle shortcut outside editable fields", () => {
  render(<Editor />);
  const button = screen.getByRole("button", { name: "Start voice" });
  expect(button).toHaveAttribute("aria-keyshortcuts", "Control+Alt+V");

  fireEvent.keyDown(document, { key: "v", ctrlKey: true, altKey: true });
  expect(voice.start).toHaveBeenCalledOnce();

  voice.start.mockClear();
  fireEvent.keyDown(screen.getByLabelText("Node label"), { key: "v", ctrlKey: true, altKey: true });
  expect(voice.start).not.toHaveBeenCalled();

  cleanup();
  voice.active = true;
  render(<Editor />);
  fireEvent.keyDown(document, { key: "V", ctrlKey: true, altKey: true });
  expect(voice.stop).toHaveBeenCalledOnce();
});

it("exposes Ctrl Alt S and interrupts a spoken reply", () => {
  const cancel = vi.fn();
  vi.stubGlobal("speechSynthesis", { getVoices: () => [], speak: vi.fn(), cancel });
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  const coordinator = createEditorCoordinator();
  render(<Editor coordinator={coordinator} />);
  const button = screen.getByRole("button", { name: "Stop speaking" });
  expect(button).toHaveAttribute("aria-keyshortcuts", "Control+Alt+S");

  act(() => coordinator.present({ status: "committed", preview: null, text: "A long chart description." }));
  expect(button).toBeEnabled();
  cancel.mockClear();
  fireEvent.keyDown(document, { key: "s", ctrlKey: true, altKey: true });
  expect(cancel).toHaveBeenCalledOnce();
  expect(button).toBeDisabled();
});

it("offers a remembered patient voice timing without changing the balanced default", () => {
  const first = render(<Editor />);
  const timing = screen.getByRole("combobox", { name: "Voice timing" });
  expect(timing).toHaveValue("balanced");
  fireEvent.change(timing, { target: { value: "max_accuracy" } });
  expect(timing).toHaveValue("max_accuracy");
  expect(localStorage.getItem("koi-voice-timing")).toBe("max_accuracy");

  first.unmount();
  render(<Editor />);
  expect(screen.getByRole("combobox", { name: "Voice timing" })).toHaveValue("max_accuracy");
});
