import type { Metadata } from "next";
import AppHeader from "../AppHeader";
import CommandGuide from "../../editor/CommandGuide";
import { grammar } from "../../commands/grammar";

export const metadata: Metadata = {
  title: "Documentation | Koi charts",
  description: "Voice commands, chart editing, and export reference for Koi charts.",
};

export default function Documentation() {
  return (
    <>
      <a className="skip-link" href="#documentation">Skip to documentation</a>
      <AppHeader page="documentation" />
      <main className="docs-layout" id="documentation">
        <nav className="docs-nav" aria-label="Documentation sections">
          <p>On this page</p>
          <a href="#getting-started">Getting started</a>
          {grammar.map(section => (
            <a key={section.title} href={`#guide-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              {section.title}
            </a>
          ))}
          <a href="#guide-model">Gemini requests</a>
          <a href="#exports">Exporting charts</a>
        </nav>
        <article className="docs-content">
          <header className="docs-header">
            <h1>Koi charts documentation</h1>
            <p className="docs-lead">
              A multimodal flowchart workspace designed for independent blind, low-vision, and sighted authorship.
            </p>
          </header>

          <section id="getting-started" className="docs-section" aria-labelledby="getting-started-title">
            <h2 id="getting-started-title">Getting started</h2>
            <p>
              Koi charts synchronizes three representations of your flowchart simultaneously: a visual interactive canvas, a digital 120 × 80 raised-pin tactile simulation, and a structured text outline. You can create and edit shapes using spoken voice commands, mouse drag-and-drop, or the keyboard form.
            </p>

            <div className="quickstart-steps">
              <div className="quickstart-step">
                <div className="step-badge">Step 1</div>
                <div className="step-content">
                  <h3>Add your first shape</h3>
                  <p>
                    <strong>Voice:</strong> Select <strong>Start voice</strong>, or press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>V</kbd>, and grant microphone permission. The same shortcut stops voice capture. When the status indicator turns green (<strong>Listening</strong>), say <code>&ldquo;add a start&rdquo;</code> or <code>&ldquo;add a start called Begin&rdquo;</code>. Press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>S</kbd> to interrupt a spoken reply.
                  </p>
                  <p>
                    <strong>Mouse:</strong> Drag a shape (Start, Process, Decision, or End) from the left <strong>Shape Palette</strong> directly onto the canvas, or click any shape button to append it.
                  </p>
                  <p>
                    <strong>Keyboard:</strong> Open <em>Keyboard editing &amp; advanced commands</em> below the canvas to add nodes by label and coordinate.
                  </p>
                </div>
              </div>

              <div className="quickstart-step">
                <div className="step-badge">Step 2</div>
                <div className="step-content">
                  <h3>Connect and label shapes</h3>
                  <p>
                    <strong>Connecting:</strong> Hover over any shape on the visual canvas and drag from any of its circular connection ports to a target shape. Or by voice, say <code>&ldquo;connect Start to a new process called Login&rdquo;</code>.
                  </p>
                  <p>
                    <strong>Renaming:</strong> Double-click any shape on the canvas to edit its label inline, or say <code>&ldquo;rename Start to Launch&rdquo;</code>. Click on any connecting arrow to open the arrow inspector and label branches (e.g., <code>Yes</code> or <code>No</code>).
                  </p>
                  <p>
                    <strong>Deleting:</strong> Select any node and press <kbd>Delete</kbd>, or say <code>&ldquo;delete Login&rdquo;</code>. Connected nodes will request confirmation before links are removed.
                  </p>
                </div>
              </div>

              <div className="quickstart-step">
                <div className="step-badge">Step 3</div>
                <div className="step-content">
                  <h3>Explore across sight, touch, and outline</h3>
                  <p>
                    <strong>Canvas floating toolbar:</strong> The top-left canvas toolbar provides <strong>Undo</strong>, <strong>Redo</strong>, <strong>Clear chart</strong>, and <strong>Zoom</strong> controls. The bottom dock contains walk controls (<code>Go to start</code>, <code>Back</code>, <code>Next</code>, <code>Where am I</code>) and diagnostic tools.
                  </p>
                  <p>
                    <strong>Tactile simulator:</strong> Scroll down to the <strong>Tactile display simulator</strong> to view the raised-pin matrix. Toggle between <strong>Auto</strong>, <strong>Overview</strong>, and <strong>Focused view</strong> to zoom into neighborhoods, and read the Braille information strip below.
                  </p>
                  <p>
                    <strong>Chart outline:</strong> Located beside the tactile matrix, the outline lists every node and connection with direct focus buttons and status indicators.
                  </p>
                </div>
              </div>
            </div>

            <div className="docs-callout">
              <h3>Command Syntax Conventions</h3>
              <ul>
                <li>Words in angle brackets, such as <code>&lt;shape&gt;</code> or <code>&lt;label&gt;</code>, are placeholders to replace with your values.</li>
                <li>Words in square brackets, such as <code>[node]</code>, are optional wording that you may include or omit.</li>
                <li>Labels containing grammatical keywords should be quoted, e.g., <code>add a process called &ldquo;Sign in with Google&rdquo;</code>.</li>
                <li>Toggle <strong>Fast local commands</strong> in the voice bar to process common commands on-device without network latency.</li>
                <li>Toggle <strong>Speak replies</strong> to enable or mute spoken voice feedback.</li>
              </ul>
            </div>
          </section>

          <CommandGuide />

          <section id="exports" className="docs-section">
            <h2>Exporting charts</h2>
            <p>
              Use the export controls (<strong>SVG</strong>, <strong>PNG</strong>, <strong>JPEG</strong>, <strong>PDF</strong>) located in the visual display heading above the canvas. Exports capture the entire diagram with balanced padding, regardless of current zoom or viewport scroll position.
            </p>
            <dl>
              <dt>SVG</dt>
              <dd>Scalable vector graphics, ideal for responsive web pages or infinite zooming.</dd>
              <dt>PNG</dt>
              <dd>High-resolution lossless raster image with transparent canvas background.</dd>
              <dt>JPEG</dt>
              <dd>Compressed image with clean white background, optimized for email or sharing.</dd>
              <dt>PDF</dt>
              <dd>Single-page vector document preserving vector paths and text layers.</dd>
            </dl>
            <p className="docs-hint">
              Exported pictures are visual captures, not project save files. Keep your browser tab open while working.
            </p>
          </section>
        </article>
      </main>
    </>
  );
}
