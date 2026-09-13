<p align="center">
  <img src="public/koi.svg" alt="Koi Charts Logo" width="100" height="100" />
</p>

<h1 align="center">Koi Charts</h1>

<p align="center">
  <strong>A multimodal, voice-first flowchart workspace engineered for independent blind, low-vision, and sighted authorship.</strong>
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js" alt="Next.js 16" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://www.assemblyai.com"><img src="https://img.shields.io/badge/AssemblyAI-Streaming%20v3-0000FF?style=flat-square" alt="AssemblyAI" /></a>
  <a href="https://ai.google.dev"><img src="https://img.shields.io/badge/Google%20Gemini-3.1%20Flash%20Lite-orange?style=flat-square&logo=google" alt="Google Gemini" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-22%20%7C%2024%20%7C%2026-green?style=flat-square&logo=node.js" alt="Node Engines" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPLv3-blue.svg?style=flat-square" alt="License: GPLv3" /></a>
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#multimodal-architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#voice-command-grammar">Voice Grammar</a> •
  <a href="#tactile-simulator--braille">Tactile & Braille</a> •
  <a href="#keyboard-shortcuts">Keyboard Shortcuts</a> •
  <a href="#testing--verification">Testing</a> •
  <a href="#project-structure">Project Structure</a>
</p>

---

## Overview

Traditional flowchart tools—such as Miro, Lucidchart, Draw.io, and Visio—are fundamentally visual and mouse-centric. Sighted authors drag boxes across pixel coordinates, while blind and visually impaired creators are locked out of the diagramming process.

**Koi Charts** rethinks diagramming from the ground up by introducing a **single unified semantic graph** (`FlowGraph`) that simultaneously powers four synchronized modalities:

1. 🎙️ **Streaming Voice Engine**: Live hands-free authoring with zero-latency local grammar parsing and Google Gemini 3.1 Flash Lite structured interpretation.
2. 🖲️ **Digital Tactile Simulator**: A 120 × 80 raised-pin array simulating physical refreshable tactile graphics, with shape contours, directional arrowheads, and Braille inspection strips.
3. 🎨 **Interactive Visual Canvas**: High-performance infinite canvas with draggable shapes, automatic edge routing, and inline editing.
4. 📋 **Synchronized Semantic Outline**: Fully accessible, screen-reader-first hierarchical tree that mirrors the exact graph topology.

Every action—whether initiated via speech, keyboard hotkeys, visual drag-and-drop, or form inputs—updates the same central engine with guaranteed transactional integrity and multi-level Undo/Redo.

---

## Key Features

### 🎙️ Dual-Engine Voice Interaction
- **Hybrid Execution**: Zero-latency local parsing for common workflow phrases (`add a start`, `connect A to B labelled Yes`), combined with server-side Google Gemini 3.1 Flash Lite structured output for natural, conversational multi-step commands.
- **Real-Time Streaming**: Browser-based `AudioWorklet` capturing 16 kHz mono PCM audio streamed directly over WebSockets to AssemblyAI Streaming v3.
- **Audio Duplex & Echo Protection**: Automated microphone silencing and a 400 ms safety guard while spoken replies play, preventing synthetic feedback loops.
- **Live Voice Interruption**: Speak aloud or press **Ctrl+Alt+S** to cut short any spoken reply and immediately resume editing.

### 🖲️ Digital Tactile Graphics Simulator
- **120 × 80 Pin Matrix**: Deterministic rasterization of flowchart elements into raised and lowered pins matching modern refreshable tactile display proportions.
- **Adaptive View Modes**: 
  - **Overview**: Full-canvas downsampled schematic of all nodes and interconnecting paths.
  - **Focused View**: Deep-dive neighborhood isolating the selected node and its immediate predecessors/successors.
  - **Auto Mode**: Intelligently toggles from Overview to Focused View when diagram density would render shapes smaller than 8 × 6 pins.
- **Tactile Information & Braille Strip**: Real-time status display featuring directional connection lists and English Braille cell previews.

### 🎨 Visual Flowchart Canvas
- **Dedicated Product Homepage**: The public root route explains Koi Charts and leads into the full editor at `/workspace`.
- **Custom Semantic Nodes**: Start (entry), Process (step), Decision (branch), and End (exit) shapes with accessible semantic color coding.
- **Smart Connection Routing**: Interactive connection ports that automatically determine optimal orthogonal routing based on relative node positioning.
- **Free Positioning & Auto-Layout**: Drag shapes freely across the canvas or use structured relative placements (`move Process below Start`).
- **Consistent Add Feedback**: Clicking or dropping a shape reports the same added-node confirmation while drag-and-drop positioning remains one undoable edit.
- **Inline Editing**: Double-click any shape to rename in place with instant validation and canvas fit-to-view controls.
- **Consistent Selection Cards**: Clicking a shape or connection opens the same lower-right canvas overlay. Both can be edited, closed, or deleted by mouse; connection deletion is immediate and undoable.

### 📋 Accessible Structure & Braille Reference
- **Chart Outline**: A dedicated, keyboard-navigable list reflecting nodes, types, and directional edges in reading order.
- **Documentation Field Guide**: A responsive route-based guide covering visual, voice, keyboard, tactile, testing, and export workflows.
- **UEB Embossable Reference Files**: Downloadable Unified English Braille Grade 1 (uncontracted) and Grade 2 (contracted) `.brf` files generated via `liblouis`.

### 📤 Publication-Ready Vector & Raster Exports
- Export diagrams at any time to **SVG**, **PDF**, **PNG**, or **JPEG**.
- Exports compute total bounding boxes across all shapes and routed paths with uniform padding, ensuring nodes placed above or to the left of the canvas origin are fully preserved.

---

## Multimodal Architecture

```
                  ┌─────────────────────────────────────────┐
                  │              Author Inputs              │
                  │  (Microphone / Keyboard / Mouse / Touch)│
                  └───────────────────┬─────────────────────┘
                                      │
           ┌──────────────────────────┴──────────────────────────┐
           ▼                                                     ▼
┌───────────────────────┐                             ┌───────────────────────┐
│ AssemblyAI Audio Pipe │                             │ Visual & Form Actions │
│ 16kHz PCM16 Streaming │                             │ (Palette, Drag, Drop) │
└──────────┬────────────┘                             └──────────┬────────────┘
           │                                                     │
           ▼                                                     │
┌─────────────────────────────────────────┐                      │
│        Command Resolution Tier          │                      │
│  ┌───────────────────────────────────┐  │                      │
│  │ Fast Local Grammar Parser         │  │                      │
│  │ (Deterministic Regex & Lexer)     │  │                      │
│  └─────────────────┬─────────────────┘  │                      │
│                    ▼ (Fallback / Complex)                      │
│  ┌───────────────────────────────────┐  │                      │
│  │ Gemini 3.1 Flash Lite API         │  │                      │
│  │ (Strict JSON Schema Validation)   │  │                      │
│  └─────────────────┬─────────────────┘  │                      │
└────────────────────┼────────────────────┘                      │
                     │                                           │
                     └────────────────────┬──────────────────────┘
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    Deterministic FlowGraph Engine     │
                      │  • Atomic Zod-Validated Invariants    │
                      │  • Transactional Undo / Redo Stack    │
                      │  • Safe Two-Step Deletion Guard       │
                      └───────────────────┬───────────────────┘
                                          │
    ┌──────────────────────────┬──────────┴───────────┬─────────────────────────┐
    ▼                          ▼                      ▼                         ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐         ┌───────────────┐
│ Visual Canvas │      │Tactile Matrix │      │ Chart Outline │         │ Speech Output │
│  (React Flow) │      │ (120 × 80)    │      │ (DOM / ARIA)  │         │(WebSpeech API)│
└───────────────┘      └───────────────┘      └───────────────┘         └───────────────┘
```

---

## Quick Start

### Prerequisites

- **Node.js**: `^22.22.2`, `^24.15.0`, or `>=26.0.0`
- **npm**: `v10+`

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Shaurav-Vora/Koi-charts.git
cd Koi-charts
npm ci
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` to configure your API credentials:

```dotenv
# Speech-to-text live streaming
ASSEMBLYAI_API_KEY=your_assemblyai_api_key

# Conversational natural-language command interpretation
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite

# Set to 1 only when deployed behind a reverse proxy (e.g. Nginx, Cloudflare)
TRUST_PROXY=0
```

> **API Key Setup Guides:**
> - Get a Google Gemini key at [Google AI Studio](https://aistudio.google.com/apikey).
> - Get an AssemblyAI streaming key at [AssemblyAI Dashboard](https://www.assemblyai.com/).
> - *Note: The application functions offline for visual authoring, keyboard navigation, and fast local voice commands without active API keys.*

### 3. Launch Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the homepage. The editor is available at [http://localhost:3000/workspace](http://localhost:3000/workspace), and the documentation is available at [http://localhost:3000/docs](http://localhost:3000/docs).

---

## Voice Command Grammar

Koi Charts features an on-device deterministic grammar parser (`src/commands/grammar.ts`) that executes recognized forms with zero latency and zero cloud costs. More intricate requests automatically route to Gemini 3.1 Flash Lite.

| Category | Command Syntax Pattern | Example Utterance |
| :--- | :--- | :--- |
| **Add Shape** | `add a <shape> [called <label>] [<relation> <shape>]` | *"Add a process called Verify Credentials"* |
| **Connect** | `connect <shape> to <shape> [labelled <label>]` | *"Connect Verify to Process Payment labelled Valid"* |
| **Inline Add & Connect** | `connect <shape> to a new <shape> [labelled <label>]` | *"Connect Start to a new process labelled Login"* |
| **Rename** | `rename <shape> to <label>` | *"Rename Verify Credentials to Authenticate User"* |
| **Relative Move** | `move <shape> <relation> <shape>` | *"Move Authenticate User below Start"* |
| **Delete Node** | `delete <shape>` / `delete the <kind>` | *"Delete the decision"* |
| **Delete Arrow** | `delete the connection from <shape> to <shape>` | *"Delete the connection from Start to Verify"* |
| **Navigation** | `next` / `back` / `go to start` / `go to end` | *"Next"* or *"Go to start"* |
| **Branch Choice** | `take <branch>` | *"Take Yes"* |
| **Test Chart** | `test chart` / `start test` / `repeat` / `restart test` / `stop test` | *"Test chart"* or *"Stop test"* |
| **Inspect / Query** | `where am I` / `inspect <shape>` / `describe the chart` | *"Describe the chart"* |
| **Trace Path** | `trace the path from <shape> [to <shape>]` | *"Trace the path from Start to End"* |
| **History & Guard** | `undo` / `redo` / `confirm` / `cancel` | *"Undo"* or *"Confirm"* |

### Grammar Rules
1. **Shapes**: `start`, `process`, `decision`, `end` (with synonyms `step`, `choice`, `finish`).
2. **Relative Positions**: `above`, `below`, `left of`, `right of`, `before`, `after`.
3. **Compound Utterances**: Requests with multiple sequential actions (e.g. *"Add three steps for checkout"*) are routed cleanly to Gemini.
4. **Collision Disambiguation**: Duplicate labels are automatically disambiguated using phonetic indices (*"Process"*, *"Process (2)"*).

---

## Tactile Simulator & Braille

The tactile simulator models a **120 × 80 pin matrix** representing modern refreshable tactile pin arrays:

- **Shape Outlines**: Start and End nodes render with rounded terminal borders; Process nodes display rectangular contours; Decision nodes display diamond contours.
- **Directional Tracing**: Connections feature directional arrow pins indicating flow.
- **Active Focus Cursor**: The currently selected node is indicated by an elevated tactile cross pattern.
- **Embossable Braille (`.brf`)**: Includes complete UEB Grade 1 and Grade 2 command cheat sheets. Run the generator script to compile directly from code grammar:

```bash
npm run braille
```

---

## Guided Chart Testing

The compact **Test chart** control sits inside the visual canvas instead of taking a permanent workspace row. It expands into an in-canvas panel only while testing, then returns to one button when stopped. This is a verification and walkthrough mode for an existing chart: it follows the graph one node at a time without creating content or changing undo history. Starting a test focuses the Start node across the visual canvas, tactile display, and chart outline. **Next step** follows a single outgoing connection, while charts with multiple outgoing connections require an explicit branch choice.

- **Back one step** returns through the route actually taken.
- **Repeat step** repeats the current node guidance.
- **Restart test** begins again after completion, a dead end, or a chart change.
- **Stop test** closes the active route and returns the panel to its ready state.
- Editing the graph during a test pauses playback and asks for a restart, preventing stale connections from being followed.
- A missing Start prevents playback. Unreachable shapes are reported before the walkthrough, dead ends pause advancement, and revisiting a shape announces a loop.
- Unlabelled branches remain selectable by destination, although arrow labels provide clearer decision choices across speech, Braille, and the outline.
- The visual canvas marks earlier route connections with a wider solid line and the current connection with a wider dashed line. Route nodes use matching visited and current outlines.
- The Braille information strip begins with the playback step and, after the first node, names the arrow and source node used to enter the current shape.
- The chart outline contains a compact numbered **Test route** list while playback has recorded steps. Its current item is marked as the active step.

Voice control uses exact local commands: **test chart** or **start test**, **next**, **back**, **repeat**, **take _branch label or destination_**, **restart test**, and **stop test**. These commands run locally without calling Gemini. Branch choices must match an arrow label or destination node; Koi Charts does not guess an unspoken choice.

Manual acceptance check:

1. Create a Start leading to a Decision with labelled **Yes** and **No** branches, then place an End after each branch.
2. Select **Test chart**, advance to the Decision, and take one branch. Confirm that the visual route, Braille information strip, and outline **Test route** identify the same current step.
3. Use **Back one step** and **Repeat step**, then complete and restart the route. Confirm each status is announced and contains chart labels rather than internal IDs.
4. Test an unlabelled branch, a dead end, a loop, and an unreachable shape. Confirm each condition is stated and playback waits instead of choosing a route.
5. Edit the graph during playback and confirm advancement stays blocked until restart.
6. Repeat the walkthrough with the local voice phrases and with <kbd>Tab</kbd>, <kbd>Enter</kbd>, and <kbd>Space</kbd>.

---

## Keyboard Shortcuts

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>V</kbd> | Global | Start or stop live voice streaming |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>S</kbd> | Global | Stop currently playing speech reply and release mic |
| <kbd>Delete</kbd> | Canvas | Delete the selected node or connection. Connected-node deletion keeps its confirmation guard. |
| <kbd>Escape</kbd> | Canvas / Forms | Clear active selection or cancel inline editing |
| <kbd>Enter</kbd> | Inline Rename | Save updated label |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Global | Navigate accessible elements & toolbar controls |

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Next.js development server on `http://127.0.0.1:3000` |
| `npm run build` | Compiles production-optimized client and server bundles |
| `npm start` | Serves the production build locally |
| `npm test` | Runs the test suite via Vitest |
| `npm run typecheck` | Validates TypeScript types across the entire codebase |
| `npm run lint` | Runs ESLint validation rules with zero warnings allowed |
| `npm run braille` | Recompiles UEB Grade 1 and 2 Braille `.brf` guides with `liblouis` |

---

## Project Structure

```
Koi-charts/
├── public/
│   ├── audio/              # AudioWorklet processors (16kHz PCM16 capture)
│   ├── braille/            # Embossable UEB Grade 1 & 2 .brf references
│   └── koi.svg             # Vector brand logo
├── src/
│   ├── app/                # Next.js routes for the homepage, /workspace editor, documentation, and APIs
│   ├── commands/           # Command grammar, Zod schemas, resolve & execute engine
│   ├── editor/             # Canvas editor coordinator, status management, UI components
│   ├── feedback/           # Natural language chart descriptions and query generators
│   ├── graph/              # Core FlowGraph types, invariants, and graph algorithms
│   ├── playback/           # Guided chart playback state machine and route history
│   ├── server/             # Secure API routes (AssemblyAI token minting, Gemini API gateway)
│   ├── streaming/          # WebSocket session coordinator, audio filters, turn manager
│   ├── tactile/            # 120 × 80 pin matrix rasterizer and Braille conversion utilities
│   └── visual/             # React Flow custom node adapters, connectors, and export helpers
├── scripts/
│   └── braille-guide.mjs   # liblouis build-time Braille generator
├── vitest.config.ts        # Vitest test runner configuration
└── package.json            # Project manifest and dependencies
```

---

## Testing & Verification

Koi Charts maintains comprehensive automated test coverage across all subsystems:

- **Graph Invariants**: Guarantees structural integrity, cycle safety, and immutable updates.
- **Guided Playback Engine**: Covers Start selection, branch choices, exact route history, loops, dead ends, and graph-change invalidation.
- **Command Engine**: Tests rollback on errors, multi-step history preservation, and fuzzy reference resolution.
- **Grammar & Lexer**: Exercises all recognized spoken forms against plain and dictated inputs.
- **Streaming & Provider Resilience**: Tests simulated token expiry, connection loss, 30-minute session timeouts, and rate limit backoffs.

Run the test suite:

```bash
npm test
```

To verify the guided playback engine milestone independently:

```bash
npm test -- src/playback/engine.test.ts
```

The workspace exposes this engine through the Test chart panel and keeps playback focus synchronized across its chart representations.

---

## Contributing

We welcome contributions from engineers, accessibility advocates, and designers!

1. Fork the repository and create a feature branch (`git checkout -b feature/amazing-feature`).
2. Verify all checks pass:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```
3. Commit your changes following conventional commit syntax (`git commit -m "feat: add tactile zoom mode"`).
4. Push to your branch and open a Pull Request.

---

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
