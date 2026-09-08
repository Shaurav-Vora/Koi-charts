"use client";
import { grammar, modelOnly, rules } from "../commands/grammar";

/**
 * The spoken syntax, on the page, rendered straight from grammar.ts — the same file the contract
 * test runs through the real parser. Nothing here is hand-copied, so the guide cannot describe a
 * phrase the parser has stopped recognising.
 *
 * Collapsed by default, and built from headings and lists rather than a table: an author reading
 * with a screen reader can jump section to section, and each example is one short line to hear.
 */
export default function CommandGuide() {
  return <details className="command-guide">
    <summary>What you can say</summary>
    <div className="guide-body">
      <p className="guide-intro">These phrases run on this machine, with no model call and the same result every time. Anything else is still understood — it is sent to be interpreted, which takes a moment longer.</p>
      <ul className="guide-rules">{rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
      {/* A refreshable display already renders this page in the reader's own table, so the gap
          worth filling is paper. Both files are Braille ASCII, translated by liblouis — the
          translator screen readers use — and the grade is named because contracted and
          uncontracted braille are not interchangeable for someone still learning. */}
      <p className="guide-braille">Braille, ready to emboss — Unified English Braille, 40 cells by 25 lines, Braille ASCII:{" "}
        <a href="/braille/koi-charts-guide-ueb-grade-2.brf" download>Grade 2, contracted (.brf)</a>{" · "}
        <a href="/braille/koi-charts-guide-ueb-grade-1.brf" download>Grade 1, uncontracted (.brf)</a>
      </p>
      {grammar.map(section => <section key={section.title} className="guide-section" aria-labelledby={`guide-${slug(section.title)}`}>
        <h4 id={`guide-${slug(section.title)}`}>{section.title}</h4>
        <ul className="guide-forms">{section.entries.map(entry => <li key={entry.form}>
          <p className="guide-form"><code>{entry.form}</code></p>
          <p className="guide-purpose">{entry.purpose}</p>
          {entry.alternatives && <p className="guide-alternatives">Also: {entry.alternatives.join("; ")}.</p>}
          <ul className="guide-examples">{entry.examples.map(example => <li key={example.say}>Say: “{example.say}”</li>)}</ul>
        </li>)}</ul>
      </section>)}
      {/* Naming the boundary is part of the syntax. An author who knows which phrasings are
          guesswork knows why one reply arrives instantly and another goes away to think. */}
      <section className="guide-section" aria-labelledby="guide-model">
        <h4 id="guide-model">Sent to be interpreted</h4>
        <ul className="guide-forms">{modelOnly.map(entry => <li key={entry.say}>
          <p className="guide-form">Say: “{entry.say}”</p>
          <p className="guide-purpose">{entry.why}</p>
        </li>)}</ul>
      </section>
    </div>
  </details>;
}

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
