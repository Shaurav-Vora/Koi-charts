"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { assemblyKeyPreference, geminiKeyPreference } from "./api-keys";

type Provider = "gemini" | "assembly";
const validKey = (value: string) => /^[A-Za-z0-9._-]{20,256}$/.test(value);

export default function ApiKeyControl() {
  const geminiKey = useSyncExternalStore(geminiKeyPreference.subscribe, geminiKeyPreference.read, geminiKeyPreference.readOnServer);
  const assemblyKey = useSyncExternalStore(assemblyKeyPreference.subscribe, assemblyKeyPreference.read, assemblyKeyPreference.readOnServer);
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<Provider, string>>({ gemini: "", assembly: "" });
  const [errors, setErrors] = useState<Record<Provider, string>>({ gemini: "", assembly: "" });
  const firstInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const configuredCount = Number(!!geminiKey) + Number(!!assemblyKey);

  useEffect(() => {
    if (open) firstInputRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setDrafts({ gemini: "", assembly: "" });
    setErrors({ gemini: "", assembly: "" });
    triggerRef.current?.focus();
  };
  const save = (provider: Provider) => {
    const value = drafts[provider].trim();
    if (!validKey(value)) {
      const name = provider === "gemini" ? "Gemini" : "AssemblyAI";
      setErrors(current => ({ ...current, [provider]: "Enter a valid " + name + " API key." }));
      return;
    }
    try {
      (provider === "gemini" ? geminiKeyPreference : assemblyKeyPreference).write(value);
      setDrafts(current => ({ ...current, [provider]: "" }));
      setErrors(current => ({ ...current, [provider]: "" }));
    } catch {
      setErrors(current => ({ ...current, [provider]: "This browser could not store the key for this tab." }));
    }
  };
  const remove = (provider: Provider) => {
    (provider === "gemini" ? geminiKeyPreference : assemblyKeyPreference).clear();
    setDrafts(current => ({ ...current, [provider]: "" }));
    setErrors(current => ({ ...current, [provider]: "" }));
  };
  const updateDraft = (provider: Provider, value: string) => {
    setDrafts(current => ({ ...current, [provider]: value }));
    setErrors(current => ({ ...current, [provider]: "" }));
  };

  return <div className="api-key-control">
    <button ref={triggerRef} type="button" className={"api-key-button" + (configuredCount ? " is-configured" : "")}
      aria-label={"API keys, " + configuredCount + " of 2 set"} aria-haspopup="dialog" aria-expanded={open}
      onClick={() => setOpen(true)}>
      <span className="api-key-mark" aria-hidden="true" />
      <span>API keys</span>
      <span className="api-key-count" aria-hidden="true">{configuredCount}/2</span>
    </button>
    {open && <div className="api-key-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) close();
    }}>
      <section className="api-key-dialog" role="dialog" aria-modal="true"
        aria-labelledby="api-key-title" aria-describedby="api-key-description"
        onKeyDown={event => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
            return;
          }
          if (event.key !== "Tab") return;
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button:not(:disabled), input:not(:disabled)',
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
        <div className="api-key-dialog-heading">
          <div>
            <h3 id="api-key-title">API keys</h3>
            <p id="api-key-description">Use your own provider accounts for natural-language commands and voice transcription.</p>
          </div>
          <button type="button" className="api-key-close" aria-label="Close API key setup" onClick={close}>&times;</button>
        </div>
        <div className="api-key-providers">
          <section className="api-key-provider" aria-labelledby="gemini-provider-title">
            <div className="api-key-provider-heading">
              <div><h4 id="gemini-provider-title">Gemini</h4><p>Interprets commands outside the fast local grammar.</p></div>
              <span className="api-key-status" data-set={!!geminiKey}>{geminiKey ? "Set for this tab" : "No tab key"}</span>
            </div>
            <label htmlFor="gemini-api-key">Gemini API key</label>
            <input ref={firstInputRef} id="gemini-api-key" type="password" value={drafts.gemini}
              autoComplete="off" autoCapitalize="none" spellCheck={false}
              placeholder={geminiKey ? "Enter a replacement key" : "Paste a Gemini key"}
              aria-invalid={!!errors.gemini} aria-describedby={errors.gemini ? "gemini-key-error" : "gemini-key-note"}
              onChange={event => updateDraft("gemini", event.target.value)} />
            <p id="gemini-key-note" className="api-key-note">Stored only in this tab and sent through Koi Charts to Google.</p>
            {errors.gemini && <p id="gemini-key-error" className="api-key-error" role="alert">{errors.gemini}</p>}
            <div className="api-key-provider-actions">
              <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer">Get a Gemini key</a>
              {geminiKey && <button type="button" className="api-key-remove" onClick={() => remove("gemini")}>Remove Gemini key</button>}
              <button type="button" className="api-key-save" disabled={!drafts.gemini.trim()} onClick={() => save("gemini")}>Save Gemini key</button>
            </div>
          </section>
          <section className="api-key-provider" aria-labelledby="assembly-provider-title">
            <div className="api-key-provider-heading">
              <div><h4 id="assembly-provider-title">AssemblyAI</h4><p>Creates the temporary token used for live transcription.</p></div>
              <span className="api-key-status" data-set={!!assemblyKey}>{assemblyKey ? "Set for this tab" : "No tab key"}</span>
            </div>
            <label htmlFor="assembly-api-key">AssemblyAI API key</label>
            <input id="assembly-api-key" type="password" value={drafts.assembly}
              autoComplete="off" autoCapitalize="none" spellCheck={false}
              placeholder={assemblyKey ? "Enter a replacement key" : "Paste an AssemblyAI key"}
              aria-invalid={!!errors.assembly} aria-describedby={errors.assembly ? "assembly-key-error" : "assembly-key-note"}
              onChange={event => updateDraft("assembly", event.target.value)} />
            <p id="assembly-key-note" className="api-key-note">Sent only to Koi Charts to mint a short-lived voice token.</p>
            {errors.assembly && <p id="assembly-key-error" className="api-key-error" role="alert">{errors.assembly}</p>}
            <div className="api-key-provider-actions">
              <a href="https://www.assemblyai.com/" target="_blank" rel="noreferrer">Get an AssemblyAI key</a>
              {assemblyKey && <button type="button" className="api-key-remove" onClick={() => remove("assembly")}>Remove AssemblyAI key</button>}
              <button type="button" className="api-key-save" disabled={!drafts.assembly.trim()} onClick={() => save("assembly")}>Save AssemblyAI key</button>
            </div>
          </section>
        </div>
        <div className="api-key-dialog-actions"><button type="button" onClick={close}>Done</button></div>
      </section>
    </div>}
  </div>;
}
