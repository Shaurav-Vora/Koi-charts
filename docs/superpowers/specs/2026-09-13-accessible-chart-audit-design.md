# Accessible chart audit design

**Date:** 2026-09-13  
**Status:** Approved for planning  
**Scope:** Local chart checks, issue navigation, compact review UI, and accessible feedback

## Purpose

Koi Charts already provides a one-shot validation command, but its warnings are returned as a single text response. The chart audit will turn those checks into a structured, navigable review that helps a user find and resolve flowchart problems through the visual canvas, tactile display, keyboard, and voice.

The audit must stay compact. It belongs inside the canvas review controls and must not consume a new full-width workspace row.

## User experience

The existing Validate chart action becomes Check chart. It sits beside Test chart in a compact review group within the canvas controls.

Selecting Check chart opens a focused audit panel over the canvas. The panel is no wider than approximately 400 pixels and uses the existing Koi Charts visual language:

- white canvas and pale mist workspace
- navy text
- koi orange for the active audit path
- blue for focused chart elements and keyboard navigation
- visible text labels for severity, so meaning never depends on color alone

The collapsed state shows the action and a small result count. The expanded state shows:

- a plain-language heading such as 3 issues found
- progress such as Issue 1 of 3
- severity: Required or Review
- a short title
- one concise explanation
- one suggested correction
- Previous, Repeat, Next, and Close controls

Opening the audit closes guided playback, and opening guided playback closes the audit. This prevents stacked overlays and keeps the canvas usable.

When an issue refers to a node or connection, moving to that issue focuses the related chart element. Node issues update the visual selection, tactile display, chart outline, and spoken context through the existing shared focus model. Connection issues focus the most useful endpoint and identify the connection in the panel.

## Audit rules

The first version checks for:

1. No Start node.
2. More than one Start node.
3. No End node.
4. Nodes that cannot be reached from a Start node.
5. Non-End nodes with no outgoing connection.
6. Decision nodes with fewer than two outgoing branches.
7. Unlabelled outgoing branches from a Decision node.
8. Reachable nodes whose outgoing paths cannot reach an End node.
9. Duplicate node labels after trimming whitespace and comparing without case.

The audit reports problems without changing the chart. Automatic fixes are outside this milestone.

## Issue model

The audit engine returns structured issues rather than formatted strings.

    AuditSeverity = required | review
    AuditTarget = node | edge | chart

Each issue contains:

- a stable identifier
- a rule code
- severity
- short title
- concise message
- suggested correction
- target node or edge
- a node identifier to focus when relevant

Stable identifiers let the panel keep the same current issue when the chart changes and that issue still exists.

## Rule priority and de-duplication

The engine avoids repetitive feedback:

- A dead-end node does not also receive a cannot-reach-End issue.
- An unreachable node does not also receive a cannot-reach-End issue.
- If the chart has no End node, the engine reports that chart-level issue and suppresses per-node cannot-reach-End issues.
- Duplicate labels produce one issue for each duplicate label group.
- A Decision node may report both too few branches and an unlabelled branch because the fixes are different.

Required issues describe structural failures that prevent a clear start-to-finish flow. Review issues identify ambiguity, including duplicate labels and missing branch labels.

## Voice and keyboard behavior

The audit is entirely local and does not invoke Gemini.

Supported local phrases:

- check chart
- validate the chart
- next issue
- previous issue
- repeat issue
- close check

Spoken replies remain brief and never include internal node identifiers. Examples:

- 3 issues found. First: no End node.
- Next: Decision Approved needs two branches.
- Check complete. No issues found.

All panel controls are reachable by keyboard and have explicit accessible names. Existing chart editing shortcuts remain active when focus is outside text inputs.

## State and update behavior

Audit state is transient and is not stored with a chart:

- closed or open
- current issue list
- current issue identifier
- graph version at the last calculation

While the panel is open, graph edits recalculate the audit. If the current issue still exists, it stays selected. If it was resolved, the panel moves to the next remaining issue. If all issues are resolved, it shows the clear result without closing automatically.

## Architecture

New audit code will be separated from rendering:

- src/audit/types.ts defines the structured issue model.
- src/audit/engine.ts contains the deterministic, immutable graph checks.
- src/audit/state.ts manages issue navigation and retention.
- src/audit/AuditPanel.tsx renders the compact overlay.

Existing integration points will be extended:

- src/graph/queries.ts keeps validateGraph as a compatibility wrapper over the structured engine.
- src/editor/coordinator.ts owns audit state and actions.
- src/editor/Editor.tsx connects audit state to speech and focus.
- src/visual/VisualCanvas.tsx hosts the compact Check chart control and overlay.
- the local command grammar handles audit navigation phrases.
- workspace styles define the compact responsive presentation.

## Error handling and accessibility

The engine must handle an empty chart and dangling connection references without throwing. Broken references are ignored by traversal and may be reported as a chart integrity issue if encountered.

The audit panel uses a labelled region, announces result changes politely, and does not steal focus after every recalculation. Severity appears in text. Focus rings meet the existing interface standard. Motion is limited to the current short overlay transition and respects reduced-motion preferences.

## Verification

Automated checks will cover every rule, de-duplication, stable identifiers, issue navigation, current-issue retention after edits, empty charts, and malformed connection references.

Manual checks will confirm:

1. Check chart opens without adding a workspace row.
2. The panel fits within the canvas at common desktop widths.
3. Next and Previous focus the correct chart element.
4. The tactile display and outline follow node issues.
5. Guided playback and chart audit never overlap.
6. Voice commands operate locally with brief replies.
7. Resolving an issue updates the list without losing context.
8. The clear state is understandable by sight, screen reader, and speech.

## Implementation checkpoints

1. Structured audit engine and compatibility wrapper.
2. Coordinator state, issue navigation, and local voice commands.
3. Compact canvas controls and polished audit overlay.
4. Documentation updates and final accessibility verification.

Each checkpoint will be tested and committed separately before the next begins.

