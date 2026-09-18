import Link from "next/link";
import AppHeader from "./AppHeader";
import HomeHowItWorks from "./HomeHowItWorks";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#home-content">Skip to main content</a>
      <AppHeader page="home" />

      <main className="home-page" id="home-content">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <h1 id="home-title">Flowcharts everyone can follow.</h1>
            <p className="home-lead">
              Build and test the same chart through sight, touch, keyboard, or voice.
              Every view stays connected to the same structure.
            </p>
            <div className="home-actions">
              <Link className="home-primary-action" href="/workspace">Open workspace</Link>
              <Link className="home-secondary-action" href="/docs">Read documentation</Link>
            </div>
            <ul className="home-assurances" aria-label="Workspace capabilities">
              <li>Voice-first editing</li>
              <li>120 × 80 tactile view</li>
              <li>Guided route testing</li>
            </ul>
          </div>

          <div className="home-hero-canvas" aria-hidden="true">
            <div className="home-canvas-bar">
              <span>Approval flow</span>
              <span>3 nodes · 2 connections</span>
            </div>
            <div className="home-canvas-body">
              <svg className="home-canvas-routes" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <marker id="home-route-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                    <path d="M0,0 L9,4.5 L0,9 Z" />
                  </marker>
                </defs>
                <path d="M35 20 H54 V38" />
                <path className="home-route-to-decision" d="M54.5 53 V77.5 H29.5" markerEnd="url(#home-route-arrow)" />
                <path className="home-route-to-decision-mobile" d="M67 53 V82 H42" markerEnd="url(#home-route-arrow)" />
              </svg>
              <div className="home-canvas-node node-start"><small>Start</small><strong>Request received</strong></div>
              <div className="home-canvas-node node-process"><small>Process</small><strong>Review request</strong></div>
              <div className="home-canvas-node node-decision"><span><small>Decision</small><strong>Approved?</strong></span></div>

              <div className="home-command-note">
                <span className="home-signal-dot" />
                <div><small>Voice command</small><strong>Connect review to a new decision</strong></div>
              </div>
              <div className="home-tactile-note">
                <div className="home-tactile-swatch" />
                <div><small>Tactile focus</small><strong>Approved?</strong><span>⠁⠏⠏⠗⠕⠧⠑⠙</span></div>
              </div>
            </div>
          </div>
        </section>

        <HomeHowItWorks />

        <section className="home-view-band" aria-labelledby="home-view-title">
          <header className="home-view-heading">
            <h2 id="home-view-title">One chart, three ways to understand it</h2>
            <p>Changes appear everywhere at once. Select “Approved?” and every view identifies the same decision without changing the chart underneath.</p>
          </header>

          <div className="home-translation">
            <div className="home-shared-node" aria-hidden="true">
              <p>Shared focus</p>
              <div><div className="home-decision-copy"><span>Decision</span><strong>Approved?</strong></div></div>
              <small>One semantic node</small>
            </div>

            <div className="home-output-list">
              <article>
                <div className="home-output-copy">
                  <h3>Visual canvas</h3>
                  <p>A decision shape, its position, and its labelled outgoing routes.</p>
                </div>
                <div className="home-output-visual" aria-hidden="true">
                  <span className="output-line line-left">Yes</span>
                  <div><div className="home-decision-copy"><span>Decision</span><strong>Approved?</strong></div></div>
                  <span className="output-line line-right">No</span>
                </div>
              </article>

              <article>
                <div className="home-output-copy">
                  <h3>Tactile display</h3>
                  <p>The same contour and connections rendered as raised pins with Braille context.</p>
                </div>
                <div className="home-output-tactile" aria-hidden="true">
                  <div />
                  <span>⠁⠏⠏⠗⠕⠧⠑⠙</span>
                </div>
              </article>

              <article>
                <div className="home-output-copy">
                  <h3>Spoken outline</h3>
                  <p>The node label, type, and available branches spoken in concise language.</p>
                </div>
                <blockquote aria-hidden="true">“Approved? Decision. Branches: Yes and No.”</blockquote>
              </article>
            </div>
          </div>
        </section>

        <section className="home-closing-action" aria-labelledby="home-closing-title">
          <div>
            <h2 id="home-closing-title">Start building</h2>
            <p>Open the editor and create your first accessible flowchart. Charts remain in this browser session until workflow saving is introduced.</p>
          </div>
          <Link className="home-primary-action" href="/workspace">Open workspace</Link>
        </section>
      </main>

      <footer className="home-footer">
        <p>Koi charts</p>
        <div><Link href="/workspace">Workspace</Link><Link href="/docs">Documentation</Link></div>
      </footer>
    </>
  );
}
