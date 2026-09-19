# Editable Koi project files design

**Date:** 2026-09-19  
**Status:** Approved for planning  
**Scope:** Versioned `.koi` export and import, undoable project replacement, accessible file controls, local project voice commands, and spoken deletion confirmation

## Purpose

Koi Charts currently exports images and PDF files that cannot be reopened for editing. Editable project files will let an author download the complete chart and later restore it without an account or database.

The project format must remain local, portable, inspectable, and safe to load. It must not contain API keys, browser preferences, speech settings, temporary selections, playback state, audit state, or undo history.

## Project format

A Koi project is UTF-8 JSON saved with the `.koi` extension and MIME type `application/vnd.koi-chart+json`.

The first format version uses this envelope:

```json
{
  "format": "koi-chart",
  "formatVersion": 1,
  "savedAt": "2026-09-19T12:00:00.000Z",
  "graph": {
    "schemaVersion": 1,
    "nodes": [],
    "edges": []
  }
}
```

The fields have these meanings:

- `format` identifies the file as a Koi Charts project.
- `formatVersion` versions the outer project envelope independently from the graph schema.
- `savedAt` records when the browser created the file. It is informational and must be a valid ISO 8601 timestamp.
- `graph` is the editable graph, including stable node and connection identifiers, labels, semantic types, manual positions, and placement hints.

The serializer accepts the current graph and an injectable clock, constructs a new envelope, and returns formatted JSON with a trailing newline. It must not mutate or retain a writable reference to editor state.

The filename uses the existing date-based export convention and ends in `.koi`, for example `koi-chart-2026-09-19-143025.koi`.

## Validation and compatibility

Import validates the entire file before changing editor state.

The parser applies these checks in order:

1. Reject a file larger than 2 MiB before reading its text.
2. Reject invalid UTF-8 or malformed JSON.
3. Require a strict object with exactly `format`, `formatVersion`, `savedAt`, and `graph`.
4. Require `format` to equal `koi-chart`.
5. Reject unsupported project format versions with a message that names the unsupported version.
6. Validate `savedAt` as an ISO timestamp.
7. Validate the graph schema and referential integrity through the existing graph boundary.
8. Clone the accepted graph before returning it.

The initial release reads only `formatVersion: 1`. The versioned boundary leaves room for explicit migrations later; it must never guess how to interpret an unknown version.

Import errors use short user-facing categories and do not expose stack traces or internal identifiers:

- This file is too large to open.
- This is not a Koi Charts project.
- This Koi project version is not supported.
- This Koi project contains an invalid chart.
- This file could not be read.

Any failure leaves the graph, focus, history, playback, audit, selection, and tactile state unchanged.

## Import transaction and history

A successful import replaces the current graph as one undoable editor transaction.

Before replacement, the reducer stores the complete current graph, focus, and recent-node context in history. It then:

- installs a cloned imported graph
- focuses the first Start node in stable graph order, or the first node when there is no Start
- leaves focus empty for an empty imported chart
- sets recent-node context to the new focus
- clears pending deletion or clarification state
- clears redo history
- increments the committed graph version once

Undo restores the complete pre-import chart and its former focus. Redo restores the imported chart again. No individual imported node or connection becomes a separate history entry.

A successful import closes chart audit and guided playback because their transient findings and routes belong to the replaced graph. Canvas node, arrow, and multi-selection overlays also close. Existing display identifiers remain available for undo; imported identifiers receive display identifiers through the current registry when needed.

The success message is concise and contains no opaque identifiers:

> Loaded 8 shapes and 7 connections from checkout-flow.koi. Undo restores your previous chart.

An empty project reports that it loaded an empty chart.

## Workspace controls

Project controls share the existing export area in the Visual flowchart heading so the feature consumes no new workspace row.

The group contains:

- **Save project** downloads the current graph as a `.koi` file
- **Open project** activates a visually hidden native file input accepting `.koi` and the Koi MIME type
- the existing SVG, PNG, JPEG, and PDF actions

Save project is disabled only while another file action is running. An empty graph can still be saved because an empty editable project is valid. Image export retains its current empty-chart restriction.

Open project remains available for replacing any current graph. Choosing the same file twice must work by clearing the input value after each attempt. Cancelling the native picker changes nothing and produces no error.

File actions use the existing command-feedback and speech path for one authoritative announcement. They must not create competing live-region messages. Buttons retain visible labels, keyboard focus styles, and minimum target sizes.

## Voice behavior

Core project phrases run locally and never call Gemini.

Supported save phrases:

- save project
- export project
- download project

These immediately perform the same action as the Save project button and announce the saved filename.

Supported open phrases:

- open project
- import project
- load project

A browser file picker requires transient user activation, which a speech-recognition callback does not provide reliably. Therefore the voice command focuses the Open project control and announces:

> Open project ready. Press Enter to choose a Koi file.

Pressing Enter supplies the required user activation and opens the native file picker. Voice must not claim that a project was opened before a valid file is selected and loaded.

Project commands are represented as explicit local UI actions rather than graph edits. The coordinator exposes a typed project-action request that the editor handles through the same Save and Open controls used by pointer and keyboard input. Model-produced project actions are rejected; exact local phrases are sufficient and avoid unintended downloads or picker prompts.

## Spoken deletion confirmation

The local grammar adds these confirmation phrases:

- confirm delete
- confirm deletion
- yes, delete it

When a pending deletion exists, each phrase executes the existing confirmation command and preserves its prepared deletion snapshot. It never rebuilds the target from current focus.

When there is no pending deletion, the reply is:

> There is no deletion to confirm.

These phrases run locally even when Fast local commands is disabled, matching other safety and control commands. Existing `confirm` and `cancel` behavior remains available.

## Architecture

Project-file logic remains independent from rendering:

- `src/projects/types.ts` defines the strict versioned envelope.
- `src/projects/koi-file.ts` serializes, parses, validates, and formats filenames.
- `src/projects/ProjectControls.tsx` owns the native file input and exposes Save and Open actions.
- `src/editor/reducer.ts` receives a typed import action and performs the one-step history transaction.
- `src/editor/coordinator.ts` closes graph-bound transient modes after a successful import and routes typed project-action requests.
- `src/editor/Editor.tsx` connects controls, project actions, command feedback, focus, and speech.
- local grammar and command contracts add project UI actions and deletion-confirmation phrases.
- existing export utilities continue to own browser downloads.

The file boundary accepts `unknown`; no parsed value becomes a `FlowGraph` until the envelope and graph validators succeed.

## Accessibility and safety

The feature is fully operable with keyboard and screen reader. Save and Open use explicit names rather than icon-only controls. Import does not move DOM focus to the canvas; semantic chart focus updates through the existing shared model and is announced through command feedback.

Files are processed locally in the browser and are never uploaded. Documentation states that a `.koi` file contains chart labels and structure, so authors should still treat it as user-created content when sharing it.

Downloads contain no API keys, environment variables, local-storage preferences, transcripts, speech data, undo history, or provider responses.

## Verification

Pure format tests cover:

- deterministic serialization with an injected timestamp
- formatted UTF-8 JSON and the `.koi` filename
- round-trip preservation of node types, labels, positions, placement hints, connections, and connection labels
- strict envelope fields
- malformed JSON
- wrong format marker
- unsupported format version
- invalid timestamp
- invalid graph references and duplicate identifiers
- file-size rejection
- input and output mutation safety

Reducer and coordinator tests cover:

- replacing a populated chart in one version change
- focus selection after import
- empty-project import
- undo restoration and redo re-import
- pending-state clearing
- audit and playback closure
- failed import preserving all state

Component and voice tests cover:

- Save project and Open project placement in the existing heading
- repeated selection of the same file
- picker cancellation
- accessible busy, success, and error feedback
- voice save invoking the same export path
- voice import focusing Open project and requesting Enter
- exact local routing without Gemini
- confirm-delete synonyms with and without a pending deletion
- no duplicate live announcements

Manual checks confirm download, browser file selection, screen-reader announcements, keyboard-only open and undo, voice save, voice-assisted open, invalid-file recovery, and image export regression behavior.

## Implementation checkpoints

1. Project envelope, parser, serializer, filename rules, and pure tests.
2. Undoable reducer import transaction and coordinator cleanup.
3. Compact Save project and Open project controls with accessible feedback.
4. Local project voice actions and spoken deletion confirmation.
5. Documentation, complete regression verification, and final owner acceptance.

Each checkpoint is tested, documented where applicable, and committed separately before the next begins.
