# Koi charts

A voice-first flowchart workspace designed for independent blind authorship. The planned editor uses one semantic graph for a visual flowchart, a digital tactile simulator, and spoken descriptions.

## Current milestone

**Task 5: visual and keyboard editing.** The canvas now uses a shape palette: click or drag a shape to insert it, drag between connector dots, and select a node to rename or delete it. The enlarged canvas is the primary workspace. Keyboard editing and advanced command forms are collapsible below it. Both workflows use the same graph and undo history.

Tactile pin rendering, Braille conversion, and voice input are pending. The workspace is held in memory and clears on refresh. No microphone permission or API key is needed.

## Run locally

Use Node **22.22.2+, 24.15.0+, or 26+** in the corresponding supported major releases, with npm. This is the installed jsdom test dependency's engine requirement; Next.js itself has a lower minimum. Development was verified with the bundled Node 24 runtime.

```powershell
cd 'C:\dev\Koi charts'
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The server listens only on the local machine. If the port is occupied, use the address printed by Next.js. Press Ctrl+C in the server terminal to stop it.

**This Codex workspace:** npm was absent from the session path. A local copy of npm 12.0.2 was downloaded from the official npm registry into ignored `.tools/npm/package/`, without changing the system installation. Here, substitute `node .tools/npm/package/bin/npm-cli.js` for `npm`:

```powershell
node .tools/npm/package/bin/npm-cli.js run dev
node .tools/npm/package/bin/npm-cli.js test
```

The ignored local npm copy is a convenience for this workspace; fresh checkouts should use a normal Node/npm installation. An existing user-level `msvs_version` npm setting produces a warning in this environment; no user configuration was changed.

## Check the application shell

1. Open the page. Expect the Koi charts title, Idle status, and two empty panels named Visual flowchart and Tactile display simulator.
2. Confirm the visual panel says “Your chart starts here” and the tactile panel says “No pins raised”. The information strip says “No node selected”.
3. Reload and press Tab. “Skip to workspace” should become visible with an outline. Press Enter to move focus to the workspace.
4. Tab to “What can I check in this preview?” and press Enter to open and close its explanation.
5. Narrow the browser below 900 CSS pixels. The panels should stack without horizontal scrolling, including at 375 pixels.
6. Confirm voice is labeled as not connected, the microphone is off, and there is no microphone permission prompt.

Automated checks:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

`npm start` serves a completed production build. These checks cover the shell, graph, commands, layout, and editor; a full screen-reader and axe audit is planned for Task 10.

## Check Task 2: graph and command contracts

Run from the project directory:

```powershell
npm test -- src/graph/invariants.test.ts src/commands/schema.test.ts
```

In this Codex workspace, where npm is local:

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/graph/invariants.test.ts src/commands/schema.test.ts
```

Expect **131 passing tests across two files**. Add `--reporter=verbose` to see each named case. The browser is unchanged at this milestone.

- `src/graph/types.ts` defines the serializable version-one graph, four node types, and six placement relations.
- `src/graph/invariants.ts` exports `createEmptyGraph()` and `assertGraph(unknown)`. It rejects malformed graph data, blank labels/IDs, duplicate IDs within each element kind, missing node references, and self-edges/self-placement. Repeated labels, disconnected charts, and multi-node cycles are accepted. Validation never mutates the input. Missing start/end nodes and incomplete decisions are authoring warnings for Task 4, not integrity errors.
- `src/commands/schema.ts` exports strict Zod validators and their inferred TypeScript command/reference types. Missing required fields and extra fields at every object depth are rejected. Nullable wire fields must be explicitly `null` when absent, such as `{ kind: "inspect", node: null }`.
- `src/commands/json-schema.ts` exports the equivalent `{ command: GraphCommand }` envelope for future provider requests. Ajv validates it independently in tests; both validators are checked against valid examples, malformed examples, and mutations at each nested object boundary.

Command text uses 1–200 Unicode code points. Wire parsing does not trim input; whitespace-only labels must be rejected by semantic execution (Task 3), and cannot pass committed graph validation. Compound commands accept 1–10 edits with no nesting, history, or exploration commands. Task 2 validates their structure only; Task 3 now supplies atomic execution and deletion confirmation.

Zod is a runtime dependency; Ajv is a development dependency used only for contract tests. Exact versions are pinned in the package files. Official [Zod API documentation](https://zod.dev/api) and [Ajv getting-started documentation](https://ajv.js.org/guide/getting-started.html) were checked during implementation. Graph context and request-body limits from the plan will be enforced at the server boundary in Task 8; no API endpoint is implemented here.

## Check Task 3: safe editing and history

Run from the project directory:

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/commands/execute.test.ts src/commands/resolve.test.ts
```

Expect **72 passing tests across two files** (including the exploration integration tests added in Task 4). Running `node .tools/npm/package/bin/npm-cli.js test` checks all **236 tests**. With a normal npm installation, use `npm test` instead. Add `--reporter=verbose` to inspect named safety cases. Tests cover frozen input, rollback, connected deletion, ambiguity, stale confirmations, and exact undo/redo restoration. Typecheck and lint also passed.

`src/commands/execute.ts` exports:

- `createEngineState()` for an empty chart with version 0, empty history, and no pending interaction.
- `execute(state, unknownCommand, newId)` returning a typed outcome, message, and new state. The caller injects an opaque-ID generator, normally `crypto.randomUUID`; colliding IDs are rejected. No UI, speech, or provider code can bypass validation through this API.
- `resolveClarification(state, candidateId, newId)` for resuming the original command after an exact candidate selection. This is a local interaction API, not a new LLM command kind. Natural-language clarification replies will be mapped to candidate IDs during the later voice milestone.

References resolve by case-insensitive exact label, focus pronouns, normalized label, and high-confidence fuzzy match, with recent-node phrases used only explicitly. Normalization uses Unicode NFKC, lowercase, and punctuation/space folding. Fuzzy matching uses code-point Levenshtein similarity of at least 0.90 with a 0.10 lead; near ties ask for clarification. At most three choices are displayed, with stable IDs to distinguish duplicate labels; the pending state retains all candidates for exact selection. Parallel edge references also require a unique match or exact edge selection.

Successful edits increment the graph version, add one history snapshot, and clear redo and pending state. Focus changes do not create history, change the version, or clear redo. Add/rename/move update focus and recent node; connect uses its target as the primary affected node; deletion clears recent and removes any dangling focus or placement hints. Undo/redo restores graph, focus, and recent from snapshots and increments the version.

Connected-node deletion prepares the entire result without committing it. Confirm checks the graph version and revalidates the prepared graph before one atomic commit; cancel discards it. The prepared snapshot pins the deletion target even if focus changes while waiting. Compound clarification retains its allocated IDs and original focus/recent context so replay cannot redirect references or duplicate provisional additions. Intervening successful edits invalidate pending work. Failed commands preserve the prior graph and history.

No page controls were added in Task 3. Task 4 now implements the exploration commands described below; browser editing controls remain planned for Task 5.

## Check Task 4: descriptions, paths, and structural warnings

Run from the project directory:

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/graph/queries.test.ts src/feedback/describe.test.ts src/commands/execute.test.ts
```

Expect **89 passing tests across three files**. The full suite has **236 passing tests**. With npm on your path, use `npm test` followed by the same file arguments. Add `--reporter=verbose` to see tests for cycle termination, branch stops, missing references, and preserved undo/redo history. The browser is still the application shell; interactive controls are next in Task 5.

- `describe` with `scope: "chart"` summarizes node/connection counts, node labels/types/IDs, and labeled connections. `scope: "focus"` inspects the focused node.
- `inspect` reports node identity plus incoming/outgoing connections and labels. An explicit `node: null` uses focus; no focus produces an actionable error.
- `trace_path` with a target finds one shortest directed route with stable node-ID ordering for ties. Parallel connections on that route are selected by edge ID and identified in the description. Without a target, tracing follows only one outgoing connection, stopping at an end, a branch, a dead end, or a repeated node. It explains the stopping reason. Missing nodes are errors; an existing but unreachable target gets a clear no-route result.
- `validate` reports absent start/end nodes, nodes unreachable from any start, decisions with fewer than two outgoing branches, and unlabeled decision connections. With no start node, it reports that absence and defers reachability checks. Loops across different nodes remain valid.

`src/graph/queries.ts` contains pure graph queries; `src/feedback/describe.ts` produces plain-text descriptions. `src/commands/explore.ts` handles exploration routing and references, using the existing clarification flow. Exploration leaves graph, history, redo, focus, recent node, and version unchanged. Unambiguous queries preserve pending deletion confirmations; ambiguous queries ask for a candidate and resume without a history entry. No audio is produced yet; spoken feedback arrives in Task 10.

## Dependencies

Stable versions resolved from npm on September 5, 2026, pinned exactly in `package.json` and `package-lock.json`:

| Package | Version |
|---|---|
| Next.js / eslint-config-next | 16.3.4 |
| React / React DOM | 19.2.8 |
| TypeScript | 6.0.3 |
| ESLint | 9.39.5 |
| Vitest | 5.0.0 |
| jsdom | 30.0.1 |
| Testing Library React | 16.3.3 |
| Testing Library jest-dom | 7.0.1 |

Setup follows the official [Next.js installation guide](https://nextjs.org/docs/app/getting-started/installation), checked during bootstrap. The application was manually scaffolded to preserve the existing design and plan. CSS uses a small blue/white token palette and local system fonts, so building does not require downloading fonts. React Flow 12.11.6 and Dagre 3.1.1 provide the canvas and baseline layout. Voice packages remain deferred.

Compatibility exception: the latest TypeScript 7 release was rejected by Next.js's typescript-eslint dependency, and its React/accessibility/import plugins declare ESLint support only through version 9. TypeScript 6.0.3 and ESLint 9.39.5 are pinned to satisfy those boundaries. npm marks ESLint 9 as out of support; revisit the pin when the Next.js plugin stack supports ESLint 10. Do not upgrade either tool independently without rerunning lint. npm also reports a blocked optional `unrs-resolver` postinstall script; the installed native package resolves successfully and lint passes without enabling that script.

Task 1 verification: two shell tests passed after first failing against the starter page; typecheck, lint, and production build passed. Browser checks confirmed visible keyboard focus, skip-link destination, keyboard guide expansion, and a single-column layout with no horizontal overflow at a 375-pixel viewport. Browser error/warning logs were empty. A human screen-reader audit has not been performed.

## Environment and project documents

`.env.example` lists future server configuration. When live integration begins, keep the key in `.env.local`; never prefix it with `NEXT_PUBLIC_` or commit it. Provider model availability will be verified at that milestone.

- [Authoritative design](2026-09-05-voice-tactile-flowchart-design.md)
- [Implementation plan and progress](docs/superpowers/plans/2026-09-05-voice-tactile-flowchart.md)
- `src/app/`: page, root layout, styles, and shell tests.
- `src/test/setup.ts`: Testing Library cleanup and assertions.

Work proceeds one milestone at a time, with owner verification before continuing. No physical tactile hardware, validated Braille output, or offline voice capability is claimed.

## Check Task 5: visual authoring

1. Refresh to start an empty workspace. Click Start in the shape palette, then drag Process onto the canvas near it. Expect two shapes in the canvas and Chart outline.
2. Select Process, change Shape label to Validate card, and choose Apply label. Both views must agree.
3. Drag the bottom dot of Start to the top dot of Validate card. Expect one arrow and one outline connection.
4. Drag Validate card to the right of Start. It snaps to a relative position; connection count must remain one. Undo and Redo must restore the placement.
5. Select Validate card and choose Delete selected. Cancel must retain the node. Confirm deletion must remove the node and connection; Undo must restore both.
6. Expand Keyboard editing & advanced commands for named connection labels, explicit relative moves, path tracing, and all form actions. Palette buttons and the label editor also work with Tab and Enter.
7. Narrow the window: the palette moves above the canvas and the page should not scroll horizontally.

Verification: 256 tests across ten files, TypeScript, lint, and production build. Browser checks cover palette click/drop, direct label editing, connector dragging, snapped node dragging, undo/redo, and a 375-pixel viewport. jsdom tests stub ResizeObserver because they verify command behavior and accessible text, not real canvas geometry. Full screen-reader auditing remains Task 10.

Dragging deliberately uses relative placement and automatic spacing; this is not a free-positioned draw.io clone. The first shape is centered automatically. Dense-chart edge routing is basic and does not guarantee obstacle avoidance. Preview overlays remain Task 7; tactile rendering remains Task 6. Charts are not saved across refreshes.
