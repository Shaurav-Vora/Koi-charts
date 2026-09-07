"use client";

/**
 * An on/off control that says which it is. A push button announces "pressed", which describes
 * what the author just did; a switch announces "on" or "off", which describes what the setting
 * now is — the useful thing to hear when you are checking whether replies will be spoken.
 *
 * The label never changes with the state. A control reading "Mute replies" while switched on is
 * ambiguous by construction: it could be the current setting or the action it performs.
 */
export default function ToggleSwitch({ label, checked, disabled, title, className = "", onChange }: {
  label: string; checked: boolean; disabled?: boolean; title?: string; className?: string; onChange: (next: boolean) => void;
}) {
  return <button type="button" role="switch" aria-checked={checked} disabled={disabled} title={title}
    className={`toggle-switch ${className}${checked ? " is-on" : ""}`.trim()} onClick={() => onChange(!checked)}>
    <span className="toggle-track" aria-hidden="true"><span className="toggle-knob" /></span>
    <span>{label}</span>
  </button>;
}
