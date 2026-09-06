import type { GraphCommand } from "../commands/schema";
export default function PreviewOverlay({command}:{command:GraphCommand|null}) {
 if(!command || command.kind!=="add_node")return null;
 return <div className={`speech-preview ${command.type}`} role="note" aria-label="Speech preview"><strong>Preview—not yet applied</strong><span>{command.type}: {command.label}</span></div>;
}
