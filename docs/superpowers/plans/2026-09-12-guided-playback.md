# Guided Flowchart Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a guided Test chart mode that pauses at every node, requires explicit branch choices, records the traversed route, and keeps visual, tactile, outline, keyboard, and voice feedback synchronized.

**Architecture:** A pure playback state machine reads the existing semantic FlowGraph without modifying it. The editor coordinator owns the transient playback state, maps its current node into the existing focus mechanism, and invalidates the session when the graph changes. React components render state returned by that engine; deterministic local voice commands call the same playback actions as buttons.

**Tech Stack:** TypeScript 6, React 19, Next.js 16 App Router, Vitest 5, Testing Library, XYFlow, existing browser SpeechSynthesis integration.

**Spec:** docs/superpowers/specs/2026-09-12-guided-playback-design.md

## Global Constraints

- Pause at every node; never advance automatically.
- Never choose a branch unless the user explicitly selects its arrow label or destination.
- Playback is transient and must not alter the graph, graph version, or undo history.
- User-facing messages use labels and never expose node or edge UUIDs.
- Core playback phrases run locally and consume no Gemini quota.
- Graph edits invalidate active playback with a reader-safe restart message.
- Keep button, keyboard, voice, visual, tactile, and outline behavior driven by the same playback state.
- Update README.md in every functional milestone.
- Commit every completed milestone separately with Shaurav Vora as the sole author; add no Co-Authored-By trailers.
- Do not push. The owner performs every remote push.
- Do not open the browser or capture screenshots. Give the owner manual visual checks and wait for their result.
- Work one task at a time and stop after its verification and commit.

## File map

### New files

- src/playback/types.ts — playback states, actions, route steps, and transition result types.
- src/playback/engine.ts — pure start, navigation, branch resolution, route history, warning, and invalidation rules.
- src/playback/engine.test.ts — state-machine behavior without React or browser dependencies.
- src/playback/PlaybackPanel.tsx — accessible controls and route status.
- src/playback/PlaybackPanel.test.tsx — panel semantics and button behavior.
- src/editor/playback-integration.test.tsx — coordinator, focus, history, and invalidation integration.
- src/commands/playback.test.ts — deterministic local playback phrases and playback precedence.

### Existing files

- src/editor/coordinator.ts — own playback state and expose playbackDispatch.
- src/editor/Editor.tsx — render PlaybackPanel, speak playback messages, and pass route state to the visual and tactile representations.
- src/commands/schema.ts — add the playback command envelope used by local speech.
- src/commands/fast-path.ts — recognize exact playback phrases using the existing local control vocabulary.
- src/commands/execute.ts — keep playback commands out of graph execution when no coordinator interception is available.
- src/commands/grammar.ts — document guaranteed playback phrases from the same data source as parser contract tests.
- src/server/gemini.ts — document playback commands in the structured prompt and reject an unspoken model branch.
- src/visual/VisualCanvas.tsx and a new src/visual/VisualCanvas.playback.test.tsx — style and verify traversed and current playback arrows and nodes.
- src/tactile/TactileSimulator.tsx and src/tactile/rasterize.ts — include playback entry-arrow context in tactile text.
- src/app/workspace.css — playback panel and route-state styles.
- src/app/docs/page.tsx — user-facing playback instructions.
- README.md — milestone status, behavior, and owner verification.
- Existing editor tests that mock VisualCanvas — keep the current canvas controls represented in their test doubles so the full suite returns to green.

---

### Task 1: Pure playback engine

**Files:**

- Create: src/playback/types.ts
- Create: src/playback/engine.ts
- Create: src/playback/engine.test.ts
- Modify: README.md

**Interfaces:**

- Consumes: FlowGraph from src/graph/types.ts and the editor graph version as a number.
- Produces: createPlaybackState(), playbackTransition(graph, state, action), PlaybackState, PlaybackAction, PlaybackRouteStep, and PlaybackChoice.

- [ ] **Step 1: Define the public playback types in the test**

Add tests that import the wished-for API and construct this linear graph:

~~~ts
const linear: FlowGraph = {
  schemaVersion: 1,
  nodes: [
    { id: "start", type: "start", label: "Begin" },
    { id: "work", type: "process", label: "Check details" },
    { id: "end", type: "end", label: "Finished" },
  ],
  edges: [
    { id: "a", source: "start", target: "work", label: "next" },
    { id: "b", source: "work", target: "end", label: "done" },
  ],
};
~~~

The first assertions must establish the contract:

~~~ts
let state = playbackTransition(linear, createPlaybackState(), { type: "start", graphVersion: 4 });
expect(state).toMatchObject({
  status: "paused",
  graphVersion: 4,
  currentNodeId: "start",
  route: [{ nodeId: "start", viaEdgeId: null }],
});

state = playbackTransition(linear, state, { type: "next", graphVersion: 4 });
expect(state.currentNodeId).toBe("work");
expect(state.status).toBe("paused");

state = playbackTransition(linear, state, { type: "next", graphVersion: 4 });
expect(state.currentNodeId).toBe("end");
expect(state.status).toBe("complete");
expect(state.route.map(step => step.nodeId)).toEqual(["start", "work", "end"]);
~~~

- [ ] **Step 2: Run the focused test and verify RED**

Run:

~~~powershell
node .tools/npm/package/bin/npm-cli.js test -- src/playback/engine.test.ts
~~~

Expected: FAIL because src/playback/engine.ts and src/playback/types.ts do not exist.

- [ ] **Step 3: Add state and action types**

Implement these exact public shapes:

~~~ts
export type PlaybackRouteStep = { nodeId: string; viaEdgeId: string | null };
export type PlaybackChoice = { id: string; label: string; destinationLabel: string };
export type PlaybackStatus =
  | "idle"
  | "choosing_start"
  | "paused"
  | "choosing_branch"
  | "complete"
  | "blocked";

export type PlaybackState = {
  status: PlaybackStatus;
  graphVersion: number | null;
  currentNodeId: string | null;
  route: PlaybackRouteStep[];
  choices: PlaybackChoice[];
  warnings: string[];
  message: string;
};

export type PlaybackAction =
  | { type: "start"; graphVersion: number }
  | { type: "choose_start"; nodeId: string; graphVersion: number }
  | { type: "next"; graphVersion: number }
  | { type: "choose_branch"; edgeId: string; graphVersion: number }
  | { type: "back"; graphVersion: number }
  | { type: "repeat"; graphVersion: number }
  | { type: "restart"; graphVersion: number }
  | { type: "stop"; graphVersion: number }
  | { type: "graph_changed"; graphVersion: number };
~~~

- [ ] **Step 4: Implement the minimal linear transition path**

Use stable graph order by ID. Keep all labels resolved at transition time. createPlaybackState() must return a fresh idle object. Starting with one Start calls enterNode(), Next with one edge appends a route step, and entering End sets status to complete.

~~~ts
export function createPlaybackState(): PlaybackState {
  return {
    status: "idle",
    graphVersion: null,
    currentNodeId: null,
    route: [],
    choices: [],
    warnings: [],
    message: "No chart test is running.",
  };
}

function enterNode(
  graph: FlowGraph,
  state: PlaybackState,
  nodeId: string,
  viaEdgeId: string | null,
): PlaybackState {
  const node = graph.nodes.find(item => item.id === nodeId);
  if (!node) return { ...state, status: "blocked", message: "The chart changed. Restart the test to use the updated structure." };
  const route = [...state.route, { nodeId, viaEdgeId }];
  return {
    ...state,
    status: node.type === "end" ? "complete" : "paused",
    currentNodeId: node.id,
    route,
    choices: [],
    message: node.type === "end" ? "Reached " + node.label + ". Test complete." : node.label + ". Ready for the next step.",
  };
}
~~~

- [ ] **Step 5: Add edge-case tests before each implementation**

Add separate failing tests, run each to see its intended failure, then implement:

- Empty graph and graph without Start return blocked with “Add a Start node before testing.”
- Multiple Starts return choosing_start with labelled choices and no selected current node.
- Next with multiple outgoing arrows returns choosing_branch and does not change route.
- choose_branch accepts only an edge ID in state.choices.
- Unlabelled choices use “Unlabelled to Destination”; duplicate labels include destination labels.
- Back pops the actual route and returns to the preceding recorded node.
- A non-End dead end returns blocked without dropping the route.
- Entering an already visited node reports “Loop detected at Label.” and retains the repeated route step.
- Missing End and unreachable nodes appear in warnings using labels only.
- Any action whose graphVersion differs from state.graphVersion returns blocked with the graph-changed message.
- Stop returns a fresh idle state; Restart re-runs Start discovery on the current graph.
- Repeat returns an equivalent state with a fresh current-node message.

The branch test must include:

~~~ts
const choice = playbackTransition(branching, started, { type: "next", graphVersion: 1 });
expect(choice.status).toBe("choosing_branch");
expect(choice.currentNodeId).toBe("decision");
expect(choice.route).toEqual(started.route);
expect(choice.choices.map(item => item.label)).toEqual(["No to Reject", "Yes to Approve"]);
~~~

- [ ] **Step 6: Run focused and adjacent graph tests**

Run:

~~~powershell
node .tools/npm/package/bin/npm-cli.js test -- src/playback/engine.test.ts src/commands/walk.test.ts src/graph/queries.test.ts
node .tools/npm/package/bin/npm-cli.js run typecheck
node .tools/npm/package/bin/npm-cli.js run lint
~~~

Expected: all named tests, typecheck, and lint pass.

- [ ] **Step 7: Update README and commit**

Add a “Guided playback — engine milestone” section stating that the pure engine records routes, pauses at every node, refuses branch guessing, detects loops/dead ends, and has no UI yet. Include the focused test command.

Commit only these files:

~~~powershell
git add README.md src/playback/types.ts src/playback/engine.ts src/playback/engine.test.ts
git commit -m "feat: add guided playback engine"
git show --format=fuller --stat HEAD
~~~

Confirm the commit contains no Co-Authored-By trailer and do not push.

- [ ] **Step 8: Owner checkpoint**

Tell the owner there is no visual change in this milestone. Ask them to run the focused test command and confirm it passes before Task 2 begins.

---

### Task 2: Playback controls and focus synchronization

**Files:**

- Create: src/playback/PlaybackPanel.tsx
- Create: src/playback/PlaybackPanel.test.tsx
- Create: src/editor/playback-integration.test.tsx
- Modify: src/editor/coordinator.ts
- Modify: src/editor/Editor.tsx
- Modify: src/app/workspace.css
- Modify: src/editor/delete-shortcut.test.tsx
- Modify: src/editor/speech-regressions.test.tsx
- Modify: README.md

**Interfaces:**

- Consumes: playbackTransition(), PlaybackState, PlaybackAction, coordinator editor graph and version.
- Produces: coordinator.playbackDispatch(action), snapshot.playback, and PlaybackPanel props state, graph, onAction.

- [ ] **Step 1: Write coordinator integration tests**

Assert that playback starts at Begin, synchronizes focusedNodeId, and leaves version and history unchanged:

~~~ts
const coordinator = createEditorCoordinator();
coordinator.dispatch({ type: "command", idSeed: "a", command: { kind: "add_node", type: "start", label: "Begin", placement: null } });
const before = coordinator.getSnapshot().editor.engine;
coordinator.playbackDispatch({ type: "start", graphVersion: before.version });
const after = coordinator.getSnapshot();
expect(after.playback.currentNodeId).toBe(after.editor.engine.focusedNodeId);
expect(after.editor.engine.version).toBe(before.version);
expect(after.editor.engine.history).toEqual(before.history);
~~~

Also test that a committed edit during playback changes graph version and sets playback to blocked with the graph-changed message.

- [ ] **Step 2: Run integration tests and verify RED**

Run:

~~~powershell
node .tools/npm/package/bin/npm-cli.js test -- src/editor/playback-integration.test.tsx
~~~

Expected: FAIL because playbackDispatch and snapshot.playback do not exist.

- [ ] **Step 3: Add coordinator ownership**

Initialize coordinator state with createPlaybackState(). playbackDispatch calls playbackTransition() against the current graph and version. When currentNodeId changes, update focus through the existing focus command without changing graph history:

~~~ts
const playbackDispatch = (action: PlaybackAction) => {
  const playback = playbackTransition(state.editor.engine.graph, state.playback, action);
  let editor = state.editor;
  if (playback.currentNodeId && playback.currentNodeId !== editor.engine.focusedNodeId) {
    editor = editorReducer(editor, {
      type: "command",
      idSeed: crypto.randomUUID(),
      command: { kind: "focus", node: { kind: "id", value: playback.currentNodeId } },
    });
  }
  state = { ...state, editor, playback, presentation: null };
  publish();
};
~~~

After an ordinary dispatch, compare the previous and next graph version. If it changed while playback is active, transition with graph_changed before publishing.

- [ ] **Step 4: Write PlaybackPanel component tests**

Test native control names and state-driven behavior:

~~~ts
expect(screen.getByRole("region", { name: "Test chart" })).toBeVisible();
fireEvent.click(screen.getByRole("button", { name: "Test chart" }));
expect(onAction).toHaveBeenCalledWith({ type: "start", graphVersion: 3 });

fireEvent.click(screen.getByRole("button", { name: "Next step" }));
expect(onAction).toHaveBeenCalledWith({ type: "next", graphVersion: 3 });
~~~

Verify branch buttons are named “Take Yes to Approve”, Back is disabled at the first node, Repeat and Stop remain available while paused, and Restart is available after completion or blockage.

- [ ] **Step 5: Implement PlaybackPanel and editor rendering**

PlaybackPanel receives:

~~~ts
type PlaybackPanelProps = {
  graph: FlowGraph;
  graphVersion: number;
  state: PlaybackState;
  onAction: (action: PlaybackAction) => void;
};
~~~

Render a named section, one status paragraph, warnings list, route progress, branch buttons, and native controls. In Editor.tsx, render it below the workspace deck and pass coordinator.playbackDispatch. Use playback.message as the spoken message while playback is active, while preserving the existing live-region/TTS exclusivity.

- [ ] **Step 6: Add panel styling**

Add scoped classes:

~~~css
#workspace .playback-panel {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-left: 4px solid var(--accent);
  border-radius: 8px;
  background: #fff;
}
#workspace .playback-actions,
#workspace .playback-choices {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
~~~

Use existing focus and button tokens. Do not introduce color-only status.

- [ ] **Step 7: Repair current VisualCanvas test doubles**

The existing delete and speech regression tests mock VisualCanvas as null even though Undo and Where am I now live inside it. Replace those mocks with a small test double that renders buttons wired to onUndo and onWalk("stay"). This restores the two known baseline failures without changing production behavior.

- [ ] **Step 8: Verify and document**

Run:

~~~powershell
node .tools/npm/package/bin/npm-cli.js test -- src/playback/PlaybackPanel.test.tsx src/editor/playback-integration.test.tsx src/editor/delete-shortcut.test.tsx src/editor/speech-regressions.test.tsx
node .tools/npm/package/bin/npm-cli.js test
node .tools/npm/package/bin/npm-cli.js run typecheck
node .tools/npm/package/bin/npm-cli.js run lint
node .tools/npm/package/bin/npm-cli.js run build
~~~

Update README with the new Test chart panel, exact control behavior, and a manual check. Commit:

~~~powershell
git add README.md src/playback/PlaybackPanel.tsx src/playback/PlaybackPanel.test.tsx src/editor/playback-integration.test.tsx src/editor/coordinator.ts src/editor/Editor.tsx src/app/workspace.css src/editor/delete-shortcut.test.tsx src/editor/speech-regressions.test.tsx
git commit -m "feat: add guided playback controls"
git show --format=fuller --stat HEAD
~~~

- [ ] **Step 9: Owner visual checkpoint**

Ask the owner to create Start → Process → End, choose Test chart, and verify: the panel opens at Start; Next pauses at Process; Back returns to Start; Next reaches End; controls remain keyboard reachable; no browser screenshot is taken by the agent. Stop until the owner confirms.

---

### Task 3: Deterministic local voice integration

**Files:**

- Create: src/commands/playback.test.ts
- Modify: src/commands/schema.ts
- Modify: src/commands/fast-path.ts
- Modify: src/commands/grammar.ts
- Modify: src/editor/coordinator.ts
- Modify: src/commands/execute.ts
- Modify: src/server/gemini.ts
- Modify: README.md

**Interfaces:**

- Consumes: coordinator playbackDispatch and existing parseLocal/TurnCoordinator command application.
- Produces: GraphCommand playback variant and coordinator translation from spoken choice to internal edge/start IDs.

- [ ] **Step 1: Add failing parser and routing tests**

Define the command shape:

~~~ts
{
  kind: "playback",
  action: "start" | "stop" | "restart" | "repeat" | "choose",
  choice: string | null
}
~~~

Assert:

~~~ts
expect(parseLocal("Start test")).toEqual({ kind: "playback", action: "start", choice: null });
expect(parseLocal("Test chart")).toEqual({ kind: "playback", action: "start", choice: null });
expect(parseLocal("Take yes")).toEqual({ kind: "walk", direction: "next", branch: "yes" });
expect(parseLocal("Stop test")).toEqual({ kind: "playback", action: "stop", choice: null });
~~~

At coordinator level, while playback is active, existing walk next/back/stay commands must dispatch playback next/back/repeat. A walk command with branch text must resolve exactly against current playback choices. Outside playback, the same walk commands retain existing navigation behavior.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

~~~powershell
node .tools/npm/package/bin/npm-cli.js test -- src/commands/playback.test.ts
~~~

Expected: FAIL because playback commands are absent from the schema and parser.

- [ ] **Step 3: Extend schema and local parsing**

Add one strict playback variant to commandSchema. Add exact local rules for start test, test chart, stop test, restart test, and repeat. Keep next, back, and take branch mapped to their existing walk commands so non-playback behavior remains compatible.

Add a Playback section to grammar.ts with the exact forms and examples, so the existing grammar contract runs each phrase in plain and dictated form. parseLocal in local.ts already calls parseControl from fast-path.ts first and needs no structural change.

- [ ] **Step 4: Intercept playback commands in the coordinator**

Before sending a GraphCommand to editorReducer:

- Translate the playback command variant to start, stop, restart, or repeat.
- While playback is active, translate walk next, back, and stay to playback actions.
- Resolve walk.branch against current choices by normalized arrow label first, then destination label.
- On zero matches, retain playback state and report “No branch here is called Label.”
- On multiple matches, report each label plus destination and wait for a more specific choice.
- Outside playback, pass walk through unchanged.

execute() must return a reader-safe “Start Test chart mode first.” error if a playback command reaches the graph engine without coordinator interception.

- [ ] **Step 5: Constrain model-produced playback**

Update the server prompt so Gemini may express start, stop, restart, and repeat, but may not produce a playback branch choice unless the transcript contains the chosen arrow label or destination. Reuse the existing transcript guard that rejects unspoken walk branches for playback choices.

- [ ] **Step 6: Verify no Gemini call for core phrases**

Use a mocked interpreter and assert its call count remains zero for every documented playback phrase. Verify ambiguous natural language still reaches the model only when no local rule matches.

Run:

~~~powershell
node .tools/npm/package/bin/npm-cli.js test -- src/commands/playback.test.ts src/commands/grammar.test.ts src/streaming/turns.test.ts src/server/gemini.test.ts
node .tools/npm/package/bin/npm-cli.js run typecheck
node .tools/npm/package/bin/npm-cli.js run lint
~~~

- [ ] **Step 7: Update README and commit**

Document exact spoken forms, local-command badges, branch safety, and brief replies. Commit only Task 3 files:

~~~powershell
git add README.md src/commands/playback.test.ts src/commands/schema.ts src/commands/fast-path.ts src/commands/grammar.ts src/editor/coordinator.ts src/commands/execute.ts src/server/gemini.ts
git commit -m "feat: control chart playback by voice"
git show --format=fuller --stat HEAD
~~~

- [ ] **Step 8: Owner voice checkpoint**

Ask the owner to start voice and say: “test chart”, “next”, “take yes”, “repeat”, “back”, and “stop test”. They confirm every phrase shows Local command, focus and playback move together, and no UUID is spoken. Stop until confirmed.

---

### Task 4: Multimodal route feedback

**Files:**

- Modify: src/visual/VisualCanvas.tsx
- Create: src/visual/VisualCanvas.playback.test.tsx
- Modify: src/tactile/TactileSimulator.tsx
- Modify: src/tactile/rasterize.ts
- Modify: src/tactile/types.ts
- Modify: src/tactile/renderer.test.ts
- Modify: src/editor/Editor.tsx
- Modify: src/app/workspace.css
- Modify: README.md

**Interfaces:**

- Consumes: PlaybackState.route, currentNodeId, and each route step viaEdgeId.
- Produces: VisualCanvas playbackRoute prop and tactile playbackContext prop.

- [ ] **Step 1: Write failing visual route tests**

Pass this route:

~~~ts
const playbackRoute = [
  { nodeId: "start", viaEdgeId: null },
  { nodeId: "review", viaEdgeId: "start-review" },
];
~~~

Assert the start-review edge has data-playback-state="current", earlier route edges use "visited", and unrelated edges have no playback state. Verify accessible edge names still identify source, destination, and label without depending on color.

- [ ] **Step 2: Write failing tactile context tests**

Call makeTactileFrame with playback context:

~~~ts
{
  active: true,
  enteredByEdgeId: "start-review",
  routePosition: 2,
}
~~~

Expect frame.text to begin “Testing step 2 Review process Entered by next from Begin” and frame.brailleCells to equal toBraille(frame.text).cells.

- [ ] **Step 3: Run focused tests and verify RED**

Run:

~~~powershell
node .tools/npm/package/bin/npm-cli.js test -- src/visual/VisualCanvas.playback.test.tsx src/tactile/renderer.test.ts
~~~

Expected: FAIL because the route and tactile playback props do not exist.

- [ ] **Step 4: Render visual route state**

Add to VisualCanvasProps:

~~~ts
playbackRoute?: PlaybackRouteStep[];
~~~

Map edge IDs to visited/current status. Pass `className="playback-edge is-visited"` or `className="playback-edge is-current"` to BaseEdge and select stroke/dash tokens from that status. Keep selected-arrow styling strongest and keep marker color synchronized. Add a non-color cue: visited edges use a wider solid stroke and the current edge uses a wider dashed stroke.

- [ ] **Step 5: Add tactile entry context**

Extend makeTactileFrame with an optional PlaybackTactileContext. Prefix focused text only while playback is active. Resolve enteredByEdgeId to its label and source node label; omit “Entered by” at the first route node. Do not put route state into the semantic graph.

- [ ] **Step 6: Add outline route summary**

In Editor, render an ordered list from playback.route using labels. Mark the current item with aria-current="step". Completed playback retains this list. No UUID may appear in list text or accessible names.

- [ ] **Step 7: Verify and document**

Run:

~~~powershell
node .tools/npm/package/bin/npm-cli.js test -- src/visual/VisualCanvas.playback.test.tsx src/tactile/renderer.test.ts src/editor/playback-integration.test.tsx
node .tools/npm/package/bin/npm-cli.js test
node .tools/npm/package/bin/npm-cli.js run typecheck
node .tools/npm/package/bin/npm-cli.js run lint
node .tools/npm/package/bin/npm-cli.js run build
~~~

Update README with visual, tactile, and outline behavior plus manual checks. Commit:

~~~powershell
git add README.md src/visual/VisualCanvas.tsx src/visual/VisualCanvas.playback.test.tsx src/tactile/TactileSimulator.tsx src/tactile/rasterize.ts src/tactile/types.ts src/tactile/renderer.test.ts src/editor/Editor.tsx src/app/workspace.css
git commit -m "feat: show playback route across chart views"
git show --format=fuller --stat HEAD
~~~

- [ ] **Step 8: Owner multimodal checkpoint**

Ask the owner to test a decision with Yes and No branches. They verify the chosen route is visibly distinct, the current step is announced in the panel and outline, the tactile strip includes the incoming arrow label, Back removes the last route highlight, and completion retains the route. The agent does not open the browser.

---

### Task 5: Documentation and accessibility verification

**Files:**

- Modify: src/app/docs/page.tsx
- Modify: src/commands/grammar.ts
- Modify: README.md
- Modify: public/braille/koi-charts-guide-ueb-grade-1.brf
- Modify: public/braille/koi-charts-guide-ueb-grade-2.brf
- Modify: src/app/docs/page.test.tsx

**Interfaces:**

- Consumes: final playback controls and grammar from Tasks 1–4.
- Produces: complete user documentation, regenerated Braille command guide, and final verification evidence.

- [ ] **Step 1: Add documentation contract tests**

Assert the Documentation page names Test chart, pause-at-every-node behavior, branch labels, keyboard operation, voice phrases, loop/dead-end messages, and stopping/restarting. Assert grammar examples still parse locally.

- [ ] **Step 2: Run documentation tests and verify RED**

Run the specific documentation and grammar tests. Expected: FAIL until the final documentation text is present.

- [ ] **Step 3: Write final Documentation and README sections**

Document:

- Purpose: verification and walkthrough, not chart generation.
- How to start, advance, go back, choose branches, repeat, restart, and stop.
- How missing labels, dead ends, loops, unreachable nodes, and chart edits are reported.
- Exact local voice phrases and the fact that they do not consume Gemini quota.
- How visual route state, tactile entry context, and outline route agree.
- Keyboard and screen-reader operation.
- A concise owner acceptance procedure.

- [ ] **Step 4: Regenerate Braille command guides**

Run:

~~~powershell
node .tools/npm/package/bin/npm-cli.js run braille
~~~

Review only the generated guide diff. Confirm the playback phrases appear in both Grade 1 and Grade 2 outputs and no unrelated generated files are staged.

- [ ] **Step 5: Run final verification**

Run:

~~~powershell
node .tools/npm/package/bin/npm-cli.js test
node .tools/npm/package/bin/npm-cli.js run typecheck
node .tools/npm/package/bin/npm-cli.js run lint
node .tools/npm/package/bin/npm-cli.js run build
git diff --check
~~~

Expected: zero test failures, zero lint warnings, successful typecheck and build, and no whitespace errors.

- [ ] **Step 6: Commit documentation milestone**

~~~powershell
git add README.md src/app/docs/page.tsx src/app/docs/page.test.tsx src/commands/grammar.ts public/braille/koi-charts-guide-ueb-grade-1.brf public/braille/koi-charts-guide-ueb-grade-2.brf
git commit -m "docs: publish guided playback instructions"
git show --format=fuller --stat HEAD
git status --short
~~~

Confirm sole authorship, no co-author trailer, no push, and a clean working tree.

- [ ] **Step 7: Owner final acceptance**

Give the owner a manual script covering linear playback, a labelled decision, an unlabelled branch, a dead end, a loop, Back, Repeat, Stop, a graph edit during playback, voice controls, keyboard-only controls, tactile text, and route summary. Wait for their visual and assistive-technology results. The owner performs the final push after acceptance.
