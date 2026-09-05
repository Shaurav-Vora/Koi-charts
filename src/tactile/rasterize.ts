import type { FlowGraph } from "../graph/types";
import type { LayoutFrame } from "../visual/layout";
import { toBraille } from "./braille";
import { selectViewport, fitViewport } from "./viewport";
import type { TactileFrame, TactileMode } from "./types";
export function makeTactileFrame(graph: FlowGraph, layout: LayoutFrame, focus: string | null, mode: TactileMode, version: number): TactileFrame {
  const view = selectViewport(graph,layout,focus,mode), fit = fitViewport(view), pins = new Set<number>();
  const pin = (x:number,y:number) => { x=Math.round(x); y=Math.round(y); if (x>=0 && x<120 && y>=0 && y<80) pins.add(y*120+x); };
  const line = (x1:number,y1:number,x2:number,y2:number) => { const steps=Math.max(1,Math.ceil(Math.max(Math.abs(x2-x1),Math.abs(y2-y1)))); for(let i=0;i<=steps;i++) pin(x1+(x2-x1)*i/steps,y1+(y2-y1)*i/steps); };
  const map = (p:{x:number;y:number}) => ({x:p.x*fit.scale+fit.x,y:p.y*fit.scale+fit.y});
  for(const edge of view.edges) {
    const p=edge.points.map(map);
    for(let i=1;i<p.length;i++) line(p[i-1].x,p[i-1].y,p[i].x,p[i].y);
    const end=p.at(-1)!; const prev=[...p].reverse().find(q=>q.x!==end.x || q.y!==end.y);
    if(prev) {const angle=Math.atan2(end.y-prev.y,end.x-prev.x); for(const sign of [-1,1]) line(end.x,end.y,end.x-3*Math.cos(angle+sign*0.65),end.y-3*Math.sin(angle+sign*0.65));}
  }
  for(const node of view.nodes) {
    const {x,y}=map(node), w=node.width*fit.scale,h=node.height*fit.scale;
    const type=graph.nodes.find(n=>n.id===node.id)!.type;
    if(type==="decision") {line(x+w/2,y,x+w,y+h/2);line(x+w,y+h/2,x+w/2,y+h);line(x+w/2,y+h,x,y+h/2);line(x,y+h/2,x+w/2,y);}
    else if(type==="process") {line(x,y,x+w,y);line(x+w,y,x+w,y+h);line(x+w,y+h,x,y+h);line(x,y+h,x,y);}
    else { const r=Math.min(h/2,w/2); line(x+r,y,x+w-r,y);line(x+r,y+h,x+w-r,y+h); for(let i=0;i<=80;i++){const a=Math.PI/2+Math.PI*i/80;pin(x+r+r*Math.cos(a),y+h/2+r*Math.sin(a));pin(x+w-r-r*Math.cos(a),y+h/2+r*Math.sin(a));} }
    // A raised cross inside the focused shape remains meaningful without color.
    if(node.id===view.focusedNodeId) {line(x+w/2-2,y+h/2,x+w/2+2,y+h/2);line(x+w/2,y+h/2-2,x+w/2,y+h/2+2);}
  }
  const focused=graph.nodes.find(n=>n.id===view.focusedNodeId);
  const text=focused ? `${focused.label} ${focused.type}` : "No node selected";
  const braille=toBraille(focused ? text : "");
  return {version,width:120,height:80,raisedPins:[...pins].sort((a,b)=>a-b).map(p=>({x:p%120,y:Math.floor(p/120)})),brailleCells:braille.cells,text,focusedNodeId:view.focusedNodeId,mode,unsupported:braille.unsupported,nodeIds:view.nodes.map(n=>n.id),edgeIds:view.edges.map(e=>e.id)};
}
