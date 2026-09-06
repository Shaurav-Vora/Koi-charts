import { commandSchema, type GraphCommand } from "./schema";
// Only complete, simple additions are previewable. No guess about unfinished references.
export function previewCommand(text:string):GraphCommand|null {
 const match=/^add (?:a |an )?(start|process|decision|end)(?: node)? (?:called|named) (.+)$/i.exec(text.trim());
 if(!match || /\b(?:and|then|before|after|above|below|left|right)\b/i.test(match[2])) return null;
 const label=match[2].trim().replace(/^"([^"\n]+)"$/,"$1");
 if(!label || label.includes('"')) return null;
 const parsed=commandSchema.safeParse({kind:"add_node",type:match[1].toLowerCase(),label,placement:null});
 return parsed.success ? parsed.data : null;
}
