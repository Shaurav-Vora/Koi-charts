export default function HomeHowItWorks() {
  return (
    <section className="home-process" aria-labelledby="home-process-title">
      <div className="home-process-heading">
        <p>From idea to verified route</p>
        <h2 id="home-process-title">How Koi Charts works</h2>
        <span>Use the input method that suits you. The underlying chart stays the same.</span>
      </div>

      <ol className="home-process-steps">
        <li>
          <span className="home-process-marker" aria-hidden="true" />
          <div>
            <small>Step 1</small>
            <h3>Build the structure</h3>
            <p>Add shapes by voice, keyboard, click, or drag. Connect them freely and label decision branches with plain language.</p>
          </div>
        </li>
        <li>
          <span className="home-process-marker" aria-hidden="true" />
          <div>
            <small>Step 2</small>
            <h3>Follow every view</h3>
            <p>Focus a shape once. The canvas, tactile matrix, Braille strip, and text outline move to the same place.</p>
          </div>
        </li>
        <li>
          <span className="home-process-marker" aria-hidden="true" />
          <div>
            <small>Step 3</small>
            <h3>Test the route</h3>
            <p>Walk from Start to End one node at a time. Choose each branch yourself and catch dead ends, loops, or missing labels.</p>
          </div>
        </li>
      </ol>
    </section>
  );
}
