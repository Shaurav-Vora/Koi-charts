import type { Metadata } from "next";
import AppHeader from "../AppHeader";
import CommandGuide from "../../editor/CommandGuide";
import { grammar } from "../../commands/grammar";
import "./documentation.css";

export const metadata: Metadata = {
  title: "Documentation | Koi charts",
  description: "Voice commands, chart editing, structural review, guided testing, and export reference for Koi charts.",
};

const guideHref = (title: string) => `#guide-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

function DocumentationSections() {
  return (
    <>
      <div className="docs-nav-heading">
        <p>Documentation</p>
        <span>Workspace guide</span>
      </div>

      <div className="docs-nav-group">
        <p>Learn</p>
        <a href="#getting-started">Getting started</a>
        <a href="#checking-chart">Checking a chart</a>
        <a href="#testing-chart">Testing a chart</a>
      </div>

      <div className="docs-nav-group">
        <p>Voice commands</p>
        {grammar.map(section => (
          <a key={section.title} href={guideHref(section.title)}>{section.title}</a>
        ))}
        <a href="#guide-api-keys">API keys</a>
      </div>

      <div className="docs-nav-group">
        <p>Reference</p>
        <a href="#exports">Exporting charts</a>
      </div>
    </>
  );
}

export default function Documentation() {
  return (
    <>
      <a className="skip-link" href="#documentation">Skip to documentation</a>
      <AppHeader page="documentation" />
      <main className="docs-layout" id="documentation">
        <aside className="docs-sidebar">
          <nav className="docs-nav" aria-label="Documentation sections">
            <DocumentationSections />
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

          <details className="docs-mobile-navigation">
            <summary>
              <span>Browse documentation</span>
              <small>Jump to a section</small>
            </summary>
            <nav className="docs-nav" aria-label="Mobile documentation sections">
              <DocumentationSections />
            </nav>
          </details>

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
                  <p>Drag between shape ports, or drop the connection on empty canvas and choose a shape to create there. The pending route stays anchored to the original release point while you choose. You can also say <code>connect Begin to a new process called Sign in</code>. Select an arrow to add a branch label such as <code>Yes</code> or <code>No</code>.</p>
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
                <p>Select a shape or connection and press <kbd>Delete</kbd>. The lower-right selection card also provides a delete button. Press <kbd>Escape</kbd> to clear the selection. Use <strong>Compact nodes</strong> when space is limited. Use <strong>Auto arrange chart</strong> to restore a readable top-to-bottom layout, fit the chart to the canvas, and centre the focused shape.</p>
              </div>
              <p>Press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>S</kbd> to interrupt a spoken reply.</p>
            </div>

            <div className="docs-callout">
              <h3>Reading command syntax</h3>
              <ul>
                <li>Replace angle-bracket terms such as <code>&lt;shape&gt;</code> and <code>&lt;label&gt;</code> with your own values.</li>
                <li>Every shape displays a short reference such as <code>N3</code> on the canvas. Say <code>node three</code> or <code>N3</code> anywhere a full shape label is accepted; the reference remains attached when you rename the shape.</li>
                <li>Square brackets mark optional wording.</li>
                <li>Quote labels containing command words: <code>add a process called &ldquo;Sign in with Google&rdquo;</code>.</li>
                <li><strong>Fast local commands</strong> handles common phrases without a network request. Join recognised commands with <code>then</code>, <code>and then</code>, or <code>and</code> to apply them together. If any clause is not recognised, Koi Charts sends the complete request to Gemini.</li>
                <li><strong>Speak replies</strong> controls spoken feedback.</li>
              </ul>
            </div>
          </section>

          <section id="checking-chart" className="docs-section" aria-labelledby="checking-chart-title">
            <div className="docs-section-heading">
              <p>Structural review</p>
              <h2 id="checking-chart-title">Checking a chart</h2>
              <span>Find gaps and ambiguity before walking a route.</span>
            </div>
            <p>
              <strong>Check chart</strong> reviews the whole flow without changing it. It presents one issue at a time, focuses the relevant shape across the canvas, tactile display, and outline, and recalculates as you edit.
            </p>

            <div className="docs-testing-layout">
              <div>
                <h3>Review the structure</h3>
                <ol className="docs-compact-steps">
                  <li><strong>Open.</strong> Select <strong>Check chart</strong> above the canvas, or say <code>check chart</code>.</li>
                  <li><strong>Read.</strong> Each item states whether it is <strong>Required</strong> for a complete route or a <strong>Review</strong> item that may cause ambiguity.</li>
                  <li><strong>Navigate.</strong> Use <strong>Next issue</strong> and <strong>Previous issue</strong>, or speak those phrases. The corresponding shape receives shared focus and is centred in the canvas.</li>
                  <li><strong>Apply a safe fix.</strong> Missing Start and End issues offer an add action that uses normal edit history and can be undone.</li>
                  <li><strong>Open the relevant editor.</strong> Duplicate labels open the shape editor, unlabelled branches open the arrow editor, and multiple Starts are reviewed one focused node at a time. The audit closes before the editor opens.</li>
                  <li><strong>Repeat.</strong> Select or say <strong>Repeat issue</strong> to hear the current title again.</li>
                  <li><strong>Close.</strong> Select the close control or say <strong>Close check</strong>. Closing the review does not alter the chart.</li>
                </ol>
              </div>

              <aside className="docs-feedback-panel" aria-labelledby="audit-feedback-title">
                <h3 id="audit-feedback-title">How results behave</h3>
                <dl>
                  <div>
                    <dt>Stable position</dt>
                    <dd>The current issue stays selected after an unrelated edit.</dd>
                  </div>
                  <div>
                    <dt>Resolved issue</dt>
                    <dd>The review advances to the next remaining item.</dd>
                  </div>
                  <div>
                    <dt>Clear result</dt>
                    <dd>The panel remains open and confirms that no issues were found.</dd>
                  </div>
                </dl>
              </aside>
            </div>

            <h3>What the audit checks</h3>
            <dl className="docs-check-grid">
              <div>
                <dt>Entry and exit</dt>
                <dd>A chart needs one Start and at least one End. Multiple Starts are identified for review.</dd>
              </div>
              <div>
                <dt>Reachability</dt>
                <dd>Every shape should belong to a route that begins at the Start.</dd>
              </div>
              <div>
                <dt>Complete paths</dt>
                <dd>Non-End dead ends and connected paths that cannot reach an End are reported separately.</dd>
              </div>
              <div>
                <dt>Decision branches</dt>
                <dd>Each Decision needs at least two outgoing arrows, and each arrow should have an outcome label.</dd>
              </div>
              <div>
                <dt>Distinct labels</dt>
                <dd>Duplicate labels are identified because voice and keyboard references need an unambiguous name.</dd>
              </div>
            </dl>

            <div className="docs-access-note">
              <h3>Private, concise feedback</h3>
              <p>
                Chart checking runs locally without calling Gemini or using Gemini quota. Spoken and visible issue copy uses chart labels and never exposes internal identifiers. When a suggested action opens an editor, the reply names the shape or connection being edited. Opening <strong>Test chart</strong> closes the audit so the two review modes do not overlap.
              </p>
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
                <dt>Missing Start</dt>
                <dd>A chart without a Start cannot begin. Use Check chart for structural issues such as unreachable shapes, missing Ends, and incomplete decisions.</dd>
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

          <section id="guide-api-keys" className="docs-section" aria-labelledby="guide-api-keys-title">
            <div className="docs-section-heading">
              <p>Provider access</p>
              <h2 id="guide-api-keys-title">Use your own API keys</h2>
              <span>Local editing remains available without provider keys. Add only the services you want to use.</span>
            </div>
            <ol className="docs-workflow">
              <li>
                <div>
                  <h3>Open API keys</h3>
                  <p>In the workspace voice toolbar, select <strong>API keys</strong>. The counter shows how many of the two providers are configured for this tab.</p>
                </div>
              </li>
              <li>
                <div>
                  <h3>Add Gemini</h3>
                  <p>Gemini interprets natural-language commands outside the fast local grammar. Obtain a key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer">Google AI Studio</a>, paste it into the Gemini field, and choose <strong>Save Gemini key</strong>.</p>
                </div>
              </li>
              <li>
                <div>
                  <h3>Add AssemblyAI</h3>
                  <p>AssemblyAI provides live speech transcription. Obtain a key from <a href="https://www.assemblyai.com/" target="_blank" rel="noreferrer">AssemblyAI</a>, paste it into the AssemblyAI field, and choose <strong>Save AssemblyAI key</strong>.</p>
                </div>
              </li>
              <li>
                <div>
                  <h3>Replace or remove a key</h3>
                  <p>Open <strong>API keys</strong> again to enter a replacement or remove either provider. Each key is stored only for the current browser tab and is cleared when the tab closes.</p>
                </div>
              </li>
            </ol>
            <div className="docs-access-note">
              <h3>Key handling</h3>
              <p>Keys are masked, excluded from saved Koi projects, and sent only to the matching Koi Charts server route. AssemblyAI returns a short-lived transcription token; its permanent key is never used by the live browser connection. Deployment keys remain the fallback for providers not configured in the tab.</p>
            </div>
          </section>

          <section id="exports" className="docs-section" aria-labelledby="exports-title">
            <div className="docs-section-heading">
              <p>Projects and exports</p>
              <h2 id="exports-title">Exporting charts</h2>
              <span>Keep an editable project for later, or create a fixed copy for sharing.</span>
            </div>

            <ol className="docs-workflow">
              <li>
                <div>
                  <h3>Continue editing later</h3>
                  <p><strong>Save project</strong> downloads the complete chart as a versioned <code>.koi</code> file. It is readable UTF-8 JSON and preserves shape types, labels, positions, connections, and connection labels. Project files are processed locally in your browser and are never uploaded.</p>
                  <p>By voice, say <code>Save project</code>, <code>Export project</code>, or <code>Download project</code> to save by voice without calling Gemini. The file excludes credentials such as API keys, environment variables, browser preferences, transcripts, speech data, provider responses, temporary selections, and undo history.</p>
                </div>
              </li>
              <li>
                <div>
                  <h3>Open a saved project</h3>
                  <p>Select <strong>Open project</strong> and choose a <code>.koi</code> file no larger than <strong>2 MiB</strong>. Koi Charts validates the whole file before it replaces the current chart. A successful import is one history entry: <strong>Undo</strong> restores the previous chart and <strong>Redo</strong> reapplies the imported project. An invalid or unsupported file leaves the workspace unchanged.</p>
                  <p>For keyboard access, use <kbd>Tab</kbd> to reach <strong>Open project</strong> and press <kbd>Enter</kbd>. By voice, say <code>Open project</code>, <code>Import project</code>, or <code>Load project</code>. The command focuses the button and asks you to press <kbd>Enter</kbd>, which gives the browser permission to show its file picker.</p>
                </div>
              </li>
              <li>
                <div>
                  <h3>Share a non-editable copy</h3>
                  <p>Choose an image or document format when the recipient only needs to view or publish the chart. These exports capture the complete diagram with balanced padding, independent of canvas zoom, but cannot be reopened as editable Koi Charts projects.</p>
                </div>
              </li>
            </ol>

            <div className="docs-export-grid">
              <article><strong>SVG</strong><p>Scalable vector output for the web and design tools.</p></article>
              <article><strong>PNG</strong><p>High-resolution lossless image with a transparent background.</p></article>
              <article><strong>JPEG</strong><p>Compressed image with a white background for sharing.</p></article>
              <article><strong>PDF</strong><p>Single-page vector document with paths and text preserved.</p></article>
            </div>

            <div className="docs-access-note">
              <h3>Safe deletion confirmation</h3>
              <p>When deleting a connected shape by voice, wait for the confirmation request, then say <code>Confirm delete</code>, <code>Confirm deletion</code>, or <code>Yes, delete it</code>. These exact local phrases confirm only the prepared deletion and do not call Gemini.</p>
            </div>
          </section>
        </article>
      </main>
    </>
  );
}
