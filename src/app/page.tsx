import Image from "next/image";
import Editor from "../editor/Editor";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <header className="app-header">
        <div className="brand">
          <Image className="brand-mark" src="/koi.svg" width={42} height={42} alt="" />
          <h1>Koi charts</h1>
        </div>
        <p className="brand-description">Flowcharts through sight, touch, and voice.</p>
        <span className="build-label">Early preview</span>
      </header>

      <main id="workspace" tabIndex={-1}>
        <Editor />

        <section className="voice-panel" aria-labelledby="voice-title">
          <svg className="voice-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
          </svg>
          <div>
            <h3 id="voice-title">Voice workspace</h3>
            <p>Voice is not connected yet.</p>
          </div>
          <p className="microphone-note">Your microphone is off.</p>
        </section>

        <details className="milestone-help">
          <summary>What can I check in this preview?</summary>
          <div>
            <p>Click or drag shapes from the palette. Connect their dots and select a shape to rename or delete it. Keyboard editing and advanced commands are available below the canvas. Undo and redo let you revisit changes. Refreshing the page clears this local workspace.</p>
            <p>Every editing action is available using the keyboard. Use the chart outline to focus nodes, and Describe chart or Inspect focus to explore them. The tactile simulator follows your chart and focus. Voice input is coming next.</p>
          </div>
        </details>
      </main>

      <footer className="app-footer">
        <p>Designed for independent flowchart authorship.</p>
        <span>Local workspace · Not saved</span>
      </footer>
    </>
  );
}
