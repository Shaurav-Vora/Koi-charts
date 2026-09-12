# Guided flowchart playback design

**Date:** 2026-09-12  
**Status:** Proposed for owner review

## Problem

Koi charts can create, inspect, validate, and walk a graph, but it cannot run a deliberate test session from Start to End. The existing walk cursor moves through connections one command at a time without recording the chosen route, distinguishing a completed run from ordinary navigation, or reporting structural problems in the context where they affect the route.

Guided playback will let a blind, low-vision, or sighted author test the experience of following the chart. It will pause at every node, keep the visual canvas, tactile simulator, text outline, and spoken position synchronized, require an explicit choice at every branch, and summarize the route at the end.

## Goals

- Start a test at an explicitly chosen Start node.
- Pause at every node until the author chooses the next action.
- Present outgoing connections by arrow label and destination.
- Record the exact nodes and arrows traversed.
- Support Back, Next, branch choice, Repeat, Restart, and Stop.
- Detect and explain missing starts, ambiguous starts, dead ends, loops, unreachable nodes, and unclear branch labels.
- Keep visual focus, tactile focus, text outline, and spoken feedback on the same node.
- Accept the core test controls by button, keyboard, and deterministic local voice command.
- Keep playback separate from graph editing and undo history.

## Non-goals

- Executing application code or evaluating business data inside process nodes.
- Automatically deciding Yes/No or other decision outcomes.
- Generating or repairing chart content through Gemini.
- Persisting an unfinished playback session across a reload.
- Replacing the existing free-form chart navigation commands.
- Supporting simultaneous editors or shared playback sessions.

## Approaches considered

### 1. Add route recording directly to the existing walk command

This would reuse the most code, but the graph engine would need to remember a temporary test route alongside durable chart state. Undo, redo, ordinary focus changes, and playback would become coupled, and a navigation command could accidentally alter the test session.

### 2. Add a dedicated playback state machine beside the editor state

This is the selected approach. A pure playback module reads an immutable graph snapshot and owns only transient test state. The editor coordinator routes playback actions to it, then applies an ordinary focus update so all existing representations follow the current playback node. Graph edits remain in the existing command engine and history.

### 3. Infer playback entirely from the currently focused node

This needs almost no state, but cannot implement Back along the route actually taken, show a completed route, distinguish a revisited node from a loop, or invalidate a session after the graph changes.

## State model

`src/playback/types.ts` will define a discriminated state:

- `idle`: no test is running.
- `choosing_start`: more than one Start exists and the author must choose one.
- `paused`: the test is positioned on a node and waiting for an action.
- `choosing_branch`: more than one outgoing arrow exists and the author must choose one.
- `complete`: an End node has been reached and the completed route is available.
- `blocked`: the current route cannot continue because of a structural problem.

A running state stores:

- The graph version captured when the test began.
- The current node ID.
- An ordered route of node IDs and the edge ID used to enter each node.
- The current branch choices.
- Node visit counts for loop detection.
- Non-blocking preflight findings such as unreachable nodes.

Playback state contains IDs but never user-facing UUID text. Every announcement resolves IDs to node and arrow labels before presentation.

## Playback rules

### Starting

The **Test chart** action performs a structural preflight:

- With no Start node, playback refuses to begin and asks the author to add one.
- With one Start node, playback begins there.
- With multiple Start nodes, playback lists them and waits for an explicit choice.
- Unreachable nodes and missing End nodes are announced as warnings, but do not prevent starting.

Starting playback focuses the chosen Start node and announces its label, type, and available onward route. It does not edit the graph or create undo history.

### Pausing and moving

Playback pauses at every node. **Next** follows the only outgoing arrow when exactly one exists. With more than one outgoing arrow, Next opens branch selection instead of choosing. **Back** removes the last route step and returns to the previous node actually visited; it does not follow an arbitrary incoming arrow. **Repeat** announces the current node and choices without changing state.

Branch choices are displayed and spoken as the arrow label followed by the destination label. An unlabelled arrow remains selectable by destination, but playback reports that the branch needs a label. Duplicate labels are disambiguated with their destinations. The engine never guesses a branch.

### Completion and problems

Arriving at an End node announces the node, marks the session complete, and retains the route for review. A node with no outgoing arrow blocks the route unless it is an End. Returning to a previously visited node reports a loop before allowing further movement. The loop remains traversable so intentional retry flows can be tested, while visit counts prevent the interface from treating repeated traversal as new structure.

If the graph version changes during playback, the session stops with: “The chart changed. Restart the test to use the updated structure.” This prevents stale node or arrow IDs from driving the canvas or speech.

## Architecture

### Pure playback engine

`src/playback/engine.ts` will expose pure transition functions over `FlowGraph` and `PlaybackState`. It will calculate starts, outgoing choices, route history, completion, dead ends, revisits, and graph-version invalidation. It will not import React, browser speech, the editor reducer, or Gemini.

Existing traversal wording and graph queries in `src/commands/walk.ts` will be extracted only where sharing removes real duplication. Ordinary walk behavior remains unchanged.

### Coordinator integration

The editor coordinator will own playback alongside editor and presentation state. Playback actions will be handled before graph commands. Each successful playback transition will dispatch or publish the corresponding focus without adding graph history. Existing editing commands remain available; a committed graph edit invalidates the active playback session.

### Voice commands

The deterministic local parser will recognize:

- “start test” and “test chart”
- “next”
- “back”
- “take Yes” or “choose Review”
- “repeat”
- “restart test”
- “stop test”

While playback is active, these phrases target playback before ordinary walk navigation. Outside playback, existing Next and Back behavior remains unchanged. Core playback controls never require Gemini or consume model quota. Unknown phrasing can still reach the interpreter, but the model cannot choose a branch that the transcript did not name.

### User interface

A **Test chart** control opens a compact playback panel associated with the visual canvas. The panel contains the current node, progress through the recorded route, warnings, labelled branch buttons, and Back, Next, Repeat, Restart, and Stop controls. Button state follows the playback engine rather than duplicating its rules in React.

The current playback node uses the existing focused-node treatment. Traversed arrows receive a distinct route style, and the current arrow receives a stronger style. These highlights are supplemental; text, speech, and tactile focus convey the same information without color.

The tactile simulator continues to render the focused neighborhood. Its information strip identifies that a test is active and includes the arrow used to enter the current node. The chart outline marks the current playback node and lists the recorded route in order.

### Accessibility

- The panel is a named region with a heading and a polite status message.
- Controls use native buttons with stable accessible names.
- Branch buttons include both the arrow label and destination.
- Focus remains on the control the author activated; node focus is semantic application state rather than DOM focus.
- Spoken feedback is brief by default and can be interrupted through the existing Stop speaking control or Ctrl+Alt+S.
- Keyboard operation uses ordinary Tab and Enter/Space first. Any additional direct shortcuts will be documented visibly and exposed with `aria-keyshortcuts`.
- Status does not rely on color, animation, or the visual canvas.

## Error handling

Playback transition errors return reader-safe messages and leave the current route intact. Missing node or edge IDs caused by a graph edit produce the graph-changed message rather than exposing internal IDs. Starting a second session replaces the completed or stopped session only after the new Start selection succeeds.

Speech, microphone, or Gemini failures do not stop button and keyboard playback. A speech failure leaves the same message in the live region. Stopping voice capture does not stop playback.

## Testing

The playback engine will be developed test-first with cases for:

- Empty graph, no Start, one Start, and multiple Starts.
- A linear route reaching End.
- Pausing at every node.
- Back following recorded history.
- Labelled, unlabelled, and duplicate branch choices.
- Refusing to guess between branches.
- Dead ends and missing End nodes.
- Loop detection and intentional continuation.
- Unreachable-node warnings.
- Graph-version invalidation.

Editor tests will verify that buttons, keyboard actions, and local voice phrases drive the same transitions; that visual, tactile, and outline focus agree; that route highlighting is supplemental; and that graph history is unchanged. Existing walk, command, speech, tactile, accessibility, lint, typecheck, and production-build checks remain part of each milestone.

## Delivery milestones

1. **Playback engine:** pure state, transitions, route recording, and structural findings.
2. **Playback controls:** panel, focus synchronization, and keyboard operation.
3. **Voice integration:** deterministic local phrases and brief spoken feedback.
4. **Multimodal route feedback:** visual route highlighting, tactile entry-edge context, outline route, and final route summary.
5. **Documentation and accessibility verification:** command reference, owner checks, regression suite, and production build.

Each milestone will be committed separately and presented with a focused owner check before work begins on the next milestone.
