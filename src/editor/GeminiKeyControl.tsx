"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { geminiKeyPreference } from "./gemini-key";

export default function GeminiKeyControl() {
  const key = useSyncExternalStore(
    geminiKeyPreference.subscribe,
    geminiKeyPreference.read,
    geminiKeyPreference.readOnServer,
  );
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const configured = !!key;

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setDraft("");
    setError("");
    triggerRef.current?.focus();
  };
  const save = () => {
    const value = draft.trim();
    if (!/^[A-Za-z0-9._-]{20,256}$/.test(value)) {
      setError("Enter a valid Gemini API key.");
      return;
    }
    try {
      geminiKeyPreference.write(value);
      close();
    } catch {
      setError("This browser could not store the key for this tab.");
    }
  };
  const remove = () => {
    geminiKeyPreference.clear();
    close();
  };

  return <div className="gemini-key-control">
    <button ref={triggerRef} type="button" className={"gemini-key-button" + (configured ? " is-configured" : "")}
      aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <span className="gemini-key-mark" aria-hidden="true" />
      {configured ? "Gemini key set" : "Set up Gemini"}
    </button>
    {open && <div className="gemini-key-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) close();
    }}>
      <section className="gemini-key-dialog" role="dialog" aria-modal="true"
        aria-labelledby="gemini-key-title" aria-describedby="gemini-key-description"
        onKeyDown={event => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
            return;
          }
          if (event.key !== "Tab") return;
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled)',
          ));
          const first = controls[0], last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}>
        <div className="gemini-key-dialog-heading">
          <div>
            <h3 id="gemini-key-title">Gemini API key</h3>
            <p id="gemini-key-description">Used only when a command needs Gemini. The key stays in this browser tab.</p>
          </div>
          <button type="button" className="gemini-key-close" aria-label="Close Gemini key setup" onClick={close}>&times;</button>
        </div>
        <label htmlFor="gemini-api-key">Gemini API key</label>
        <input ref={inputRef} id="gemini-api-key" type="password" value={draft}
          autoComplete="off" autoCapitalize="none" spellCheck={false}
          placeholder={configured ? "Enter a replacement key" : "Paste your Google AI Studio key"}
          aria-invalid={!!error} aria-describedby={error ? "gemini-key-error" : "gemini-key-storage"}
          onChange={event => { setDraft(event.target.value); setError(""); }} />
        <p id="gemini-key-storage" className="gemini-key-note">
          It is sent through this site&apos;s server to Google and cleared when you close the tab.
        </p>
        {error && <p id="gemini-key-error" className="gemini-key-error" role="alert">{error}</p>}
        <div className="gemini-key-actions">
          {configured && <button type="button" className="gemini-key-remove" onClick={remove}>Remove key</button>}
          <button type="button" onClick={close}>Cancel</button>
          <button type="button" className="gemini-key-save" disabled={!draft.trim()} onClick={save}>Save key</button>
        </div>
      </section>
    </div>}
  </div>;
}
