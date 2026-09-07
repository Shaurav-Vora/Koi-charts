import type { GraphCommand } from "./schema";
import { bestMatch } from "./similarity";
import { stripFillers } from "./phrasing";

// Match the whole utterance: modifiers, names, negation and compound requests must
// still go through interpretation. Basic insertion never needs an existing focus.
export function parseSimpleAddition(text: string): GraphCommand | null {
 const match=/^add (?:a |an )?(start|process|decision|end)(?: (?:node|shape))?[.!]?$/i.exec(stripFillers(text));
 if(!match)return null;
 const labels={start:"Start",process:"Process",decision:"Decision",end:"End"} as const;
 const type=match[1].toLowerCase() as keyof typeof labels;
 return {kind:"add_node",type,label:labels[type],placement:null};
}

/**
 * The fixed control vocabulary. `exactOnly` marks the phrases that approximate matching may
 * never reach: confirming is what commits a pending deletion, so it is recognised word for word
 * or not at all. Everything else here is recoverable with one Undo.
 */
const controls: { phrase: string; command: GraphCommand; exactOnly?: true }[] = [
 {phrase:"undo",command:{kind:"undo"}}, {phrase:"redo",command:{kind:"redo"}},
 {phrase:"confirm",command:{kind:"confirm"},exactOnly:true}, {phrase:"confirm deletion",command:{kind:"confirm"},exactOnly:true},
 {phrase:"cancel",command:{kind:"cancel"}},
 ...["describe chart","describe the chart"].map(phrase=>({phrase,command:{kind:"describe",scope:"chart"} as GraphCommand})),
 ...["describe focus","describe this","describe the selection"].map(phrase=>({phrase,command:{kind:"describe",scope:"focus"} as GraphCommand})),
 ...["inspect focus","inspect this","inspect the selection"].map(phrase=>({phrase,command:{kind:"inspect",node:null} as GraphCommand})),
 ...["validate chart","validate the chart","check the chart"].map(phrase=>({phrase,command:{kind:"validate"} as GraphCommand})),
 ...["clear selection","clear the selection","clear focus","deselect"].map(phrase=>({phrase,command:{kind:"clear_focus"} as GraphCommand})),
 ...["next","go next","forward","go forward"].map(phrase=>({phrase,command:{kind:"walk",direction:"next",branch:null} as GraphCommand})),
 ...["back","go back","previous","go previous"].map(phrase=>({phrase,command:{kind:"walk",direction:"back",branch:null} as GraphCommand})),
 ...["where am i","where"].map(phrase=>({phrase,command:{kind:"walk",direction:"stay",branch:null} as GraphCommand})),
 ...["go to start","go to the start"].map(phrase=>({phrase,command:{kind:"walk",direction:"first",branch:null} as GraphCommand})),
 ...["go to end","go to the end"].map(phrase=>({phrase,command:{kind:"walk",direction:"last",branch:null} as GraphCommand})),
];

// AssemblyAI's formatted finals end in punctuation, so "Confirm." reached no case here and
// was sent to the provider instead: a pending deletion then hung on a non-deterministic answer.
const clean=(text:string)=>stripFillers(text).replace(/[.!?]+$/,"");

export function parseControl(text: string): GraphCommand | null {
 const spoken=clean(text).toLowerCase();
 const control=controls.find(entry=>entry.phrase===spoken);
 if(control)return structuredClone(control.command);
 // Only "take" and "follow" open a branch name, so "go to start" cannot be read as a branch called "to start".
 const branch=/^(?:take|follow) (?:the )?(?:branch )?(.{1,200})$/i.exec(clean(text));
 if(branch) return {kind:"walk",direction:"next",branch:branch[1].trim().replace(/^"(.+)"$/,"$1")};
 const match=/^focus on "([^"\n]{1,200})"$/i.exec(clean(text));
 return match ? {kind:"focus",node:{kind:"label",value:match[1]}} : null;
}

/**
 * A second pass for control words the transcript garbled — "Cancelled." for "cancel". Runs only
 * after every exact rule has declined, and refuses anything without a clear winner, so an
 * unrecognised phrase still reaches the model rather than becoming the nearest command.
 */
export function parseFuzzyControl(text: string): GraphCommand | null {
 const command=bestMatch(clean(text),controls.filter(entry=>!entry.exactOnly).map(entry=>({phrase:entry.phrase,value:entry.command})));
 return command ? structuredClone(command) : null;
}
