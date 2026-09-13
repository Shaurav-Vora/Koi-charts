import Link from "next/link";
import AppHeader from "./AppHeader";

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

        <section className="home-view-band" aria-labelledby="home-view-title">
          <div className="home-view-heading">
            <p>One semantic graph</p>
            <h2 id="home-view-title">One chart, three ways to understand it</h2>
          </div>
          <div className="home-view-list">
            <article>
              <span className="home-view-number">01</span>
              <h3>Visual canvas</h3>
              <p>Arrange shapes freely, connect ports, and label every route.</p>
            </article>
            <article>
              <span className="home-view-number">02</span>
              <h3>Tactile display</h3>
              <p>Read contours, direction, focus, and Braille information on a digital pin matrix.</p>
            </article>
            <article>
              <span className="home-view-number">03</span>
              <h3>Spoken outline</h3>
              <p>Create and inspect the same structure with concise voice feedback.</p>
            </article>
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
