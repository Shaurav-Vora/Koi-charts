import type { GraphCommand } from "./schema";

// Match the whole utterance: modifiers, names, negation and compound requests must
// still go through interpretation. Basic insertion never needs an existing focus.
export function parseSimpleAddition(text: string): GraphCommand | null {
 const match=/^(?:please )?add (?:a |an )?(start|process|decision|end)(?: (?:node|shape))?[.!]?$/i.exec(text.trim().replace(/\s+/g," "));
 if(!match)return null;
 const labels={start:"Start",process:"Process",decision:"Decision",end:"End"} as const;
 const type=match[1].toLowerCase() as keyof typeof labels;
 return {kind:"add_node",type,label:labels[type],placement:null};
}

export function parseControl(text: string): GraphCommand | null {
 const clean=text.trim();
 switch(clean.toLowerCase()) {
  case "undo": return {kind:"undo"}; case "redo":return {kind:"redo"}; case "confirm":return {kind:"confirm"}; case "cancel":return {kind:"cancel"};
  case "describe chart":return {kind:"describe",scope:"chart"}; case "describe focus":return {kind:"describe",scope:"focus"};
  case "inspect focus":return {kind:"inspect",node:null}; case "validate chart":return {kind:"validate"};
 }
 const match=/^focus on "([^"\n]{1,200})"$/i.exec(clean);
 return match ? {kind:"focus",node:{kind:"label",value:match[1]}} : null;
}
