# Koi charts

A voice-first flowchart workspace designed for independent blind authorship. The planned editor uses one semantic graph for a visual flowchart, a digital tactile simulator, and spoken descriptions.

## Current milestone

**Task 1: application shell.** The page shows two empty, named display regions, idle status, a Braille information-strip empty state, and an expandable preview guide. It includes a keyboard skip link, focus indicators, responsive panels, and reduced-motion styles.

Graph editing, actual pin rasterization, Braille conversion, microphone capture, and AssemblyAI integration are not implemented yet. The pin background is an empty display illustration. No microphone permission is requested and no API key is needed to run this milestone.

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

## Check this milestone

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

`npm start` serves a completed production build. These checks cover the shell only; a full screen-reader and axe audit is planned for Task 10.

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

Setup follows the official [Next.js installation guide](https://nextjs.org/docs/app/getting-started/installation), checked during bootstrap. The application was manually scaffolded to preserve the existing design and plan. CSS uses a small blue/white token palette and local system fonts, so building does not require downloading fonts. No graph or voice packages are installed until their milestones.

Compatibility exception: the latest TypeScript 7 release was rejected by Next.js's typescript-eslint dependency, and its React/accessibility/import plugins declare ESLint support only through version 9. TypeScript 6.0.3 and ESLint 9.39.5 are pinned to satisfy those boundaries. npm marks ESLint 9 as out of support; revisit the pin when the Next.js plugin stack supports ESLint 10. Do not upgrade either tool independently without rerunning lint. npm also reports a blocked optional `unrs-resolver` postinstall script; the installed native package resolves successfully and lint passes without enabling that script.

Task 1 verification: two shell tests passed after first failing against the starter page; typecheck, lint, and production build passed. Browser checks confirmed visible keyboard focus, skip-link destination, keyboard guide expansion, and a single-column layout with no horizontal overflow at a 375-pixel viewport. Browser error/warning logs were empty. A human screen-reader audit has not been performed.

## Environment and project documents

`.env.example` lists future server configuration. When live integration begins, keep the key in `.env.local`; never prefix it with `NEXT_PUBLIC_` or commit it. Provider model availability will be verified at that milestone.

- [Authoritative design](2026-09-05-voice-tactile-flowchart-design.md)
- [Implementation plan and progress](docs/superpowers/plans/2026-09-05-voice-tactile-flowchart.md)
- `src/app/`: page, root layout, styles, and shell tests.
- `src/test/setup.ts`: Testing Library cleanup and assertions.

Work proceeds one milestone at a time, with owner verification before continuing. No physical tactile hardware, validated Braille output, or offline voice capability is claimed.
