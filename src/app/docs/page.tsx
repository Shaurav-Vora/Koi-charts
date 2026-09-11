import type { Metadata } from "next";
import AppHeader from "../AppHeader";
import CommandGuide from "../../editor/CommandGuide";
import { grammar } from "../../commands/grammar";

export const metadata: Metadata = { title: "Documentation | Koi charts", description: "Voice commands, chart editing, and export reference for Koi charts." };
export default function Documentation() {
 return <>
  <a className="skip-link" href="#documentation">Skip to documentation</a>
  <AppHeader page="documentation" />
  <main className="docs-layout" id="documentation">
   <nav className="docs-nav" aria-label="Documentation sections"><p>On this page</p>
    <a href="#overview">Getting started</a>
    {grammar.map(section => <a key={section.title} href={`#guide-${section.title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`}>{section.title}</a>)}
    <a href="#guide-model">Gemini requests</a><a href="#exports">Exporting charts</a>
   </nav>
   <article className="docs-content">
    <section id="overview"><h1>Koi charts documentation</h1><p className="docs-lead">Reference for voice commands, chart editing, and file export.</p>
     <p>Select <strong>Start voice</strong> and allow microphone access. Wait for <strong>Listening</strong>, then speak a command. The command result appears below the voice controls.</p>
     <p>Use node labels to identify shapes. Words in angle brackets, such as <code>&lt;label&gt;</code>, are placeholders; replace them with a label from your chart. Square brackets indicate optional wording.</p>
     <p>Select <strong>Mute replies</strong> to turn off spoken feedback. The chart outline and command feedback remain available as text.</p>
     <p>To delete a selected shape, press <kbd>Delete</kbd>. Connected shapes require confirmation. The shortcut is disabled while editing text. Use Undo to restore a deleted shape.</p>
    </section>
    <CommandGuide />
    <section id="exports"><h2>Exporting charts</h2>
     <p>Use the SVG, PNG, JPEG, or PDF controls above the canvas. Exports include the complete chart with padding, regardless of the current zoom or pan position.</p>
     <dl><dt>SVG</dt><dd>Vector image for resizing and further editing.</dd><dt>PNG</dt><dd>Lossless raster image for documents and presentations.</dd><dt>JPEG</dt><dd>Compressed raster image with a white background.</dd><dt>PDF</dt><dd>Single-page vector document sized to the chart. The current PDF exporter substitutes unsupported non-Latin characters.</dd></dl>
     <p>Exported images are not editable project backups. Keep the workspace open while you work.</p>
    </section>
   </article>
  </main>
 </>;
}
