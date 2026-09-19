import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import GeminiKeyControl from "./GeminiKeyControl";
import { geminiKeyPreference } from "./gemini-key";
import { interpretOnServer } from "./interpret-client";
import { createEngineState } from "../commands/execute";

beforeEach(() => sessionStorage.clear());
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });

it("adds, masks, and removes a Gemini key for this tab", async () => {
  render(<GeminiKeyControl />);
  const trigger = screen.getByRole("button", { name: "Set up Gemini" });
  fireEvent.click(trigger);
  const input = screen.getByLabelText("Gemini API key", { selector: "input" });
  expect(input).toHaveAttribute("type", "password");
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: "user-browser-key-1234567890" } });
  fireEvent.click(screen.getByRole("button", { name: "Save key" }));
  expect(await screen.findByRole("button", { name: "Gemini key set" })).toHaveFocus();
  expect(geminiKeyPreference.read()).toBe("user-browser-key-1234567890");
  expect(screen.queryByText("user-browser-key-1234567890")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Gemini key set" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove key" }));
  expect(await screen.findByRole("button", { name: "Set up Gemini" })).toBeVisible();
  expect(geminiKeyPreference.read()).toBe("");
});

it("sends the configured key only with interpretation requests", async () => {
  geminiKeyPreference.write("user-browser-key-1234567890");
  const fetcher = vi.fn().mockResolvedValue(Response.json({ command: { kind: "describe", scope: "chart" } }));
  vi.stubGlobal("fetch", fetcher);
  await interpretOnServer("Describe the chart", createEngineState(), new AbortController().signal);
  const headers = new Headers(fetcher.mock.calls[0][1].headers);
  expect(headers.get("x-koi-gemini-key")).toBe("user-browser-key-1234567890");
});
