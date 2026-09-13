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
            <p className="home-kicker">Accessible flowchart authoring</p>
            <h1 id="home-title">Flowcharts everyone can follow.</h1>
            <p className="home-lead">
              Build, understand, and test a single flowchart through sight, touch, keyboard, or voice.
            </p>
            <div className="home-actions">
              <Link className="home-primary-action" href="/workspace">Open workspace</Link>
              <Link className="home-secondary-action" href="/docs">Read documentation</Link>
            </div>
            <ul className="home-assurances" aria-label="Workspace capabilities">
              <li>Voice-first editing</li>
              <li>120 × 80 tactile simulation</li>
              <li>Structured chart testing</li>
            </ul>
          </div>

          <div className="home-hero-visual" aria-hidden="true">
            <div className="home-flow-line line-one" />
            <div className="home-flow-line line-two" />
            <div className="home-flow-node home-flow-start"><small>Start</small><strong>Request received</strong></div>
            <div className="home-flow-node home-flow-process"><small>Process</small><strong>Review request</strong></div>
            <div className="home-flow-node home-flow-decision"><span><small>Decision</small><strong>Approved?</strong></span></div>
            <div className="home-tactile-window">
              <span className="home-tactile-label">Tactile view</span>
              <div className="home-tactile-pins" />
            </div>
            <div className="home-spoken-cue"><span>Spoken</span><p>Decision: Approved?</p></div>
          </div>
        </section>

        <HomeHowItWorks />

        <section className="home-view-band" aria-labelledby="home-view-title">
          <div className="home-view-heading">
            <p>One semantic graph</p>
            <div>
              <h2 id="home-view-title">One chart, three ways to understand it</h2>
              <span>Changes appear everywhere at once, so each person can use the representation that works for them without losing the shared structure.</span>
            </div>
          </div>

          <div className="home-view-grid">
            <article className="home-view-card">
              <div className="home-view-card-copy">
                <span className="home-view-number">01</span>
                <h3>Visual canvas</h3>
                <p>Arrange shapes freely, connect from any side, and follow highlighted routes across an open canvas.</p>
              </div>
              <div className="home-card-preview home-canvas-preview" aria-hidden="true">
                <div className="home-mini-node is-start">Begin</div>
                <span className="home-mini-route route-one" />
                <div className="home-mini-node is-process">Review</div>
                <span className="home-mini-route route-two" />
                <div className="home-mini-node is-decision"><span>Approved?</span></div>
              </div>
            </article>

            <article className="home-view-card">
              <div className="home-view-card-copy">
                <span className="home-view-number">02</span>
                <h3>Tactile display</h3>
                <p>Read shape contours, connection direction, active focus, and Braille context on the digital pin matrix.</p>
              </div>
              <div className="home-card-preview home-tactile-preview" aria-hidden="true">
                <div className="home-pin-field">
                  <span className="pin-shape pin-start" />
                  <span className="pin-shape pin-process" />
                  <span className="pin-shape pin-decision" />
                </div>
                <p className="home-braille-strip">⠠⠁⠏⠏⠗⠕⠧⠑⠙ ⠦⠽⠑⠎⠴ ⠦⠝⠕⠴</p>
              </div>
            </article>

            <article className="home-view-card">
              <div className="home-view-card-copy">
                <span className="home-view-number">03</span>
                <h3>Spoken outline</h3>
                <p>Create, rename, connect, inspect, and test the same structure with concise feedback that speaks labels clearly.</p>
              </div>
              <div className="home-card-preview home-spoken-preview" aria-hidden="true">
                <p><span>Focus</span><strong>Approved?</strong></p>
                <p><span>Branches</span><strong>Yes and No</strong></p>
                <p><span>Command</span><strong>Follow Yes</strong></p>
              </div>
            </article>
          </div>

          <div className="home-view-closing">
            <span aria-hidden="true"><i /><i /><i /></span>
            <p><strong>One edit updates all three.</strong> Focus a shape in any view and every representation identifies the same point in the flow.</p>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p>Koi charts</p>
        <div><Link href="/workspace">Workspace</Link><Link href="/docs">Documentation</Link></div>
      </footer>
    </>
  );
}
