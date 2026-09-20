import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import ApiKeyControl from "./ApiKeyControl";
import { assemblyKeyPreference, geminiKeyPreference } from "./api-keys";

beforeEach(() => sessionStorage.clear());
afterEach(() => sessionStorage.clear());

it("manages both provider keys without displaying their values", async () => {
  render(<ApiKeyControl />);
  const trigger = screen.getByRole("button", { name: "API keys, 0 of 2 set" });
  fireEvent.click(trigger);

  const gemini = screen.getByLabelText("Gemini API key", { selector: "input" });
  const assembly = screen.getByLabelText("AssemblyAI API key", { selector: "input" });
  expect(gemini).toHaveAttribute("type", "password");
  expect(assembly).toHaveAttribute("type", "password");
  expect(gemini).toHaveFocus();
  expect(screen.getByRole("link", { name: "Get a Gemini key" })).toHaveAttribute("href", "https://aistudio.google.com/");
  expect(screen.getByRole("link", { name: "Get an AssemblyAI key" })).toHaveAttribute("href", "https://www.assemblyai.com/");

  fireEvent.change(gemini, { target: { value: "user-gemini-key-1234567890" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Gemini key" }));
  fireEvent.change(assembly, { target: { value: "user-assembly-key-1234567890" } });
  fireEvent.click(screen.getByRole("button", { name: "Save AssemblyAI key" }));

  expect(screen.getByRole("button", { name: "API keys, 2 of 2 set" })).toBeVisible();
  expect(geminiKeyPreference.read()).toBe("user-gemini-key-1234567890");
  expect(assemblyKeyPreference.read()).toBe("user-assembly-key-1234567890");
  expect(screen.queryByText("user-gemini-key-1234567890")).not.toBeInTheDocument();
  expect(screen.queryByText("user-assembly-key-1234567890")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Remove AssemblyAI key" }));
  expect(screen.getByRole("button", { name: "API keys, 1 of 2 set" })).toBeVisible();
  expect(assemblyKeyPreference.read()).toBe("");
});
