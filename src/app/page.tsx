import AppHeader from "./AppHeader";
import "./workspace.css";
import Editor from "../editor/Editor";

export default function Home() {
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
