# Homepage and Workspace Separation Design

**Date:** 2026-09-13  
**Status:** Approved

## Purpose

Koi Charts needs a public homepage that explains the product before opening the editor. The current root route immediately renders the workspace, which leaves no clear place for product positioning, onboarding, or a future saved-workflow library.

## Route Architecture

- `/` is a static, public homepage.
- `/workspace` contains the existing flowchart editor and its supporting guidance.
- `/docs` remains the documentation route.
- The shared header supports Home, Workspace, and Documentation states.
- Homepage calls to action use Next.js `Link` navigation to `/workspace`.

The editor remains unchanged as a client component. Moving its page shell changes its route, not its state model or command behavior.

## Homepage Content

The homepage uses four compact sections:

1. **Hero:** A plain statement of Koi Charts' purpose, a primary Open workspace action, a Documentation link, and a small flowchart motif that demonstrates one graph expressed through sight, touch, and voice.
2. **How it works:** Three sequential steps: build the graph, inspect the shared structure, and test the route.
3. **Accessibility demonstration:** A visual comparison of the canvas, tactile pins, and spoken/outline output, described as synchronized views of one semantic graph.
4. **Closing action:** A concise prompt to open the workspace.

The page will not display a fake workflow library or disabled save controls. Saved workflows can later appear as a real authenticated section backed by persistence.

## Visual Direction

The homepage extends the existing Koi Charts identity:

- Deep navy provides the hero's main field.
- Koi orange marks the primary action and selected route.
- Blue represents graph structure and tactile information.
- Mist blue and white keep explanatory sections quiet and readable.
- Flowchart lines and semantic node shapes provide the visual signature.
- Typography stays within the current Segoe UI system for consistency and avoids adding a font dependency.

The hero is substantial enough to read as a homepage while keeping its main action visible without scrolling on common laptop displays. Sections use wide editorial bands and structured diagrams rather than a grid of interchangeable marketing cards.

## Accessibility

- One visible `h1` describes the product.
- Landmarks and section headings give screen-reader users a short page outline.
- Decorative flowchart graphics are hidden from assistive technology.
- All actions have visible focus styles and descriptive link text.
- Text and controls meet the existing color-contrast standard.
- The layout collapses to a single reading column on narrow screens.
- Reduced-motion preferences disable decorative animation.

## Future Persistence Boundary

A future workflow database can add:

- a workflow list or dashboard linked from the homepage or workspace;
- authentication and ownership;
- save, rename, duplicate, and delete actions;
- route-based workflow loading such as `/workspace/[workflowId]`.

None of those concerns are coupled to the homepage component in this milestone.

## Testing

- Root-page tests verify the homepage structure and links.
- Workspace-page tests preserve the existing editor-shell and accessibility contracts at `/workspace`.
- Header tests verify correct navigation for all three routes.
- The complete suite, TypeScript, lint, and production build must pass.

## Out of Scope

- Database setup
- Authentication
- Workflow saving or loading
- Pricing, testimonials, or fabricated usage statistics

