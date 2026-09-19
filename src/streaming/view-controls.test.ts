import { expect, it, vi } from "vitest";
import { createEngineState } from "../commands/execute";
import type { GraphCommand } from "../commands/schema";
import { TurnCoordinator } from "./turns";
import type { ViewAction, ViewActionResult } from "../commands/view-control";

it.each([
  ["Arrange chart.", "arrange"],
  ["Use compact nodes.", "compact_on"],
  ["Use standard nodes.", "compact_off"],
] as const)("runs %s locally even when fast local edits are disabled", async (spoken, action) => {
  const state=createEngineState();
  const interpret=vi.fn(async():Promise<GraphCommand>=>({kind:"undo"}));
  const apply=vi.fn();
  const runView=vi.fn((value:ViewAction):ViewActionResult=>({outcome:"committed",message:value==="arrange"?"Chart arranged.":value==="compact_on"?"Compact nodes enabled.":"Standard nodes enabled."}));
  const coordinator=new TurnCoordinator({getState:()=>state,apply,choose:vi.fn(),interpret,present:vi.fn(),preferLocal:()=>false,runView});
  coordinator.start("view");

  await coordinator.accept({sessionId:"view",turnId:"1",text:spoken,final:true});

  expect(runView).toHaveBeenCalledWith(action);
  expect(interpret).not.toHaveBeenCalled();
  expect(apply).not.toHaveBeenCalled();
});