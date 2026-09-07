# Koi charts

A voice-first flowchart workspace designed for independent blind authorship. The planned editor uses one semantic graph for a visual flowchart, a digital tactile simulator, and spoken descriptions.

## Current milestone

**Task 9: microphone capture and live streaming session.** A **Start voice** control in the editor toolbar now opens the real microphone, mints a fresh temporary token, and streams mono 16 kHz PCM16 to AssemblyAI Streaming v3. Partial transcripts drive the local preview; only final transcripts reach the interpretation endpoint. Stopping, closing the tab, losing the connection, or reaching the thirty-minute cap all terminate the session and release the microphone. Awaiting owner verification with a live microphone.

**Task 8 remains available: server authentication and command interpretation.** Server-only endpoints mint temporary AssemblyAI tokens and interpret final transcripts through a validated command schema. Task 7 preview, deduplication and stale-context protections remain in place.

**Task 6 remains available: tactile simulator.** The committed graph now produces a deterministic 120 × 80 raised-pin simulation, with shape outlines, directional arrowheads and a focused-node cross. Auto mode switches dense charts to a neighborhood view; Overview and Focused view remain available. The full focused label, stable session ID and limited Braille demonstration appear below the pins.

The visual palette, keyboard commands and undo/redo remain available, including while voice is unavailable. Charts clear on refresh. The simulator is a digital demonstration, not physical hardware or validated Braille.

## Run locally

Basic voice insertion works without an existing selection: “add a start node”, “add a process node”, “add a decision node” and “add an end node” create shapes with their default labels. These exact phrases run locally on finalized transcripts, tolerate capitalization and ending punctuation, and support Undo/Redo. Partial transcripts remain previews only. Requests with custom names, placement instructions or multiple actions continue through the interpreter.

Command interpretation now calls Google's Gemini API directly. AssemblyAI handles speech-to-text only; there are no AssemblyAI LLM Gateway calls or fallbacks. The default model is `gemini-3.1-flash-lite`, configurable with `GEMINI_MODEL`. `ASSEMBLYAI_LLM_MODEL` is no longer used. The server requests structured JSON and validates every command with the existing strict schema before the editor can apply it.

Google and AssemblyAI have separate credentials and cooldowns. HTTP 429 responses include a wait time; the server honors `Retry-After` or Google's `RetryInfo` and otherwise waits 60 seconds before allowing more calls to that provider/model. Repeat the command after the wait; commands are never replayed automatically. Invalid keys, denied access and explicit billing/quota errors produce setup guidance without exposing provider response bodies.

Create a Google key in [Google AI Studio](https://aistudio.google.com/apikey). Keep the existing AssemblyAI key in `.env.local` and add:

```dotenv
GEMINI_API_KEY=your_google_key
GEMINI_MODEL=gemini-3.1-flash-lite
```

Restart the dev server. Start voice and say “Add a start called Begin”, then “Rename Begin to Entry”. These requests exercise Gemini; the simpler “add a start node” is handled locally. Check the shape, outline and Undo/Redo. No Google key was configured during implementation, so live Gemini/microphone verification remains an owner check. Mocked tests cover direct routing, credential separation, blocked/truncated output, validation, timeout and cooldown: `npm test -- src/server/gemini.test.ts src/server/provider-recovery.test.ts src/server/routes.test.ts`.

Google API decisions checked September 6, 2026: server-side POST to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with the `x-goog-api-key` header, `systemInstruction`, `contents` and `generationConfig.responseJsonSchema`. The output cap remains 1,024 tokens, timeout 15 seconds, and response/body limits remain bounded. JSON Schema `const` values are represented as single-value enums for Google's schema subset. See [Google's API reference](https://ai.google.dev/api/generate-content), [structured output guide](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), and [the default model](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite). Historical milestone notes below describe earlier provider choices; this configuration supersedes them.

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

`.env.example` lists server configuration. Keep the key in `.env.local`; never prefix it with `NEXT_PUBLIC_` or commit it. Restart the server after configuring it. Task 8 tests use mocked responses and need no live key. Provider signatures and model support were checked against official documentation on September 6, 2026; live account verification remains for Task 9.

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

Connection fix: either blue dot can start or finish a drag to another shape. The arrow follows drag direction and uses automatic bottom-to-top routing after release. Targets have a larger hit area and a green valid-target indicator. Browser verification reproduced the former bottom-to-bottom rejection, then confirmed bottom-to-bottom and top-to-top connections persist and survive undo/redo. All 256 tests, lint, and production build pass.

Palette insertion update: each click places the new shape to the right of the last surviving added node, regardless of focus or random IDs. Shapes expose top, bottom, left and right dots. Automatic routing uses facing left/right ports for horizontally separated nodes. Verified right-to-left dragging and a three-shape insertion sequence in the browser; 258 tests, lint and production build pass.

## Check Task 6: tactile simulation

1. Add Start, Process, Decision and End. Connect them. The simulator should show the corresponding pin shapes and directional arrowheads.
2. Focus Decision. Its raised cross and full label/type should agree with the visual focus. Its N-number remains stable when renamed, deleted and restored with Undo.
3. Switch between Overview and Focused view. Focused view includes the selected node, immediate predecessors/successors, and edges among them. Auto selects focused view when overview would make shapes smaller than 8 × 6 pins.
4. On an empty chart, click Load large example. Expect 32 nodes visually and automatic focus around Step 15. Overview shows all 32; Focused view shows three. Loading is disabled while a chart exists, and Undo removes the example in one step.
5. Rename Step 15 to Approved?. The original question mark is retained in text and explicitly listed as unsupported in the limited Braille preview. Undo restores Step 15 and its original simulator frame.

Verification: 271 tests across eleven files, lint, TypeScript (during build), and production build pass. Browser checks confirmed large-example auto focus, manual mode changes, matching graph versions, rename/unsupported-character feedback, undo restoring pins and empty state, and no horizontal overflow at 375 pixels. Adapter failure tests confirm frame isolation. Renderer tests were added alongside implementation; no initial failing renderer run is claimed.

The output adapter receives only a cloned committed TactileFrame. Simulator failures have an independent error boundary and do not replace the editor state. Short IDs are held in the editor session outside undo history. Focus views with unusually many immediate neighbors can still be crowded. Braille support is restricted to English letters, digits and spaces; unsupported characters use a disclosed placeholder. This output has not been validated with tactile hardware or Braille readers.

## Free positioning update

Shapes can now be dragged to exact canvas coordinates, including between existing blocks. Moving one shape preserves the other shapes' positions, and the canvas no longer automatically refits after each move. Connections reroute while dragging; the tactile display updates when the move is committed. Undo/Redo restores positions alongside the rest of the chart. Palette dragging also supports exact placement; palette clicks still add to the right.

Check: add three shapes, drag the middle one into a gap or below the others, and release. It should stay there without snapping or pulling neighbors along. Connect it and move it again, then Undo and Redo. Compare the visual and tactile displays after release. The keyboard Move node command retains relative placement for nonvisual authoring.

Implementation: optional bounded position coordinates in the graph and a validated move_to command shared by Zod and the provider JSON schema. One move freezes the current arrangement before updating the selected node, preserving undo history. Browser verification confirmed unchanged neighbors, placement persistence, Undo/Redo and matching visual/tactile graph versions. Automated movement tests cover exact coordinates, negative positions, neighbor stability, history and schema agreement.

## Canvas interaction and logo update

Adding a shape now preserves existing positions and no longer triggers automatic fit-to-view after the first shape. Use the canvas Fit View control when you want to recenter manually. Click empty canvas space to clear the visual selection without changing the graph or history. Double-click a shape to edit its label inline; Enter saves, Escape or clicking away cancels. The header/favicon logo is now an orange-and-white koi with fins, a forked tail and small mouth bubbles.

Verification: 278 tests, lint and production build pass. Regression tests cover insertion after free movement, clearing focus without touching history, inline rename and cancellation. Live browser verification for this update was unavailable because the browser-control kernel failed to start. Owner check: move a shape, add another and confirm the original stays in place; click blank canvas, double-click to rename, then confirm the new logo after refreshing.

## Check Task 7: transcript lifecycle

Run `node .tools/npm/package/bin/npm-cli.js test -- src/streaming/turns.test.ts` in this workspace (or `npm test -- src/streaming/turns.test.ts` with npm on PATH). Expect 14 passing tests covering partial revisions/clearing, final-only commits, duplicate finals, ordered interpretation, stale manual edits/focus, stop/session resets, exact controls, original-command clarification continuation, malformed responses and failure recovery.

The editor integration test additionally checks that a visual partial leaves the graph/history identity and tactile markup unchanged, then finalization commits once and removes the preview. Fake transcripts are injected only in tests. There is no live microphone, transcript test panel or provider request in the normal application. Server interpretation is Task 8; AssemblyAI streaming is Task 9.

`createEditorCoordinator()` exposes a synchronous editor store and TurnCoordinator for future adapters. Start a session explicitly, deliver its complete Turn messages, and stop on disconnect/unmount. Old-session results are discarded even if a provider ignores abort. Every manual action uses the same editor reducer. A stopped session cannot accept more turns. Exact controls run locally; uncertain edits require the injected interpreter. Preview parsing deliberately recognizes only simple named node additions. All named voice states and required display strings are centralized in editor/status.ts.

Task 7 verification: 293 tests across thirteen files, lint and production build. Tests were added alongside implementation; no initial failing run is claimed. Live browser verification was unavailable in this environment; the component test supplies the preview/final integration check. Owner verification is the targeted test command above. No visible voice-input behavior should be expected yet.
## Check Task 8: AssemblyAI server endpoints

Run `npm test -- src/server/routes.test.ts` (or `node .tools/npm/package/bin/npm-cli.js test -- src/server/routes.test.ts` in the bundled setup). Expect 20 passing tests covering configuration errors, validation, rate limits, provider failures, timeouts and credential redaction. The full suite has 313 tests.

With no server key configured, the following local request returns HTTP 503 with error code `CONFIGURATION` and a clear setup message:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:3000/api/assemblyai/token -Method Post -ContentType 'application/json' -Body '{}'
```

PowerShell displays non-success HTTP statuses as errors; this 503 is expected. The editor should remain usable. If a key is configured, this request instead mints a real temporary token; the mocked test command above is sufficient for this milestone. No microphone or live provider session was tested here.

API decisions verified September 6, 2026:

- The app accepts `POST /api/assemblyai/token` with `{}`. The server uses AssemblyAI's documented **GET** `/v3/token` with `expires_in_seconds=60` and `max_session_duration_seconds=1800`, returning `{token, expiresAt}`. See [token reference](https://www.assemblyai.com/docs/streaming/api-spec/generate-streaming-token) and [temporary-token authentication](https://www.assemblyai.com/docs/streaming/authenticate-with-a-temporary-token).
- `POST /api/commands/interpret` accepts the final transcript and current graph/focus/pending context. It calls the Gateway chat-completions endpoint using configurable `gemini-2.5-flash-lite`, strict JSON Schema, JSON repair, a 1,024-token output cap and a 15-second provider timeout. Truncated or schema-invalid output is rejected; successful output is `{command}`. See [structured outputs](https://www.assemblyai.com/docs/llm-gateway/structured-outputs) and [supported models](https://www.assemblyai.com/docs/llm-gateway/available-models).
- Native server fetch implements these two HTTP calls. A `server-only` guard keeps provider code out of client bundles. The browser adapter only calls the app endpoint and passes cancellation through.
- Streamed JSON bodies are capped at 64 KiB; transcripts at 2,000 characters; graph context at 100 nodes and 200 edges. Provider context omits visual coordinates. Both routes validate content type and reject cross-origin browser requests. Responses use `Cache-Control: no-store`; logs include only request ID, error category and configured model, never provider bodies, keys or transcripts.
- Demo limits are per process: 6 token and 30 interpretation requests per minute per client, with global caps of 30 and 120. By default all callers share the local client bucket and forwarded headers are ignored. Set `TRUST_PROXY=1` only behind a proxy that overwrites incoming forwarded headers. These endpoints have no account authentication; public hosting needs access controls and a shared limiter across instances before launch.

Verification: 313 tests, TypeScript, lint and production build passed. Owner verification of Task 8 precedes the Task 9 microphone integration.

## Check Task 9: microphone and live streaming

Run `npm test -- src/streaming/session.test.ts src/streaming/audio.test.ts`. Expect 14 passing tests covering the connection query string, holding audio until the session begins, turn translation, explicit termination, a fresh token per start, denied microphone permission, lost connections, the thirty-minute cap, and turns arriving after stop. The full suite has 329 tests.

Live check, which needs a real key and a working microphone:

1. Put a real key in `.env.local` (ignored by Git) as `ASSEMBLYAI_API_KEY=...`. Never place it in `.env.example`, which is tracked, and never prefix it with `NEXT_PUBLIC_`, which would publish it in the browser bundle.
2. Run `npm run dev` and open `http://127.0.0.1:3000`.
3. Press **Start voice** and allow microphone access. The status line should move from *Connecting* to *Listening*, and the level bar beside the button should respond to your voice.
4. Say `add a process called review draft`. The voice strip shows green **Hearing you**, then blue **Processing command**. A preview may appear before the edit commits. The command feedback shows **Change applied** when the node appears in the canvas, outline and tactile simulator. The voice strip turns amber while a spoken reply pauses microphone input, then returns to green **Listening**.
5. Say `connect start to review draft`, then `undo`, then `redo`.
6. Press **Stop voice**. The voice strip shows gray **Microphone off** and the browser's microphone indicator switches off.
7. Turn off Wi-Fi mid-session. The voice strip shows red **Connection lost**, the microphone is released, and the existing chart plus the palette, keyboard commands and undo/redo all keep working. Press **Start voice** again after reconnecting.

Streaming decisions verified September 6, 2026:

- The browser connects to `wss://streaming.assemblyai.com/v3/ws` with `token`, `sample_rate=16000` and `speech_model=universal-3-5-pro`. Browsers cannot set the `Authorization` header used in the server-side examples, so the temporary token travels as a query parameter. See [streaming authentication](https://www.assemblyai.com/docs/streaming/authenticate-with-a-temporary-token).
- Audio is raw mono 16-bit PCM, which the documented default already describes, so no `encoding` parameter is sent. Capture runs in an `AudioWorklet` at `/audio/pcm16-worklet.js` that low-pass filters and resamples the device rate to 16 kHz and emits 100 ms chunks without dropping samples between blocks. `getUserMedia` requests echo cancellation so spoken feedback is not transcribed back as a command.
- **Turn detection is left at the provider default.** The plan mentions a `balanced` turn mode, but no query-parameter name for it could be confirmed in the current documentation, so nothing is sent rather than guessing at a parameter. Revisit if turn boundaries feel wrong during the demo.
- A fresh token is minted on every start; tokens expire in 60 seconds and are never reused. Sessions are capped at thirty minutes both in the minted token and by a client-side timer.
- Streaming is billed for how long the socket stays open, not for how much audio is sent. Every exit path — Stop, unmount, `pagehide`, connection loss, the thirty-minute cap, and a failure part-way through startup — sends `{"type":"Terminate"}`, closes the socket, stops the media tracks and closes the `AudioContext`.
- The microphone is opened before the token is minted or the socket is opened, so a denied permission costs neither a credential nor a billable connection.
- Late results cannot corrupt the graph: turns carry the provider session ID and turn order, and the existing coordinator drops turns from an old session, repeated finals, and any result whose graph version, focus or pending state changed while it was in flight.

## Check canvas selection and arrow editing

Click an arrow to highlight it and open **Selected arrow**, which shows its source and destination. Enter a custom **Arrow label** and press **Apply label**, or use **Clear label**. Arrows leaving a Decision node also offer **Yes** and **No** shortcuts. Changes use the same command engine and undo history as other edits.

Selected shapes have a blue outline and soft halo; hovered shapes have a lighter tint. Valid connection targets turn green. Connecting a shape to itself is blocked while dragging. Clicking empty canvas space clears selection and closes the arrow editor. Escape closes the arrow editor while its controls have focus. Arrows are keyboard focusable and have source/destination labels.

Owner check: create Decision and two Process nodes, connect both branches, click each arrow and assign Yes/No. Confirm labels appear on the canvas and in the chart outline. Try a custom label, clear it, and undo. Click a shape and then empty space to check selection cues. Check the arrow editor at a narrow window width.

## Check spoken-reply fixes

### Brief replies

Successful navigation and selecting a node speak only its label, such as **Process** or **Review draft**. Routine edits retain their short confirmations, such as **Added Start node.** Full feedback remains visible on screen. **Describe chart**, **Inspect focus**, and **Where am I** still speak detailed information. Errors, branch choices, confirmations, and navigation fallback warnings retain their full instructions.

To check: create Start and Process with a connection, then use **Go to start** and **Next**. Expect only **Start** and **Process** spoken. Use **Inspect focus** or **Where am I** to hear details. At a fork, expect the branch choices rather than a silently chosen destination.

This milestone changes reply length only. The microphone still pauses during TTS; interruption and longer speaking time remain separate work.

The speech toggle now hydrates with the same initial markup on the server and browser. Only chart replies are spoken; intermediate transcripts are not. While a reply plays, microphone frames are replaced with silence until 400 ms after speech ends or is cancelled. Wait for the pause indicator to disappear before your next spoken command, or use **Mute replies**. **Stop voice** also cancels the current reply.

1. Reload with replies enabled, then with replies muted. Neither should show a hydration error.
2. Start voice and say **add a start node**. Expect **Added Start node.**
3. Leave the speakers audible and stay quiet after the reply. No repeated commands or extra nodes should appear.
4. After the microphone pause ends, say **add a process node**, then **connect Start to Process**. Expect one connection.
5. Mute replies or stop voice during a reply. Speech should stop; after muting, microphone input should resume after the short echo guard.

Verification: 434 tests, lint, TypeScript and production build passed. A live Gemini request for connecting Start to Process returned a valid connect command. Physical microphone/speaker behavior still needs the owner check above.

## The spoken syntax

Koi charts recognises a fixed command syntax on your own machine, with no model call and the same
result every time. Anything outside it still works — it is sent to be interpreted — but only these
forms are guaranteed. The **Fast local commands** toggle turns local recognition off; the
**Local command** / **Gemini** badge beside the status says which path answered.

Three rules make the syntax dependable:

1. **One command per utterance.** "Add a start and connect it to Review" is read as a single
   request and goes to the model. Say the two commands separately.
2. **Quote a label that contains grammar words.** `add a process called "Check before payment"`
   keeps "before" inside the label instead of reading it as a position.
3. **Name a shape by its label**, not by describing it. "a new decision" names nothing yet.

| Form | Example |
| --- | --- |
| `add a <shape> [called <label>] [<relation> <shape>]` | add a process called Check payment |
| `connect <shape> to <shape> [labelled <label>]` | connect Approved to Refund labelled No |
| `rename <shape> to <label>` | rename this to Take payment |
| `move <shape> <relation> <shape>` | move Refund below Approved |
| `delete <shape>` / `delete the connection from <shape> to <shape>` | delete Refund |
| `next` / `back` / `go to start` / `go to end` / `where am I` / `take <branch>` | take No |
| `focus on <shape>` / `clear selection` | focus on Check payment |
| `describe the chart` / `describe this` / `inspect <shape>` / `validate the chart` | inspect Check payment |
| `trace the path from <shape> [to <shape>]` | trace the path from Start to End |
| `undo` / `redo` / `confirm` / `cancel` | undo |

Shapes are `start`, `process`, `decision` and `end`, each with synonyms (`step`, `choice`,
`finish`). Positions are `before`, `after`, `above`, `below`, `left of` and `right of`. A leading
"now", "okay" or "please" is ignored, and dictation's capitalisation and full stops do not matter.

Deliberately left to the model: multi-command sequences, quantities ("add three steps"), bulk
references ("delete everything"), negation, and labelling an existing arrow by description — that
last one needs the arrow's identity, so click it or use the labelled `connect` form.

`src/commands/grammar.ts` holds this table as data, and `grammar.test.ts` runs every example
through the real parser in both plain and dictated form. A documented phrase that stops parsing
fails the build, so the guide above cannot drift from the code.

Owner check: start voice and say **"Now add a process called Check payment."** Expect the badge to
read **Local command**. Then say **"Add an end below Check payment."** and **"Connect Check payment
to End."** Say **"Add three steps for onboarding."** and expect the badge to read **Gemini**.

Verification: 649 tests, lint, TypeScript and production build passed.

## Check the voice repairs and toggle switches

**Switches.** "Fast local commands" and "Speak replies" are now switches: a knob slides left and
right, and a screen reader announces "on" or "off" rather than "pressed". Their labels no longer
change with the state, so "Speak replies" always names the setting, never the action.

**Stop speaking.** A reply holds the microphone until it finishes. The new button cuts it short and
releases the microphone after the usual echo guard.

**Repeated labels are numbered.** Adding a second Process gives "Process", "Process (2)". The first
shape keeps its plain name. Say "process two" — the brackets are not spoken. Renaming a shape onto
an existing name numbers it the same way.

**No IDs are spoken.** Describe chart, Inspect and Trace path named every shape by its UUID, which
is unusable aloud and long enough to hold the microphone shut. They now use labels, which are
unique. When two shapes are still too close to tell apart, the question is numbered — "Two shapes
match. Say one for Check payment, or two for Check payments" — and answered by saying **one**,
**two** or **three**, by the matching numbered button, or by **cancel**.

Owner check with voice on:

1. Say **"Add a process."** twice. Expect **Added Process node.** then **Added Process (2) node.**
2. Say **"Rename process 2 to Review."** Expect **Renamed node to Review.** and no stall.
3. Say **"Describe the chart."** Expect labels and types only — no long strings of characters.
4. During that reply, press **Stop speaking**. Speech should stop and the microphone should resume.
5. Toggle **Speak replies** off and on; the knob should move and a screen reader should say off/on.

Verification: 679 tests, lint, TypeScript and production build passed.
