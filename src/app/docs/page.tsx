import type { Metadata } from "next";
import AppHeader from "../AppHeader";
import CommandGuide from "../../editor/CommandGuide";
import { grammar } from "../../commands/grammar";

export const metadata: Metadata = {
  title: "Documentation | Koi charts",
  description: "Voice commands, chart editing, guided testing, and export reference for Koi charts.",
};

const guideHref = (title: string) => `#guide-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export default function Documentation() {
  return (
    <>
      <a className="skip-link" href="#documentation">Skip to documentation</a>
      <AppHeader page="documentation" />
      <main className="docs-layout" id="documentation">
        <aside className="docs-sidebar">
          <nav className="docs-nav" aria-label="Documentation sections">
            <div className="docs-nav-heading">
              <p>Documentation</p>
              <span>Workspace guide</span>
            </div>

            <div className="docs-nav-group">
              <p>Learn</p>
              <a href="#getting-started">Getting started</a>
              <a href="#testing-chart">Testing a chart</a>
            </div>

            <div className="docs-nav-group">
              <p>Voice commands</p>
              {grammar.map(section => (
                <a key={section.title} href={guideHref(section.title)}>{section.title}</a>
              ))}
              <a href="#guide-model">Gemini requests</a>
            </div>

            <div className="docs-nav-group">
              <p>Reference</p>
              <a href="#exports">Exporting charts</a>
            </div>
          </nav>
        </aside>

        <article className="docs-content">
          <header className="docs-hero">
            <div className="docs-hero-copy">
              <p className="docs-kicker">Sight, touch, and voice in one workspace</p>
              <h1>Koi charts documentation</h1>
              <p className="docs-lead">
                Build a flowchart, inspect its structure, and verify every route with the same chart across the canvas, tactile display, and outline.
              </p>
              <div className="docs-hero-actions" aria-label="Documentation shortcuts">
                <a className="docs-primary-link" href="#getting-started">Start building</a>
                <a className="docs-secondary-link" href="#testing-chart">Test a route</a>
              </div>
            </div>

            <div className="docs-hero-route" aria-hidden="true">
              <div className="docs-route-line" />
              <div className="docs-route-stop is-start">
                <span />
                <strong>Build</strong>
              </div>
              <div className="docs-route-stop">
                <span />
                <strong>Inspect</strong>
              </div>
              <div className="docs-route-stop is-finish">
                <span />
                <strong>Test</strong>
              </div>
            </div>
          </header>

          <section id="getting-started" className="docs-section" aria-labelledby="getting-started-title">
            <div className="docs-section-heading">
              <p>Getting started</p>
              <h2 id="getting-started-title">Create your first route</h2>
              <span>Every input method updates one shared chart.</span>
            </div>

            <h3>Choose how you work</h3>
            <div className="docs-mode-grid">
              <article>
                <span className="docs-mode-icon" aria-hidden="true">◉</span>
                <h4>Voice</h4>
                <p>Press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>V</kbd>, wait for Listening, then say <code>add a start called Begin</code>.</p>
              </article>
              <article>
                <span className="docs-mode-icon" aria-hidden="true">◇</span>
                <h4>Canvas</h4>
                <p>Drag a shape from the palette onto the canvas, or select a shape once to append it to the route.</p>
              </article>
              <article>
                <span className="docs-mode-icon" aria-hidden="true">⌨</span>
                <h4>Keyboard</h4>
                <p>Open <strong>Keyboard editing &amp; advanced commands</strong> to add shapes by label and position.</p>
              </article>
            </div>

            <ol className="docs-workflow">
              <li>
                <div>
                  <h3>Add an entry point</h3>
                  <p>Create a Start shape. Double-click it to rename it, or say <code>rename Start to Begin</code>.</p>
                </div>
              </li>
              <li>
                <div>
                  <h3>Connect the next step</h3>
                  <p>Drag between shape ports, or say <code>connect Begin to a new process called Sign in</code>. Select an arrow to add a branch label such as <code>Yes</code> or <code>No</code>.</p>
                </div>
              </li>
              <li>
                <div>
                  <h3>Inspect the shared chart</h3>
                  <p>Focus a shape and compare the visual canvas, 120 × 80 tactile simulation, Braille information strip, and chart outline.</p>
                </div>
              </li>
            </ol>

            <div className="docs-note">
              <div>
                <h3>Editing essentials</h3>
                <p>Select a shape or connection and press <kbd>Delete</kbd>. The lower-right selection card also provides a delete button. Press <kbd>Escape</kbd> to clear the selection.</p>
              </div>
              <p>Press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>S</kbd> to interrupt a spoken reply.</p>
            </div>

            <div className="docs-callout">
              <h3>Reading command syntax</h3>
              <ul>
                <li>Replace angle-bracket terms such as <code>&lt;shape&gt;</code> and <code>&lt;label&gt;</code> with your own values.</li>
                <li>Square brackets mark optional wording.</li>
                <li>Quote labels containing command words: <code>add a process called &ldquo;Sign in with Google&rdquo;</code>.</li>
                <li><strong>Fast local commands</strong> handles common phrases without a network request. <strong>Speak replies</strong> controls spoken feedback.</li>
              </ul>
            </div>
          </section>

          <section id="testing-chart" className="docs-section" aria-labelledby="testing-chart-title">
            <div className="docs-section-heading">
              <p>Guided verification</p>
              <h2 id="testing-chart-title">Testing a chart</h2>
              <span>Walk the route you built without changing it.</span>
            </div>
            <p>
              <strong>Test chart</strong> is a verification and walkthrough mode for an existing chart. It follows shapes and connections one step at a time; it does not create, reconnect, rename, or delete chart content.
            </p>

            <div className="docs-testing-layout">
              <div>
                <h3>Run a walkthrough</h3>
                <ol className="docs-compact-steps">
                  <li><strong>Begin.</strong> Select <strong>Test chart</strong>, or say <code>test chart</code> or <code>start test</code>. Choose a Start if the chart has more than one.</li>
                  <li><strong>Advance.</strong> Select <strong>Next step</strong> or say <code>next</code>. Playback pauses at every shape.</li>
                  <li><strong>Choose.</strong> At multiple outgoing arrows, select a branch label or destination. For example, say <code>take Yes</code>.</li>
                  <li><strong>Review.</strong> Use <strong>Back one step</strong> or <code>back</code>. Use <strong>Repeat step</strong> or <code>repeat</code> to hear the current guidance again.</li>
                  <li><strong>Finish.</strong> Use <strong>Restart test</strong> or <code>restart test</code>, and <strong>Stop test</strong> or <code>stop test</code>.</li>
                </ol>
              </div>

              <aside className="docs-feedback-panel" aria-labelledby="feedback-title">
                <h3 id="feedback-title">One route, three views</h3>
                <dl>
                  <div>
                    <dt>Visual canvas</dt>
                    <dd>Marks visited and current shapes and connections.</dd>
                  </div>
                  <div>
                    <dt>Tactile</dt>
                    <dd>The Braille information strip states the step and incoming arrow.</dd>
                  </div>
                  <div>
                    <dt>Outline</dt>
                    <dd>The ordered <strong>Test route</strong> marks the current item.</dd>
                  </div>
                </dl>
              </aside>
            </div>

            <h3>When a route needs attention</h3>
            <dl className="docs-check-grid">
              <div>
                <dt>Missing or unreachable shapes</dt>
                <dd>A chart without a Start cannot begin. Shapes unreachable from the chosen Start are reported before playback.</dd>
              </div>
              <div>
                <dt>Missing branch labels</dt>
                <dd>An unlabelled arrow remains available by destination, but branch labels make decisions clearer.</dd>
              </div>
              <div>
                <dt>Dead end</dt>
                <dd>Playback pauses when the current shape has no outgoing connection.</dd>
              </div>
              <div>
                <dt>Loop</dt>
                <dd>Playback announces a loop when the route returns to a visited shape and waits for your decision.</dd>
              </div>
              <div>
                <dt>Chart changes</dt>
                <dd>Editing during playback blocks advancement until you restart the test with the current graph.</dd>
              </div>
            </dl>

            <div className="docs-access-note">
              <h3>Voice, keyboard, and screen reader access</h3>
              <p>
                Playback phrases are fast local commands and run without calling Gemini or using Gemini quota. Reach every control with <kbd>Tab</kbd> and activate it with <kbd>Enter</kbd> or <kbd>Space</kbd>. Live status announcements use chart labels instead of internal identifiers.
              </p>
            </div>
          </section>

          <section className="docs-section docs-command-section" aria-labelledby="commands-title">
            <div className="docs-section-heading">
              <p>Command reference</p>
              <h2 id="commands-title">Speak with predictable results</h2>
              <span>Use the exact local forms for the fastest response, or speak naturally for Gemini interpretation.</span>
            </div>
            <CommandGuide />
          </section>

          <section id="exports" className="docs-section" aria-labelledby="exports-title">
            <div className="docs-section-heading">
              <p>Export</p>
              <h2 id="exports-title">Exporting charts</h2>
              <span>Exports capture the full diagram with balanced padding, independent of viewport zoom.</span>
            </div>
            <div className="docs-export-grid">
              <article><strong>SVG</strong><p>Scalable vector output for the web and detailed editing.</p></article>
              <article><strong>PNG</strong><p>High-resolution lossless image with a transparent background.</p></article>
              <article><strong>JPEG</strong><p>Compressed image with a white background for sharing.</p></article>
              <article><strong>PDF</strong><p>Single-page vector document with paths and text preserved.</p></article>
            </div>
            <p className="docs-hint">
              Exported pictures are visual captures, not project save files. Keep the browser tab open while working.
            </p>
          </section>
        </article>
      </main>
    </>
  );
}
