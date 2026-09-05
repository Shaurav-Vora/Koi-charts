# Koi charts Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkboxes for tracking. The owner requires one milestone per turn, followed by instructions for checking it. Stop at each checkpoint and wait for the owner to continue. Do not execute the whole plan in one turn.

**Goal:** Build a voice-first flowchart editor whose committed graph drives visual, simulated tactile, Braille demonstration, and speech output.

**Architecture:** Framework-independent graph transactions sit behind one validated command boundary. A Next.js client composes renderers and streaming; server routes hold credentials and interpret final transcripts. Partials belong to a separate disposable preview path.

**Tech Stack:** Next.js App Router, strict TypeScript, npm, React, XYFlow, Dagre, Zod, AssemblyAI, Vitest, Testing Library, Playwright, axe.

**Spec:** [Authoritative design](../../../2026-09-05-voice-tactile-flowchart-design.md). Keep that original file in place.

## Progress and execution rules

- [x] Planning checkpoint: read the complete specification and create this implementation plan.
- [x] Task 1: Runnable accessible application shell.
- [x] Task 2: Serializable graph and command contracts.
- [ ] Task 3: Safe edits, references, confirmation, and history.
- [ ] Task 4: Exploration and structural validation.
- [ ] Task 5: Visual canvas and keyboard/mouse editing.
- [ ] Task 6: Tactile simulator and focused viewport.
- [ ] Task 7: Partial previews and final-turn coordinator.
- [ ] Task 8: Server authentication and command interpretation.
- [ ] Task 9: Real microphone and streaming session.
- [ ] Task 10: Spoken feedback and accessibility verification.
- [ ] Task 11: Integrated demo, recovery, and handoff.

Each task is a separately reviewable milestone, not permission to implement its successors. At its end report changed behavior, checks actually run, and numbered manual verification instructions with expected results. Mark only verified work complete. The owner’s request to work from the design is the basis for planning; do not rewrite its historical approval status.

The folder initially contains only the design Markdown, without application files or Git metadata. Commit boundaries below describe intended changesets; initialize Git at bootstrap if appropriate and stage named project files only. Never include secrets. Do not claim commits or tests were performed during planning.

## Global constraints

- Node.js 20 or newer, also satisfying the selected Next.js release's actual engine requirement. Resolve current stable versions at bootstrap and commit exact versions in `package-lock.json`; record versions in README. Verify official documentation when implementing external API calls.
- Node types: `start`, `process`, `decision`, `end`. Placement: `before`, `after`, `above`, `below`, `left_of`, `right_of`. Placement never implies a connection.
- Only final, validated commands may mutate the graph. Partials never affect history, tactile pins, Braille, or committed speech.
- Labels may repeat; IDs are opaque and stable. Reject missing endpoints and self-edges; permit multi-node cycles.
- Connected-node deletion requires confirmation with the incident-edge count. Each successful edit or compound edit is one undo entry. Focus and exploration do not create history.
- All editing methods use the same command engine. Renderers never own domain state.
- Keep `ASSEMBLYAI_API_KEY` server-side. Temporary-token initiation lifetime: 60 seconds; session maximum: 30 minutes. No raw audio, tokens, keys, or full transcripts in production logs.
- Preserve the specified states and exact status copy, including “Preview—not yet applied” and “Voice editing unavailable—connection lost”.
- Desktop Chromium is the demo target. Include keyboard access, visible focus, non-color cues, reduced motion, screen-reader checks, and explicit simulator/Braille limitations.
- No hardware SDK, accounts, database, multi-user networking, offline voice, extra diagram types, or freeform pixel positioning. General persistence/import/export is optional and outside this plan; a bundled large-chart demo fixture is included.
- The document’s vendor model names are configuration baselines, not claims of independently verified current availability. Check official AssemblyAI documentation in Tasks 8–9 before using them; record any evidenced incompatibility.

## Contract decisions

Implement the graph types exactly as in spec section 9 in `src/graph/types.ts`. The following additional types close the referenced contracts. Optional fields in the domain command use explicit `null` in the wire format, allowing strict structured output with all object properties required. Normalize to domain optionals after validation if needed; never accept arbitrary extra properties.

```ts
type SpokenRef =
  | { kind: 'id'; value: string }
  | { kind: 'label'; value: string }
  | { kind: 'focus' }
  | { kind: 'recent' };
type PlacementRef = {
  relation: 'before' | 'after' | 'above' | 'below' | 'left_of' | 'right_of';
  reference: SpokenRef;
};
type SpokenElementRef =
  | { kind: 'node'; node: SpokenRef }
  | { kind: 'edge_id'; id: string }
  | { kind: 'edge'; source: SpokenRef; target: SpokenRef; label: string | null };
type EditCommand =
  | { kind: 'add_node'; type: 'start' | 'process' | 'decision' | 'end'; label: string; placement: PlacementRef | null }
  | { kind: 'connect'; source: SpokenRef; target: SpokenRef; label: string | null }
  | { kind: 'rename'; node: SpokenRef; newLabel: string }
  | { kind: 'move'; node: SpokenRef; placement: PlacementRef }
  | { kind: 'delete'; target: SpokenElementRef };
type GraphCommand = EditCommand
  | { kind: 'compound'; commands: EditCommand[] }
  | { kind: 'focus'; node: SpokenRef }
  | { kind: 'undo' | 'redo' | 'validate' | 'confirm' | 'cancel' }
  | { kind: 'describe'; scope: 'chart' | 'focus' }
  | { kind: 'inspect'; node: SpokenRef | null }
  | { kind: 'trace_path'; start: SpokenRef; end: SpokenRef | null };
type PendingClarification = {
  kind: 'clarification'; command: GraphCommand; referencePath: string;
  candidates: string[]; graphVersion: number;
};
type PendingDeletion = {
  kind: 'deletion'; command: GraphCommand; nodeIds: string[];
  incidentEdgeIds: string[]; graphVersion: number;
};
```

`compound` makes explicit the atomic compound-command requirement in sections 7.5 and 10; it accepts 1–10 edit commands, no nested compounds or exploration. Validate the whole cloned result before committing. Connected deletion anywhere inside a compound confirms the whole transaction; cancellation changes nothing.

Use `Snapshot = { graph: FlowGraph; focusedNodeId: string | null; recentNodeId: string | null }`. `History = { past: Snapshot[]; future: Snapshot[] }`. `EngineState = Snapshot & { version: number; history: History; pending: PendingClarification | PendingDeletion | null }`. Initialize version 0 and increment it on every committed edit, undo, and redo. Keep focused IDs valid. Previews and presentation modes live outside `EngineState`.

`CommandResult = { state: EngineState; outcome: 'committed' | 'focused' | 'explored' | 'clarification' | 'confirmation' | 'cancelled' | 'error'; message: string }`.

The exact JSON Schema is generated by the following construction in `src/commands/json-schema.ts`; export the resulting object as `commandJsonSchema` and contract-test it against Zod with Ajv in development. The server response envelope is `{ command: GraphCommand }`.

```ts
const obj = (properties: Record<string, unknown>) => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
});
const str = { type: 'string', minLength: 1, maxLength: 200 };
const en = (...values: string[]) => ({ type: 'string', enum: values });
const nullable = (schema: unknown) => ({ anyOf: [schema, { type: 'null' }] });
const variant = (kind: string, fields: Record<string, unknown> = {}) =>
  obj({ kind: { const: kind, type: 'string' }, ...fields });
const ref = { anyOf: [variant('id', { value: str }), variant('label', { value: str }),
  variant('focus'), variant('recent')] };
const placement = obj({
  relation: en('before', 'after', 'above', 'below', 'left_of', 'right_of'), reference: ref,
});
const target = { anyOf: [variant('node', { node: ref }), variant('edge_id', { id: str }),
  variant('edge', { source: ref, target: ref, label: nullable(str) })] };
const edits = [
  variant('add_node', { type: en('start', 'process', 'decision', 'end'), label: str, placement: nullable(placement) }),
  variant('connect', { source: ref, target: ref, label: nullable(str) }),
  variant('rename', { node: ref, newLabel: str }),
  variant('move', { node: ref, placement }), variant('delete', { target }),
];
export const commandJsonSchema = obj({ command: { anyOf: [
  ...edits,
  variant('compound', { commands: { type: 'array', minItems: 1, maxItems: 10, items: { anyOf: edits } } }),
  variant('focus', { node: ref }),
  ...['undo', 'redo', 'validate', 'confirm', 'cancel'].map(kind => variant(kind)),
  variant('describe', { scope: en('chart', 'focus') }),
  variant('inspect', { node: nullable(ref) }),
  variant('trace_path', { start: ref, end: nullable(ref) }),
] } });
```

Whitespace-only labels additionally fail semantic validation. Bound graph context to 200 nodes, 400 edges, and 32,000 serialized characters; reject excess context explicitly rather than silently losing references. Limit final transcripts to 2,000 characters and HTTP request bodies to 64 KiB. These are reversible demo limits, documented in README.

## Task 1: Runnable accessible application shell

**Completed September 5, 2026.** Two shell tests passed following an observed failing run. Typecheck, lint, and production build passed. Browser checks covered the skip link, keyboard guide expansion, desktop layout, and a 375-pixel stacked layout without horizontal overflow. See README for the local npm invocation and evidenced TypeScript/ESLint compatibility pins. The owner subsequently requested Git; this milestone is the initial repository checkpoint.

**Files:** Create `package.json`, `package-lock.json`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `README.md`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `vitest.config.ts`, `src/test/setup.ts`, `src/app/page.test.tsx`.

**Interfaces:** `/` renders Koi charts, an empty visual region, a clearly labeled tactile simulator region, and idle status. No microphone request on load. Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test` (`vitest run`).

- [x] Inspect `node --version` and `npm --version`. Check current official Next.js setup instructions and resolve stable dependencies; use a temporary scaffold directory if needed to preserve the existing Markdown. Select App Router, `src/`, strict TypeScript, npm, no Tailwind. Record exact installed versions and supported Node requirement.
- [x] Configure Vitest/jsdom/Testing Library; write the following behavior test before replacing the starter page:

```tsx
render(<Home />);
expect(screen.getByRole('heading', { name: 'Koi charts', level: 1 })).toBeVisible();
expect(screen.getByRole('region', { name: 'Visual flowchart' })).toBeVisible();
expect(screen.getByRole('region', { name: 'Tactile display simulator' })).toBeVisible();
expect(screen.getByRole('status')).toHaveTextContent('Idle');
```

- [x] Run `npm test -- src/app/page.test.tsx`; expect missing UI assertions to fail. Implement semantic landmarks, skip link, empty states, readable responsive panels, focus styles, and reduced-motion CSS. Label voice functionality as not connected yet; do not present a working microphone control.
- [x] Add `.env.example` with `ASSEMBLYAI_API_KEY=` and `ASSEMBLYAI_LLM_MODEL=gemini-2.5-flash-lite`. Ignore `.env*` except the example, dependencies, build/test output. Explain setup and current milestone in README.
- [x] Run `npm test -- src/app/page.test.tsx`, `npm run typecheck`, `npm run lint`, and `npm run build`; expect all to pass. Start `npm run dev` and inspect the page.

**Owner check:** Run `npm run dev`, open `http://localhost:3000`, confirm the title and two empty labeled panels, press Tab to reveal the skip link, and resize the window. No microphone permission prompt should appear.

**Commit boundary:** `chore: bootstrap accessible Koi charts shell`.

## Task 2: Serializable graph and command contracts

**Completed September 5, 2026.** All 131 graph/schema tests pass after an observed failing validation run. Typecheck and lint pass. Command types are inferred from strict runtime schemas; graph integrity accepts unknown input for safe boundary validation. Unicode lengths use code points in both validators. The browser remains at the shell milestone. Task 3 has not started.

**Files:** Create `src/graph/types.ts`, `src/graph/invariants.ts`, `src/graph/invariants.test.ts`, `src/commands/schema.ts`, `src/commands/json-schema.ts`, `src/commands/schema.test.ts`, `src/test/fixtures.ts`. Modify `package.json`, lockfile, README.

**Interfaces:** `createEmptyGraph(): FlowGraph`; `assertGraph(graph: FlowGraph): void`; `commandSchema` validates a command, `commandEnvelopeSchema` validates `{command}`; `commandJsonSchema` is defined above. Export all contract types from their corresponding graph/command modules. Inject ID generation into transactions rather than deriving IDs from labels.

- [x] Add Zod and development Ajv. Write table tests for every command variant and reference form, required fields, extra properties at every depth, wrong enums, empty strings, compound limits, and wire nulls.

```ts
expect(createEmptyGraph()).toEqual({ schemaVersion: 1, nodes: [], edges: [] });
expect(commandSchema.safeParse({ kind: 'undo', surprise: true }).success).toBe(false);
expect(commandSchema.safeParse({ kind: 'inspect', node: null }).success).toBe(true);
```

- [x] Run `npm test -- src/graph/invariants.test.ts src/commands/schema.test.ts`; expect missing implementations to fail. Implement strict Zod objects matching the schema construction and graph integrity validation, including placement references, finite data, unique node/edge IDs, missing endpoints, and self-edges.
- [x] Contract-test identical acceptance/rejection by Ajv and Zod on the complete fixture table. Confirm duplicate labels and multi-node cycles pass graph validation. Run targeted tests and `npm run typecheck`; expect pass.

**Owner check:** Run `npm test -- src/graph/invariants.test.ts src/commands/schema.test.ts`. All cases should pass; the browser remains at the shell milestone.

**Commit boundary:** `feat: define graph and command contracts`.

## Task 3: Safe edits, references, confirmation, and history

**Files:** Create `src/commands/resolve.ts`, `src/commands/execute.ts`, `src/commands/execute.test.ts`, `src/commands/resolve.test.ts`, `src/graph/history.ts`, `src/graph/transaction.ts`. Extend `src/graph/types.ts` with engine contracts above.

**Interfaces:** `createEngineState(): EngineState`; `execute(state: EngineState, input: unknown, newId: () => string): CommandResult`; `resolveNode(state: EngineState, ref: SpokenRef)` returns `{kind:'resolved',id:string}`, `{kind:'ambiguous',ids:string[]}`, or `{kind:'missing'}`. Execution validates unknown input before resolution.

- [ ] Write immutability tests for all five edits, connected-node confirm/cancel, stale pending versions, duplicate labels, all placement relations, undo/redo, redo invalidation, and atomic compound rollback. Freeze input snapshots to catch accidental mutation.

```ts
const before = createEngineState();
const added = execute(before, { kind: 'add_node', type: 'start', label: 'Begin', placement: null }, () => 'n1');
expect(before.graph.nodes).toEqual([]);
expect(added.state.history.past).toHaveLength(1);
expect(execute(added.state, { kind: 'undo' }, () => 'unused').state.graph).toEqual(before.graph);
```

- [ ] Run `npm test -- src/commands/execute.test.ts src/commands/resolve.test.ts`; expect fail. Implement cloned transactions with result invariant checks, history snapshots, and post-edit focus. Remove placement hints pointing at deleted nodes. Invalidate pending interactions after intervening graph changes; revalidate confirmation rather than executing stale commands.
- [ ] Resolve exact case-insensitive labels first, then focus pronouns, then normalized unique matches. Use normalized Levenshtein similarity `1 - distance/maxLength`, threshold 0.90 and a 0.10 lead over the next match. Multiple plausible labels require clarification. Resolve explicit recent phrases only as the final rule. Direct IDs must exist. Show at most three candidates with stable IDs to distinguish identical labels; retain the original command and unresolved field path.
- [ ] Execute all compound edits against a working clone; commit once only after all succeed. If confirmation or clarification is needed, retain the original graph and full command. Run targeted tests and typecheck; expect pass.

**Owner check:** Run the two command test files. Read the named passing tests for “connected deletion waits for confirm”, “compound failure preserves graph”, and “new edit clears redo”.

**Commit boundary:** `feat: execute validated reversible graph edits`.

## Task 4: Exploration and structural validation

**Files:** Create `src/graph/queries.ts`, `src/graph/queries.test.ts`, `src/feedback/describe.ts`, `src/feedback/describe.test.ts`. Modify `src/commands/execute.ts` and its tests.

**Interfaces:** `validateGraph(graph: FlowGraph): string[]`; `tracePath(graph: FlowGraph, startId: string, endId?: string): string[]`; `describeChart(graph: FlowGraph): string`; `inspectNode(graph: FlowGraph, nodeId: string): string`. Missing references become command errors, not empty success descriptions.

- [ ] Test missing start/end nodes, reachability from all starts, decisions with fewer than two outgoing branches, unlabeled decision edges, cycles, disconnected targets, focused inspection, and history preservation.

```ts
expect(validateGraph({ schemaVersion: 1, nodes: [], edges: [] }))
  .toEqual(expect.arrayContaining(['No start node.', 'No end node.']));
```

- [ ] Run `npm test -- src/graph/queries.test.ts src/feedback/describe.test.ts`; expect fail. Implement visited-set traversal. With a target, choose a shortest directed path with stable ID ordering for ties; without a target, follow a sole successor and stop at an end, branch, or revisited node, describing why. Never invent a branch choice.
- [ ] Route describe/inspect/trace/validate through executor without modifying graph/history. Keep descriptions explicit about labels, types, and incoming/outgoing edge labels. Run query, description, and command tests; expect pass.

**Owner check:** Run the targeted tests and confirm the cyclic graph test terminates and exploration leaves history unchanged.

**Commit boundary:** `feat: inspect and validate flowchart structure`.

## Task 5: Visual canvas and keyboard/mouse editing

**Files:** Create `src/editor/Editor.tsx`, `src/editor/reducer.ts`, `src/editor/CommandForm.tsx`, `src/editor/Editor.test.tsx`, `src/visual/layout.ts`, `src/visual/layout.test.ts`, `src/visual/VisualCanvas.tsx`, `src/visual/FlowNode.tsx`. Modify `src/app/page.tsx`, CSS, dependencies/lockfile, and README.

**Interfaces:** `layoutGraph(graph: FlowGraph): LayoutFrame`, where `LayoutFrame = { nodes: {id:string;x:number;y:number;width:number;height:number}[]; edges: {id:string;points:{x:number;y:number}[]}[] }`. `VisualCanvas` receives graph, layout, focused ID, preview, and an `onCommand(command: GraphCommand)` callback. `Editor` owns reducer state and dispatches through `execute`.

- [ ] Add XYFlow and Dagre using current official docs. Write a component test that fills a labeled node form and submits:

```tsx
await user.type(screen.getByLabelText('Node label'), 'Begin');
await user.click(screen.getByRole('button', { name: 'Add node' }));
expect(screen.getByRole('region', { name: 'Chart structure' })).toHaveTextContent('Begin');
```

- [ ] Run `npm test -- src/editor/Editor.test.tsx src/visual/layout.test.ts`; expect fail. Implement forms for add/connect/rename/move/delete/focus and undo/redo, plus confirm/cancel and clarification candidate buttons. Use stable IDs in selects. Keep a structured node/edge list outside the canvas.
- [ ] Implement deterministic layout with stable ordering and semantic placement hints; nodes cannot be freely dragged. Lay out connected components with Dagre, then apply hints and collision spacing deterministically; reject self-referential placement and terminate conflicting-hint handling with stable ordering. Route edges from the final positions. Use correct shapes, arrowheads, labeled edges, focus text and outline. Wrap renderer failures in an error boundary preserving editor state.
- [ ] Run component/layout/domain tests and production build; expect pass. Manually add, connect, move, rename, confirm-delete, and undo using keyboard alone.

**Owner check:** In the browser add Begin and Validate card, connect them, rename the process, then Undo. The node list and visual canvas must agree. Moving a node must not create an edge. Deleting a connected node must wait for confirmation.

**Commit boundary:** `feat: add visual and keyboard flowchart editing`.

## Task 6: Tactile simulator and focused viewport

**Files:** Create `src/tactile/types.ts`, `src/tactile/viewport.ts`, `src/tactile/rasterize.ts`, `src/tactile/braille.ts`, `src/tactile/TactileSimulator.tsx`, `src/tactile/renderer.test.ts`, `src/test/large-graph.ts`. Modify `src/editor/Editor.tsx` and README.

**Interfaces:** `TactileFrame = { version:number; width:number; height:number; raisedPins:{x:number;y:number}[]; brailleCells:string; text:string; focusedNodeId:string|null; mode:'overview'|'focus' }`; `TactileAdapter = { render(frame:TactileFrame):Promise<void> }`; `makeTactileFrame(graph:FlowGraph, layout:LayoutFrame, focus:string|null, mode:'overview'|'focus', version:number):TactileFrame`.

- [ ] Test viewport neighbors/edges, stable display IDs through renames/deletes/undo, arrowheads, focus marker, all shapes, bounds, and identical frames from identical inputs.

```ts
expect(frame.raisedPins.every(p => Number.isInteger(p.x) && Number.isInteger(p.y)
  && p.x >= 0 && p.x < frame.width && p.y >= 0 && p.y < frame.height)).toBe(true);
```

- [ ] Run `npm test -- src/tactile/renderer.test.ts`; expect fail. Use a 120×80 pin frame with clamped line/shape rasterization. Allocate stable short IDs in an editor-session registry keyed by opaque node ID; preserve registry entries across undo/deletion. Map a supported English letter/digit subset to Unicode Braille with capitalization/number markers; display the full original text and explicitly identify unsupported characters and demonstration limits.
- [ ] Select focus plus immediate predecessors/successors and edges among that set. Fit overview to the frame; auto-select focus mode if the fit gives any node fewer than 8 pins of width or 6 pins of height. With no focus use the first stable node ID. Always expose mode controls. Keep pin patterns meaningful without color; show full focused label and type in the information strip.
- [ ] Integrate a simulator adapter consuming only committed frame data. Run tactile tests and editor tests; verify failure of the simulator does not corrupt the graph.

**Owner check:** Add each node type, connect them, focus a decision, and compare visual focus with the pin marker and information strip. Load the bundled large-chart example, switch modes, then Undo an edit; both views must show the restored chart.

**Commit boundary:** `feat: render committed graph as tactile simulation`.

## Task 7: Partial previews and final-turn coordinator

**Files:** Create `src/commands/preview.ts`, `src/commands/fast-path.ts`, `src/streaming/turns.ts`, `src/streaming/turns.test.ts`, `src/editor/status.ts`, `src/editor/coordinator.ts`. Modify editor and canvas modules.

**Interfaces:** `Turn = { sessionId:string; turnId:string; text:string; final:boolean }`; `previewCommand(text:string):GraphCommand|null`; `parseControl(text:string):GraphCommand|null`; coordinator consumes `Turn` and an injected `interpret(text:string,state:EngineState,signal:AbortSignal):Promise<GraphCommand>`, and emits presentation changes or validated executor calls.

- [ ] Write partial revision, partial clearing, final-only dispatch, duplicate-final, ordered-final, stale interpretation, session-change, and clarification-continuation tests.

```ts
await coordinator.accept({ sessionId:'s1', turnId:'1', text:'Add a start called Begin', final:false });
expect(executeSpy).not.toHaveBeenCalled();
expect(tactileSpy).not.toHaveBeenCalled();
```

- [ ] Run `npm test -- src/streaming/turns.test.ts`; expect fail. Parse only conservative recognizable previews; incomplete input clears the old preview. Exact controls skip the server. Serialize final interpretation, deduplicate by session/turn, and reject results if their graph version became stale during manual editing. Clear previews on finalization, stop, and errors.
- [ ] Route clarification replies using pending context; explicit candidate IDs from the UI remain deterministic. Store and revalidate the original command rather than interpreting a selection as an unrelated edit. Preserve all state names from spec section 8.2 and its exact display strings.
- [ ] Run streaming/domain/component tests. Use injected fake turns in tests only; the normal product must not claim live speech before Task 9.

**Owner check:** Run `npm test -- src/streaming/turns.test.ts`. Confirm named tests demonstrate a preview revision never changes graph/history/tactile output and duplicate finals apply only once.

**Commit boundary:** `feat: separate speech previews from final transactions`.

## Task 8: Server authentication and command interpretation

**Files:** Create `src/server/assemblyai.ts`, `src/server/limits.ts`, `src/server/errors.ts`, `src/app/api/assemblyai/token/route.ts`, `src/app/api/commands/interpret/route.ts`, `src/server/routes.test.ts`. Modify environment example, README, and coordinator integration.

**Interfaces:** `POST /api/assemblyai/token` returns `{token:string,expiresAt:string}`; `POST /api/commands/interpret` receives `{transcript:string,graph:FlowGraph,focusedNodeId:string|null,recentNodeId:string|null,pending:PendingClarification|PendingDeletion|null}` and returns `{command:GraphCommand}`. Errors: `{error:{code:'CONFIGURATION'|'INVALID_INPUT'|'RATE_LIMITED'|'UPSTREAM'|'TIMEOUT',message:string,requestId:string}}` with appropriate 503/400/429/502/504 HTTP status.

- [ ] Read the official token, Streaming, Gateway structured-output, and SDK pages listed in the spec. Verify model support and actual request signatures before coding provider adapters; retain the spec's configurable baselines where supported. Record verified API decisions and date in README.
- [ ] Mock provider fetch/SDK boundaries and test absent key, invalid body, oversized body/context, rate limits, malformed Gateway JSON, schema mismatch, timeout, and upstream errors.

```ts
expect(response.headers.get('cache-control')).toContain('no-store');
expect(JSON.stringify(await response.json())).not.toContain('test-server-secret');
```

- [ ] Run `npm test -- src/server/routes.test.ts`; expect fail. Mark provider modules `server-only`. Reject unsupported content types and cross-origin browser requests. Bound the streamed request body before parsing it. Apply per-process demo rate limits of 6 token requests/minute and 30 interpretation requests/minute per client, plus global limits of 30 and 120; document that multi-instance public hosting needs a shared limiter before launch.
- [ ] Request 60-second temporary tokens and the 30-minute session limit through documented API fields. Send Gateway strict schema with JSON repair, bounded graph context, a 15-second timeout, and a 1,024-token output cap. Reject truncated/malformed results. Validate again with Zod. Redact upstream bodies and log only correlation ID, error category, and configured model. Return `Cache-Control: no-store`.
- [ ] Run route/schema tests, typecheck, and production build; expect pass. No live API key is needed for this milestone.

**Owner check:** Run `npm test -- src/server/routes.test.ts`. With no configured key, requests must return a clear configuration error without revealing credentials or crashing the app.

**Commit boundary:** `feat: add server-only AssemblyAI boundaries`.

## Task 9: Real microphone and streaming session

**Files:** Create `public/audio/pcm16-worklet.js`, `src/streaming/microphone.ts`, `src/streaming/session.ts`, `src/streaming/audio.test.ts`, `src/streaming/session.test.ts`. Modify editor controls, coordinator wiring, and README.

**Interfaces:** `Microphone = {start(onChunk:(pcm:ArrayBuffer)=>void):Promise<void>;stop():Promise<void>}`; `StreamingSession = {start():Promise<void>;stop():Promise<void>}`. Session emits normalized `Turn` objects plus connection/status and speech-start events; microphone knows nothing about graph commands.

- [ ] Verify current official audio frame sizes, browser SDK/WebSocket event fields, termination, token query/constructor fields, and `SpeechStarted` behavior. Translate provider events to the internal contract in one adapter.
- [ ] Test PCM16 clipping, little-endian bytes, downmixing, continuous resampling at 44.1/48 kHz, incomplete chunks, stop cleanup, token renewal, socket errors, and 30-minute timeout.

```ts
await session.start();
await session.stop();
expect(track.stop).toHaveBeenCalledTimes(1);
expect(socket.close).toHaveBeenCalled();
```

- [ ] Run `npm test -- src/streaming/audio.test.ts src/streaming/session.test.ts`; expect fail. Implement stateful anti-aliasing resampling in AudioWorklet to mono 16 kHz PCM16. Buffer provider-supported chunk sizes, drop no partial samples between worklet blocks, and request echo cancellation. Fetch a fresh token on every start/reconnect; do not send microphone frames until session ready.
- [ ] Add Start/Stop controls, mic activity, denied-permission recovery, explicit provider termination, track/context/worklet cleanup on every exit, and automatic 30-minute stop. Network loss preserves committed data and manual editing.
- [ ] Run audio/session/turn tests and build; expect pass. Then the owner places their key in `.env.local` and restarts the server for one explicit live session. Never ask them to paste the key into chat.

**Owner check:** Start listening, allow the microphone, say “Add a start called Begin,” and wait for its committed visual/tactile update. Stop and confirm the browser mic indicator turns off. Disconnect networking and verify the saved chart and manual controls still work, then reconnect using Start listening.

**Commit boundary:** `feat: connect live AssemblyAI speech streaming`.

## Task 10: Spoken feedback and accessibility verification

**Files:** Create `src/feedback/speech.ts`, `src/feedback/LiveStatus.tsx`, `src/feedback/feedback.test.tsx`, `docs/accessibility-test-log.md`, `playwright.config.ts`, `e2e/accessibility.spec.ts`. Modify editor, global CSS, dependencies/lockfile, and README.

**Interfaces:** `speak(message:string):void`, `cancelSpeech():void`, user-controlled speech toggle enabled initially, controlled transcript announcements, and a polite committed-status live region. Blocking errors alone use assertive announcements.

- [ ] Test no committed speech from partials, no DOM focus theft, toggle behavior, speech interruption on barge-in, and live-region updates.

```tsx
const active = document.activeElement;
await applyVoiceEdit();
expect(document.activeElement).toBe(active);
expect(screen.getByRole('status')).toHaveTextContent('Change applied');
```

- [ ] Run `npm test -- src/feedback/feedback.test.tsx`; expect fail. Implement browser speech with cancellation, controlled partial announcements (at most once per second), and paginated long descriptions with a Continue control. Cancel speech on provider speech-start. Gate mic frames during TTS only if live testing reproduces loopback, and expose that state visibly.
- [ ] Add Playwright and axe. Test empty, populated, preview, clarification, confirmation, and error states; no serious/critical violations. Verify keyboard order, labels, focus cues, target sizes, contrast, reduced motion, and renderer-degraded states. Record actual Windows screen reader and version used; do not claim a manual screen-reader pass from automated axe results.
- [ ] Run feedback tests and `npx playwright test e2e/accessibility.spec.ts`; expect pass. Record outstanding human checks explicitly.

**Owner check:** Use the editor with Tab/Shift+Tab/Enter and a Windows screen reader. Add and inspect a node; check that its type and connections are spoken, keyboard focus stays put, and turning speech feedback off stops app speech.

**Commit boundary:** `feat: add accessible speech and status feedback`.

## Task 11: Integrated demo, recovery, and handoff

**Files:** Create `e2e/editor.spec.ts`, `e2e/recovery.spec.ts`, `docs/demo-script.md`, `docs/live-integration-log.md`, `docs/submission-draft.md`, `src/streaming/metrics.ts`. Modify README and accessibility log.

**Interfaces:** Metrics store timestamps and durations only: speech-start→first-preview and final-turn→commit; report median and worst observed duration. Demo fixture loading validates its graph and is a single undoable replacement in the explicit demo control, separate from natural-language command schema.

- [ ] Write E2E tests for mocked partial/final chart construction, revised preview, duplicate final, clarification resolved once, connected deletion/cancel, undo/redo synchronization, manual/tactile parity, large-chart viewport, network loss, and failed renderer recovery.

```ts
await expect(page.getByRole('region', { name: 'Visual flowchart' })).toHaveAttribute('data-graph-version', '1');
await expect(page.getByRole('region', { name: 'Tactile display simulator' })).toHaveAttribute('data-graph-version', '1');
```

- [ ] Run `npx playwright test e2e/editor.spec.ts e2e/recovery.spec.ts`; observe any failing integration cases before fixing their responsible boundaries. Expose committed version attributes for synchronization checks, not as product jargon.
- [ ] Write the 2–3 minute payment-chart narration, exact add/connect/inspect/trace/undo commands, large-chart switch, and recovery script. Prepare submission copy with accurate novelty and simulator limitations; do not claim physical usability validation.
- [ ] Run `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npx playwright test`; expect pass from clean installation. Avoid reinstalling or repeating the entire suite again without new changes or failures.
- [ ] With the owner's live account, verify start/stop, command types, an internal pause, ambiguous labels, key absence in browser assets/storage/responses, latency samples, and three consecutive full demo runs. Record observed results and unresolved limitations, never inferred success. Verify the logged-in event deadline before submission; deployment, recording delivery, and submission remain explicit owner actions/access checkpoints.

**Owner check:** Follow `docs/demo-script.md` three times, including one nonvisual run with keyboard and speech. Verify both views agree after every committed edit and that reconnect/undo recover predictably. Review actual latency and accessibility results before presenting the demo.

**Commit boundary:** `test: verify complete accessible voice demo`.

## Coverage review

| Design sections | Implementation coverage |
|---|---|
| 1–6: purpose, scope, principles | Global constraints, Tasks 1 and 11 documentation |
| 7: edits, references, deletion, history, exploration | Tasks 2–5 |
| 8: interaction states, preview, feedback | Tasks 7, 9, 10 |
| 9–10: graph, schema, transactions, provider paths | Contracts, Tasks 2–3 and 7–9 |
| 11: visual/tactile renderers, viewport, adapter | Tasks 5–6 |
| 12–14: architecture, stack, files | Task 1 and each task's exact files/interfaces |
| 15–16: recovery, secrets, privacy, costs | Tasks 3, 5–11 |
| 17: accessibility | Tasks 1, 5–6, 10–11 |
| 18: tests and acceptance | Per-task checks and Task 11 full regression/live runs |
| 19–22: demo, risks, access, official references | Tasks 8–11; credentials first needed at Task 9 |
| 23–24: handoff and plan | This file; one milestone followed by owner verification |

Planning does not verify dependency availability, live AssemblyAI compatibility, accessibility, or a running application. Those checks belong to the corresponding implementation milestones above.
