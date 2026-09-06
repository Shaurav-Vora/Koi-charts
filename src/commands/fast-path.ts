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
  case "next": case "go next": case "forward": case "go forward": return {kind:"walk",direction:"next",branch:null};
  case "back": case "go back": case "previous": case "go previous": return {kind:"walk",direction:"back",branch:null};
  case "where am i": case "where am i?": case "where": return {kind:"walk",direction:"stay",branch:null};
  case "go to start": case "go to the start": return {kind:"walk",direction:"first",branch:null};
  case "go to end": case "go to the end": return {kind:"walk",direction:"last",branch:null};
 }
 // Only "take" and "follow" open a branch name, so "go to start" cannot be read as a branch called "to start".
 const branch=/^(?:take|follow) (?:the )?(?:branch )?(.{1,200}?)[.!?]?$/i.exec(clean);
 if(branch) return {kind:"walk",direction:"next",branch:branch[1].trim().replace(/^"(.+)"$/,"$1")};
 const match=/^focus on "([^"\n]{1,200})"$/i.exec(clean);
 return match ? {kind:"focus",node:{kind:"label",value:match[1]}} : null;
}
