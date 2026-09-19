# Editable Koi Project Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save a versioned editable `.koi` project, reopen it as one undoable replacement, and control save, open preparation, and deletion confirmation with exact local voice phrases.

**Architecture:** A pure project-file boundary serializes and validates a strict JSON envelope. The editor reducer owns the atomic history transaction, while compact project controls own downloads and the native file input. Project voice actions remain outside the provider command schema and call the same controls used by keyboard and pointer input.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Zod 4, Vitest 5, Testing Library, and the existing Koi graph/history modules.

**Spec:** `docs/superpowers/specs/2026-09-19-editable-koi-project-files-design.md`

## Global Constraints

- Complete, verify, document, and commit one checkpoint before starting the next.
- Use Shaurav Vora as sole author; add no co-author trailers.
- A project is UTF-8 JSON with extension `.koi` and MIME `application/vnd.koi-chart+json`.
- The strict envelope contains only `format: "koi-chart"`, `formatVersion: 1`, normalized ISO `savedAt`, and `graph`.
- Reject files over 2 MiB before decoding; validate everything before changing state.
- Failed imports preserve all graph and interface state.
- Successful import is one undoable edit; Undo restores the prior graph and focus.
- Project files exclude credentials, preferences, transcripts, speech data, history, provider output, playback, audit, and temporary selection.
- Controls remain in the Visual flowchart heading and add no workspace row.
- Exact project and confirmation phrases stay local and never call Gemini.
- Voice Open focuses the visible button and requests Enter; it never opens the picker from a speech callback.
- Update README for every functional checkpoint.
- Exclude generated `next-env.d.ts` from feature commits.

---

### Task 1: Versioned project format

**Files:**
- Create: `src/projects/types.ts`
- Create: `src/projects/koi-file.ts`
- Create: `src/projects/koi-file.test.ts`
- Modify: `README.md`

**Interfaces:**
- `KOI_MIME_TYPE = "application/vnd.koi-chart+json"`
- `MAX_KOI_FILE_BYTES = 2 * 1024 * 1024`
- `KoiProjectV1 = { format: "koi-chart"; formatVersion: 1; savedAt: string; graph: FlowGraph }`
- `KoiFileErrorCode = "too_large" | "invalid_json" | "wrong_format" | "unsupported_version" | "invalid_project"`
- `serializeKoiProject(graph: FlowGraph, now?: Date): string`
- `parseKoiProject(bytes: ArrayBuffer): FlowGraph`
- `koiProjectFilename(now?: Date): string`

- [ ] **Step 1: Write failing round-trip and boundary tests**

Use a graph containing position, placement, and a labelled edge:

```ts
it("round-trips the editable graph in a strict envelope", () => {
  const text = serializeKoiProject(graph, new Date("2026-09-19T12:00:00.000Z"));
  expect(JSON.parse(text)).toEqual({
    format: "koi-chart",
    formatVersion: 1,
    savedAt: "2026-09-19T12:00:00.000Z",
    graph,
  });
  expect(text.endsWith("\n")).toBe(true);
  const restored = parseKoiProject(new TextEncoder().encode(text).buffer);
  expect(restored).toEqual(graph);
  expect(restored).not.toBe(graph);
});
```

Add explicit cases for oversized bytes, invalid UTF-8, malformed JSON, extra envelope fields, wrong format, unsupported version, invalid timestamp, duplicate IDs, missing endpoints, self-edges, and mutation isolation.

- [ ] **Step 2: Run RED**

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/projects/koi-file.test.ts
```

Expected: missing project modules.

- [ ] **Step 3: Implement types and public errors**

Map codes to exact messages: too large, unreadable file, non-Koi file, unsupported version, and invalid chart. Define a `KoiFileError` with readonly `code`.

- [ ] **Step 4: Implement parsing and serialization**

Check byte size first. Decode with `TextDecoder("utf-8", { fatal: true })`. Parse a strict Zod envelope with `graph: z.unknown()`. Distinguish wrong format and version before graph validation. Require `savedAt === new Date(savedAt).toISOString()`. Call `assertGraph`, clone the graph, serialize with two-space indentation plus one trailing newline, and generate `koi-chart-YYYY-MM-DD-HHMMSS.koi`.

- [ ] **Step 5: Verify**

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/projects/koi-file.test.ts src/graph/invariants.test.ts
node .tools/npm/package/bin/npm-cli.js run typecheck
```

- [ ] **Step 6: Document and commit**

README describes the envelope, local processing, 2 MiB limit, exclusions, and that UI arrives later.

```powershell
git add src/projects/types.ts src/projects/koi-file.ts src/projects/koi-file.test.ts README.md
git commit -m "feat: define editable Koi project format"
```

**Owner check:** Run the focused tests. This checkpoint has no visual change.

---

### Task 2: Undoable import transaction

**Files:**
- Create: `src/editor/import-project.test.ts`
- Modify: `src/editor/reducer.ts`
- Modify: `src/editor/coordinator.ts`
- Modify: `src/editor/Editor.tsx`
- Modify: `src/visual/VisualCanvas.tsx`
- Modify: `README.md`

**Interfaces:**
- Editor action: `{ type: "import_project"; graph: FlowGraph; filename: string }`
- Coordinator method: `importProject(graph: FlowGraph, filename: string): CommandResult`
- VisualCanvas prop: `selectionResetKey?: number`

- [ ] **Step 1: Write failing reducer tests**

```ts
const imported = editorReducer(current, {
  type: "import_project",
  graph: importedGraph,
  filename: "checkout-flow.koi",
});
expect(imported.engine.graph).toEqual(importedGraph);
expect(imported.engine.graph).not.toBe(importedGraph);
expect(imported.engine.focusedNodeId).toBe("imported-start");
expect(imported.engine.pending).toBeNull();
expect(imported.engine.version).toBe(current.engine.version + 1);
```

Assert first Start focus, first-node fallback, empty graph focus, singular/plural message, one-step Undo restoration, and Redo re-import.

- [ ] **Step 2: Write failing coordinator tests**

Start playback and audit, call `importProject`, and assert playback idle, audit closed, presentation cleared, and one committed version change.

- [ ] **Step 3: Run RED**

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/editor/import-project.test.ts
```

- [ ] **Step 4: Implement the reducer transaction**

Validate and clone before commit. Focus first Start or first node, set recent focus, call existing `commit`, preserve and extend display IDs, clear pending via commit, and create:

`Loaded 2 shapes and 1 connection from checkout-flow.koi. Undo restores your previous chart.`

Sanitize the displayed basename. On boundary failure, return original state with an error outcome.

- [ ] **Step 5: Implement coordinator cleanup**

Add `importProject`. Reset playback and audit only after a committed import, publish once, and return the standard result.

- [ ] **Step 6: Clear canvas overlays**

Increment an Editor `selectionResetKey` after successful import. VisualCanvas watches it and clears selected edge, dropped-connection chooser, multi-selection callbacks, and inspection refs without announcing a second selection message. Test reused edge IDs.

- [ ] **Step 7: Verify, document, and commit**

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/editor/import-project.test.ts src/editor/delete-shortcut.test.tsx src/editor/playback-integration.test.tsx
node .tools/npm/package/bin/npm-cli.js run typecheck
node .tools/npm/package/bin/npm-cli.js run lint
git add src/editor/import-project.test.ts src/editor/reducer.ts src/editor/coordinator.ts src/editor/Editor.tsx src/visual/VisualCanvas.tsx README.md
git commit -m "feat: make project imports undoable"
```

README explains replacement, transient-mode closure, Undo, and that the picker arrives next.

**Owner check:** Run the focused tests; no picker is visible yet.

---

### Task 3: Compact project controls

**Files:**
- Create: `src/projects/ProjectControls.tsx`
- Create: `src/projects/ProjectControls.test.tsx`
- Modify: `src/visual/ExportMenu.tsx`
- Modify: `src/visual/ExportMenu.test.tsx`
- Modify: `src/editor/Editor.tsx`
- Modify: `src/app/globals.css`
- Modify: `README.md`

**Interfaces:**

```ts
export type ProjectAction = "save" | "open";
export type ProjectActionResult = { outcome: "committed" | "error"; message: string };
export type ProjectControlsHandle = {
  run(action: ProjectAction): Promise<ProjectActionResult>;
};
```

Props are `graph`, `onImport(graph, filename)`, and `onResult(result)`.

- [ ] **Step 1: Write failing component tests**

Assert Save works for an empty graph, downloads the correct MIME and extension, Open exposes `accept=".koi,application/vnd.koi-chart+json"`, valid input calls import once, invalid/oversized input preserves state, value resets after each selection, cancel is silent, imperative Open focuses the visible button, and imperative Save uses the same download path.

- [ ] **Step 2: Run RED**

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/projects/ProjectControls.test.tsx
```

- [ ] **Step 3: Implement controls**

Use `forwardRef` and `useImperativeHandle`. The visible Open button calls the hidden input only from its click handler. Imperative Open focuses that button and returns "Open project ready. Press Enter to choose a Koi file." Save serializes and downloads synchronously. Import checks size, reads `arrayBuffer()`, parses, imports only after success, and clears input value in `finally`.

Keep one announcement path: a visible Save click awaits `run("save")` and sends that result to `onResult`; a voice Save returns the same result to TurnCoordinator, which announces it. A valid import calls `onImport`, whose coordinator publication is authoritative. Parse and read failures call `onResult`. Do not call `onResult` again after a successful `onImport`, and add no live region.

- [ ] **Step 4: Integrate without a new row**

Give ExportMenu a `projectControls: ReactNode` slot before image buttons and label the group "Project and image exports". Editor connects import to `coordinator.importProject` and status to the existing feedback path. CSS wraps controls only inside the existing heading and retains 44-pixel mobile targets.

- [ ] **Step 5: Extend regressions**

Assert Save/Open appear with SVG/PNG/JPEG/PDF. Image buttons stay disabled for an empty chart while Save remains enabled. Add an Editor test that imports, reports once, then Undo restores the old chart.

- [ ] **Step 6: Verify, document, and commit**

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/projects/ProjectControls.test.tsx src/visual/ExportMenu.test.tsx src/editor/import-project.test.ts
node .tools/npm/package/bin/npm-cli.js run typecheck
node .tools/npm/package/bin/npm-cli.js run lint
git add src/projects/ProjectControls.tsx src/projects/ProjectControls.test.tsx src/visual/ExportMenu.tsx src/visual/ExportMenu.test.tsx src/editor/Editor.tsx src/app/globals.css README.md
git commit -m "feat: add editable project controls"
```

README distinguishes editable `.koi` from image/PDF sharing.

**Owner check:** Save a chart, alter it, reopen the file, Undo, Redo, and repeat with an empty project.

---

### Task 4: Local project voice and confirm-delete phrases

**Files:**
- Create: `src/commands/project-controls.test.ts`
- Modify: `src/commands/fast-path.ts`
- Modify: `src/commands/fast-path.test.ts`
- Modify: `src/commands/grammar.ts`
- Modify: `src/streaming/turns.ts`
- Modify: `src/streaming/turns.test.ts`
- Modify: `src/editor/coordinator.ts`
- Modify: `src/editor/Editor.tsx`
- Modify: `src/commands/execute.ts`
- Modify: `src/editor/speech-regressions.test.tsx`
- Modify: `README.md`

**Interfaces:**
- `parseProjectControl(text: string): ProjectAction | null`
- TurnCoordinator option `runProject?: (action: ProjectAction) => Promise<ProjectActionResult> | ProjectActionResult`

- [ ] **Step 1: Write failing parser tests**

```ts
it.each([
  ["save project", "save"], ["export project", "save"], ["download project", "save"],
  ["open project", "open"], ["import project", "open"], ["load project", "open"],
] as const)("routes %s locally", (phrase, action) => {
  expect(parseProjectControl(phrase)).toBe(action);
});
```

Assert `confirm delete`, `confirm deletion`, and `yes, delete it` map exactly to Confirm. Assert "confirm delete process" and "export this project to PDF" do not trigger.

- [ ] **Step 2: Write failing coordinator tests**

Prove project phrases call `runProject`, never call `interpret`, remain local when Fast local is off, and present one result. Prove all confirmation phrases use the prepared deletion and no pending deletion says "There is no deletion to confirm."

- [ ] **Step 3: Run RED**

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/commands/project-controls.test.ts src/streaming/turns.test.ts
```

- [ ] **Step 4: Implement project controls outside provider schema**

Add a separate exact `parseProjectControl` table using the existing punctuation cleanup. Do not add project actions to Zod or JSON provider schemas. TurnCoordinator checks project phrases before graph controls, awaits `runProject`, preserves generation checks, presents source `local`, and returns before interpretation.

- [ ] **Step 5: Wire the shared handle**

Editor supplies `runProject` by calling the current ProjectControls handle. If unavailable, return `{ outcome: "error", message: "Project controls are unavailable." }`. Visible buttons and voice use the same methods.

- [ ] **Step 6: Implement safe deletion phrases**

Add the three exact-only phrases to `parseControl`. Change executor copy from "No deletion to confirm." to "There is no deletion to confirm." Add grammar examples for the documentation and Braille generator.

- [ ] **Step 7: Verify, document, and commit**

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/commands/project-controls.test.ts src/commands/fast-path.test.ts src/streaming/turns.test.ts src/editor/speech-regressions.test.tsx
node .tools/npm/package/bin/npm-cli.js run typecheck
node .tools/npm/package/bin/npm-cli.js run lint
git add src/commands/project-controls.test.ts src/commands/fast-path.ts src/commands/fast-path.test.ts src/commands/grammar.ts src/streaming/turns.ts src/streaming/turns.test.ts src/editor/coordinator.ts src/editor/Editor.tsx src/commands/execute.ts src/editor/speech-regressions.test.tsx README.md
git commit -m "feat: add local project voice controls"
```

README lists phrases and explains the Enter requirement.

**Owner check:** Say Save project, Open project, and Confirm delete; confirm Gemini is not used.

---

### Task 5: Documentation and acceptance

**Files:**
- Modify: `src/app/docs/page.tsx`
- Modify: `src/app/docs/page.test.tsx`
- Modify: `src/app/docs/documentation.css` only if the current export section needs responsive adjustment
- Modify: `README.md`
- Modify: `public/braille/koi-commands-grade1.brf`
- Modify: `public/braille/koi-commands-grade2.brf`

- [ ] **Step 1: Write failing documentation contracts**

Require the Exporting charts section to mention Save project, Open project, editable `.koi` JSON, Undo, browser-local processing, credential exclusion, image/PDF distinction, voice save, voice-assisted open with Enter, and Confirm delete.

- [ ] **Step 2: Run RED**

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/app/docs/page.test.tsx
```

- [ ] **Step 3: Rewrite the existing export section**

Use three task-based subsections: Continue editing later, Open a saved project, and Share a non-editable copy. Include the 2 MiB limit, replacement/Undo behavior, privacy boundary, and voice/Enter constraint. Add no new page or navigation group.

- [ ] **Step 4: Regenerate Braille references**

```powershell
node .tools/npm/package/bin/npm-cli.js run braille
```

Inspect both grades for Save project, Open project, and Confirm delete.

- [ ] **Step 5: Run complete verification**

```powershell
node .tools/npm/package/bin/npm-cli.js test
node .tools/npm/package/bin/npm-cli.js run typecheck
node .tools/npm/package/bin/npm-cli.js run lint
node .tools/npm/package/bin/npm-cli.js run build
git diff --check
```

- [ ] **Step 6: Owner acceptance**

Verify valid, empty, malformed, wrong-format, and unsupported-version files; Undo/Redo; Tab/Enter operation; all new voice phrases; one spoken result; and unchanged SVG/PNG/JPEG/PDF export. Record only observed manual checks in README.

- [ ] **Step 7: Commit**

```powershell
git add src/app/docs/page.tsx src/app/docs/page.test.tsx src/app/docs/documentation.css README.md public/braille/koi-commands-grade1.brf public/braille/koi-commands-grade2.brf
git commit -m "docs: complete editable project workflow"
```

**Owner check:** Review documentation and repeat the acceptance sequence before the final push.
