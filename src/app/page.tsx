export default function Home() {
  return (
    <>
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <h1>TactiFlow</h1>
        </div>
        <p className="brand-description">Flowcharts through sight, touch, and voice.</p>
        <span className="build-label">Early preview</span>
      </header>

      <main id="workspace" tabIndex={-1}>
        <div className="workspace-heading">
          <div>
            <h2>Your workspace</h2>
            <p>One chart. Two ways to explore it.</p>
          </div>
          <div className="status" role="status" aria-live="polite">
            <span className="status-dot" aria-hidden="true" /> Idle
          </div>
        </div>

        <div className="display-grid">
          <section className="display visual-display" aria-labelledby="visual-title">
            <div className="display-heading">
              <h3 id="visual-title">Visual flowchart</h3>
              <span className="count">0 nodes · 0 connections</span>
            </div>
            <div className="visual-surface">
              <div className="empty-state">
                <svg className="empty-icon" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                  <rect x="22" y="8" width="36" height="22" rx="11" />
                  <path d="M40 30v16m-5-5 5 5 5-5" />
                  <rect x="14" y="49" width="52" height="24" rx="3" />
                </svg>
                <h4>Your chart starts here</h4>
                <p>Nodes and connections will appear here as you build your flowchart.</p>
                <span className="empty-note">Chart editing is coming in the next milestones.</span>
              </div>
            </div>
            <div className="display-footer">
              <span className="small-outline" aria-hidden="true" />
              <p>An empty canvas, ready for your ideas.</p>
            </div>
          </section>

          <section className="display tactile-display" aria-labelledby="tactile-title">
            <div className="display-heading">
              <h3 id="tactile-title">Tactile display simulator</h3>
              <span className="simulator-tag">Simulation</span>
            </div>
            <div className="tactile-surface">
              <div className="pin-matrix" aria-hidden="true" />
              <div className="tactile-empty">
                <h4>No pins raised</h4>
                <p>Your chart’s shapes and connections will be represented as raised pins.</p>
              </div>
            </div>
            <div className="information-strip">
              <h4>Braille information strip</h4>
              <p>No node selected</p>
            </div>
            <p className="simulation-note">Digital demonstration only. This is not a physical tactile display or validated Braille output.</p>
          </section>
        </div>

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
            <p>This first milestone establishes the workspace. The chart is empty; editing, raised-pin rendering, and voice input will be added step by step.</p>
            <p>Use Tab to reach the skip link and this guide. Resize the window to see the displays stack on smaller screens. Opening this page does not request microphone access.</p>
          </div>
        </details>
      </main>

      <footer className="app-footer">
        <p>Designed for independent flowchart authorship.</p>
        <span>Application shell · Milestone 1</span>
      </footer>
    </>
  );
}
