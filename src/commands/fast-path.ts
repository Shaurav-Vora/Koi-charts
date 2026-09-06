import type { GraphCommand } from "./schema";
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
