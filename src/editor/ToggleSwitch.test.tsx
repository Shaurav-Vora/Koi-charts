import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ToggleSwitch from "./ToggleSwitch";

describe("ToggleSwitch", () => {
  it("reports its state rather than the action, and reports the flip", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch label="Speak replies" checked onChange={onChange} />);
    const control = screen.getByRole("switch", { name: "Speak replies" });
    expect(control).toHaveAttribute("aria-checked", "true");
    fireEvent.click(control);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("cannot be flipped while disabled", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch label="Speak replies" checked={false} disabled title="No speech engine." onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: "Speak replies" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
