import { grammar, modelOnly, rules } from "../commands/grammar";

/**
 * The spoken syntax, on the page, rendered straight from grammar.ts — the same file the contract
 * test runs through the real parser. Nothing here is hand-copied, so the guide cannot describe a
 * phrase the parser has stopped recognising.
 *
 * Rendered on the documentation page with headings and examples for keyboard and screen-reader navigation.
 */
export default function CommandGuide() {
  return <div className="command-reference">
    <div className="guide-body">
      <p className="guide-intro">With local commands enabled, the supported phrases below are processed without a Gemini request. Other phrasing is sent to Gemini for interpretation and may require clarification.</p>
      <ul className="guide-rules">{rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
      {/* A refreshable display already renders this page in the reader's own table, so the gap
          worth filling is paper. Both files are Braille ASCII, translated by liblouis — the
          translator screen readers use — and the grade is named because contracted and
          uncontracted braille are not interchangeable for someone still learning. */}
      <p className="guide-braille">Download the command reference in Unified English Braille (Braille ASCII, 40 cells per line and 25 lines per page):{" "}
        <a href="/braille/koi-charts-guide-ueb-grade-2.brf" download>Grade 2, contracted (.brf)</a>{" · "}
        <a href="/braille/koi-charts-guide-ueb-grade-1.brf" download>Grade 1, uncontracted (.brf)</a>
      </p>
      {grammar.map(section => <section key={section.title} className="guide-section" aria-labelledby={`guide-${slug(section.title)}`}>
        <h2 id={`guide-${slug(section.title)}`}>{section.title}</h2>
        <ul className="guide-forms">{section.entries.map(entry => <li key={entry.form}>
          <p className="guide-form"><code>{entry.form}</code></p>
          <p className="guide-purpose">{entry.purpose}</p>
          {entry.alternatives && <p className="guide-alternatives">Accepted variants: {entry.alternatives.join("; ")}.</p>}
          <ul className="guide-examples" aria-label="Examples">{entry.examples.map(example => <li key={example.say}><code>{example.say}</code></li>)}</ul>
        </li>)}</ul>
      </section>)}
      {/* Naming the boundary is part of the syntax. An author who knows which phrasings are
          guesswork knows why one reply arrives instantly and another goes away to think. */}
      <section className="guide-section" aria-labelledby="guide-model">
        <h2 id="guide-model">Requests handled by Gemini</h2>
        <ul className="guide-forms">{modelOnly.map(entry => <li key={entry.say}>
          <p className="guide-form">Say: “{entry.say}”</p>
          <p className="guide-purpose">{entry.why}</p>
        </li>)}</ul>
      </section>
    </div>
  </div>;
}

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
