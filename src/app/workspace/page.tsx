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

      </main>

      <footer className="app-footer">
        <p>Koi charts · Flowchart workspace</p>
        <span>Local workspace · Not saved</span>
      </footer>
    </>
  );
}
