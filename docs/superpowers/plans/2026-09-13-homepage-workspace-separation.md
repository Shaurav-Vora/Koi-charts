# Homepage and Workspace Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the editor at `/` with a professional Koi Charts homepage and move the full editor to `/workspace`.

**Architecture:** The root page becomes a static server-rendered marketing page composed of focused homepage sections. The existing editor page shell moves intact to the `workspace` route, while the shared header gains explicit Home, Workspace, and Documentation states. Future workflow persistence can extend the workspace route without coupling database state to the homepage.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript 6, CSS, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-13-homepage-workspace-separation-design.md`

## Global Constraints

- Keep the editor state model and command behavior unchanged.
- Use `next/link` for internal route navigation.
- Keep the existing Segoe UI font stack and Koi Charts navy, orange, blue, mist, and white palette.
- Do not add database, authentication, workflow-saving, pricing, testimonials, or fabricated statistics.
- Preserve keyboard focus visibility, semantic landmarks, reduced-motion support, and single-column mobile reading order.
- Commit each verified milestone without co-author trailers.
- Do not stage `docs/superpowers/specs/2026-09-12-guided-playback-design.md`.

---

### Task 1: Separate the Homepage and Workspace Routes

**Files:**
- Create: `src/app/workspace/page.tsx`
- Create: `src/app/workspace/page.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/app/AppHeader.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/workspace.css`

**Interfaces:**
- Consumes: `Editor`, `AppHeader`, and the existing workspace shell.
- Produces: public route `/`, editor route `/workspace`, and `AppHeader({ page: "home" | "workspace" | "documentation" })`.

- [ ] **Step 1: Move the existing editor-shell contract to the workspace route**

Create `src/app/workspace/page.test.tsx` from the existing `src/app/page.test.tsx`, update the page import to `./page`, and keep assertions for the editor, tactile display, voice status, skip link, and workspace shortcuts.

- [ ] **Step 2: Add the failing homepage contract**

Replace `src/app/page.test.tsx` with assertions for:
- one `h1` named “Flowcharts everyone can follow.”
- an “Open workspace” link to `/workspace`
- a “Read documentation” link to `/docs`
- a product demonstration labelled “One chart, three ways to understand it”
- no editor canvas on the root route.

- [ ] **Step 3: Run the focused tests and confirm failure**

Run:

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/app/page.test.tsx src/app/workspace/page.test.tsx
```

Expected: the workspace import or root homepage contract fails before the route split.

- [ ] **Step 4: Move the workspace page shell**

Create `src/app/workspace/page.tsx` with:

```tsx
import AppHeader from "../AppHeader";
import "../workspace.css";
import Editor from "../../editor/Editor";

export default function Workspace() {
  return (
    <>
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <AppHeader page="workspace" />
      <main id="workspace" tabIndex={-1}>
        <Editor />
        <aside className="workspace-help" aria-label="Workspace shortcuts">
          <div><h3>Editing shortcuts</h3><p>Double-click a shape to rename it. Click an arrow to edit its label. Press <kbd>Delete</kbd> to remove a selected shape.</p></div>
          <div><h3>Keep your work</h3><p>Export your chart before closing the workspace. Reloading clears the current chart; exported images cannot be reopened as editable charts.</p></div>
        </aside>
      </main>
      <footer className="app-footer">
        <p>Koi charts · Flowchart workspace</p>
        <span>Local workspace · Not saved</span>
      </footer>
    </>
  );
}
```

Remove the temporary editor landing panel from `Editor.tsx`; the dedicated homepage now owns product introduction.

- [ ] **Step 5: Implement the homepage hero**

Replace `src/app/page.tsx` with a static page using `AppHeader page="home"`. Render:
- a hero with the approved headline and concise product description;
- `Link` actions to `/workspace` and `/docs`;
- a decorative semantic flowchart;
- an accessible three-view product demonstration.

Use homepage-scoped CSS classes in `globals.css`. The hero must fit its main action within a common laptop viewport and collapse to one column below 760px.

- [ ] **Step 6: Expand shared navigation**

Update `AppHeader` to accept:

```ts
type AppPage = "home" | "workspace" | "documentation";
```

Render Home, Workspace, and Documentation destinations, using `aria-current="page"` on the current destination.

- [ ] **Step 7: Run focused and static checks**

Run:

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/app/page.test.tsx src/app/workspace/page.test.tsx
node .tools/npm/package/bin/npm-cli.js run typecheck
node .tools/npm/package/bin/npm-cli.js run lint
```

Expected: all pass.

- [ ] **Step 8: Update README and commit**

Document `/workspace` in Quick Start and the route structure in Project Structure. Commit:

```powershell
git add README.md src/app/page.tsx src/app/page.test.tsx src/app/workspace/page.tsx src/app/workspace/page.test.tsx src/app/AppHeader.tsx src/app/globals.css src/app/workspace.css src/editor/Editor.tsx
git commit -m "feat: separate homepage and workspace"
```

### Task 2: Explain How Koi Charts Works

**Files:**
- Create: `src/app/HomeHowItWorks.tsx`
- Test: `src/app/page.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: static homepage content only.
- Produces: `HomeHowItWorks`, a semantic three-step section rendered after the hero.

- [ ] **Step 1: Add the failing content contract**

Assert that the root page contains a region named “How Koi Charts works” and the sequential headings “Build the structure”, “Follow every view”, and “Test the route”.

- [ ] **Step 2: Run the root-page test and confirm failure**

Run:

```powershell
node .tools/npm/package/bin/npm-cli.js test -- src/app/page.test.tsx
```

Expected: FAIL because the explanatory section is absent.

- [ ] **Step 3: Build the sequential section**

Create a server component containing one ordered list. Use a continuous route line and three semantic node markers to express real sequence rather than interchangeable feature cards. Keep copy under 40 words per step.

- [ ] **Step 4: Add the accessibility demonstration**

Add a wide section that shows the same sample decision in visual-canvas, tactile-pin, and spoken-outline forms. Decorative shapes use `aria-hidden="true"`; the section has concise explanatory text for assistive technology.

- [ ] **Step 5: Verify and commit**

Run the root-page test, typecheck, and lint. Commit:

```powershell
git add src/app/HomeHowItWorks.tsx src/app/page.tsx src/app/page.test.tsx src/app/globals.css
git commit -m "feat: explain the multimodal workflow"
```

### Task 3: Complete Responsive Homepage Polish

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/app/globals.css`
- Modify: `README.md`

**Interfaces:**
- Consumes: homepage hero and `HomeHowItWorks`.
- Produces: closing workspace action, responsive layout, and final documented route map.

- [ ] **Step 1: Add the closing-action contract**

Assert that the page ends with a region named “Start building” containing an “Open workspace” link to `/workspace`.

- [ ] **Step 2: Add the closing action**

Render a restrained closing band with one primary workspace link and one sentence explaining that charts remain local until workflow saving is introduced.

- [ ] **Step 3: Review responsive and access states in CSS**

Ensure:
- the hero and demonstration become one column at 760px;
- action links retain 44px minimum targets;
- no horizontal overflow occurs at 360px;
- `:focus-visible` is clear on all links;
- decorative movement is disabled by `prefers-reduced-motion`.

- [ ] **Step 4: Update documentation**

Update README route descriptions and state plainly that persistent workflow saving is future work.

- [ ] **Step 5: Run complete verification**

Run:

```powershell
node .tools/npm/package/bin/npm-cli.js test
node .tools/npm/package/bin/npm-cli.js run typecheck
node .tools/npm/package/bin/npm-cli.js run lint
node .tools/npm/package/bin/npm-cli.js run build
git diff --check
```

Expected: all pass.

- [ ] **Step 6: Commit**

```powershell
git add README.md src/app/page.tsx src/app/page.test.tsx src/app/globals.css
git commit -m "feat: complete homepage experience"
```

