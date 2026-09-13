export default function HomeHowItWorks() {
  return (
    <section className="home-process" aria-labelledby="home-process-title">
      <header className="home-process-heading">
        <h2 id="home-process-title">How Koi Charts works</h2>
        <p>Choose the input that suits you. Koi Charts keeps each representation aligned from the first shape to the final route.</p>
      </header>

      <ol className="home-process-steps">
        <li>
          <span className="home-process-marker" aria-hidden="true">1</span>
          <div>
            <h3>Build the structure</h3>
            <p>Add shapes by voice, keyboard, click, or drag. Connect them from any side and label decision branches clearly.</p>
          </div>
        </li>
        <li>
          <span className="home-process-marker" aria-hidden="true">2</span>
          <div>
            <h3>Follow every view</h3>
            <p>Focus once. The canvas, tactile matrix, Braille strip, and chart outline move to the same shape.</p>
          </div>
        </li>
        <li>
          <span className="home-process-marker" aria-hidden="true">3</span>
          <div>
            <h3>Test the route</h3>
            <p>Walk from Start to End, choose each branch, and find dead ends, loops, or missing labels before sharing.</p>
          </div>
        </li>
      </ol>
    </section>
  );
}