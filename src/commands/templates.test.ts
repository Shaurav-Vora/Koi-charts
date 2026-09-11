import { describe, expect, it } from "vitest";
import { parseTemplate } from "./templates";

const add = (type: string, label: string) => ({ kind: "add_node", type, label, placement: null });
const byLabel = (value: string) => ({ kind: "label", value });

describe("command templates", () => {
  // Every verb an author might reach for should land on the same command, so nothing depends
  // on remembering which single word the app was taught.
  it.each([
    ["Add a process called Check payment.", add("process", "Check payment")],
    ["Create a decision named Approved", add("decision", "Approved")],
    ["Insert a step labelled Send receipt.", add("process", "Send receipt")],
    ["Make an end titled Done!", add("end", "Done")],
    ["new start called Begin here", add("start", "Begin here")],
    ["add a process that says Review the claim.", add("process", "Review the claim")],
  ])("reads %j as a labelled insertion", (text, command) => expect(parseTemplate(text)).toEqual(command));

  it.each([
    ["Add a step.", add("process", "Process")],
    ["Create a choice.", add("decision", "Decision")],
    ["Insert a finish", add("end", "End")],
    ["add a beginning node", add("start", "Start")],
  ])("reads %j as a default-labelled insertion", (text, command) => expect(parseTemplate(text)).toEqual(command));

  // A question mark belongs to a decision's own wording; elsewhere it is dictation punctuation.
  it("keeps a decision's question mark and drops sentence punctuation", () => {
    expect(parseTemplate("Add a decision called Approved?")).toEqual(add("decision", "Approved?"));
    expect(parseTemplate("Add a process called Approved?")).toEqual(add("process", "Approved"));
  });

  it.each([
    ["Rename Process to Check payment.", { kind: "rename", node: byLabel("Process"), newLabel: "Check payment" }],
    ['Rename "Go to shop" to Buy milk.', { kind: "rename", node: byLabel("Go to shop"), newLabel: "Buy milk" }],
    ["Relabel this to Send receipt", { kind: "rename", node: { kind: "focus" }, newLabel: "Send receipt" }],
  ])("reads %j as a rename", (text, command) => expect(parseTemplate(text)).toEqual(command));

  it.each([
    ["Connect Start to Check payment.", { kind: "connect", source: byLabel("Start"), target: byLabel("Check payment"), label: null }],
    ["Link Approved to Ship labelled Yes.", { kind: "connect", source: byLabel("Approved"), target: byLabel("Ship"), label: "Yes" }],
    ["Draw an arrow from Start to End", { kind: "connect", source: byLabel("Start"), target: byLabel("End"), label: null }],
    ["Connect it to End.", { kind: "connect", source: { kind: "focus" }, target: byLabel("End"), label: null }],
  ])("reads %j as a connection", (text, command) => expect(parseTemplate(text)).toEqual(command));

  it.each([
    ["Delete Check payment.", { kind: "delete", target: { kind: "node", node: byLabel("Check payment") } }],
    ["Remove the selected node", { kind: "delete", target: { kind: "node", node: { kind: "focus" } } }],
    ["Delete the connection from Start to End.", { kind: "delete", target: { kind: "edge", source: byLabel("Start"), target: byLabel("End"), label: null } }],
  ])("reads %j as a deletion, which the engine still gates on confirmation", (text, command) => expect(parseTemplate(text)).toEqual(command));

  it.each([
    ["Add a process called Review below Start.", { kind: "add_node", type: "process", label: "Review", placement: { relation: "below", reference: byLabel("Start") } }],
    ["Add a decision after Review", { kind: "add_node", type: "decision", label: "Decision", placement: { relation: "after", reference: byLabel("Review") } }],
    // Quoting is how a label that contains grammar words keeps them: "before" here is part of the name.
    ['Add a process called "Check before payment"', add("process", "Check before payment")],
    ["Move Start above End.", { kind: "move", node: byLabel("Start"), placement: { relation: "above", reference: byLabel("End") } }],
    ["Move it to the right of Review", { kind: "move", node: { kind: "focus" }, placement: { relation: "right_of", reference: byLabel("Review") } }],
    ["Trace the path from Start to End.", { kind: "trace_path", start: byLabel("Start"), end: byLabel("End") }],
    ["Trace the path from Start.", { kind: "trace_path", start: byLabel("Start"), end: null }],
    ["Inspect Check payment.", { kind: "inspect", node: byLabel("Check payment") }],
  ])("reads %j as a placement, route or inspection", (text, command) => expect(parseTemplate(text)).toEqual(command));

  it.each([
    ["Focus on Check payment.", { kind: "focus", node: byLabel("Check payment") }],
    ["Select the last shape", { kind: "focus", node: { kind: "recent" } }],
  ])("reads %j as a focus change", (text, command) => expect(parseTemplate(text)).toEqual(command));

  // A kind word with anything after it is a name, not a description: a repeated label is numbered,
  // so "Process 3" is what the third one is really called. These all went to the model before.
  it.each([
    ["Rename the process 3 to Process 5.", { kind: "rename", node: byLabel("the process 3"), newLabel: "Process 5" }],
    ["Rename Process 3 into Review.", { kind: "rename", node: byLabel("Process 3"), newLabel: "Review" }],
    ["Change Process 3 to Review.", { kind: "rename", node: byLabel("Process 3"), newLabel: "Review" }],
    ["Rename the decision to Approved.", { kind: "rename", node: byLabel("the decision"), newLabel: "Approved" }],
    ["Delete the process 3.", { kind: "delete", target: { kind: "node", node: byLabel("process 3") } }],
  ])("reads %j as a named shape rather than a description", (text, command) => expect(parseTemplate(text)).toEqual(command));

  // Refusing costs one model call. Matching wrongly writes the wrong thing into the chart.
  it.each([
    // "and" belongs to this label, so splitting on it would truncate a legitimate step.
    ["Add a process called Review and approve.", add("process", "Review and approve")],
  ])("keeps a conjunction that belongs to the label: %j", (text, command) => expect(parseTemplate(text)).toEqual(command));

  it.each([
    "Add a process called Review and connect it to End.",
    "Add a process called Review then delete Start.",
    "Add a process, then connect it to a new decision.",
    "Connect Start to an end node.",
    "Rename a new decision to Approved.",
    "Rename the new process to Review.",
    "Delete all nodes.",
    "Remove every connection.",
    "Add a process called .",
    "Undo the last three things I said.",
  ])("refuses %j and leaves it to the model", text => expect(parseTemplate(text)).toBeNull());

  it("refuses a label longer than the schema allows", () => {
    expect(parseTemplate(`Add a process called ${"x".repeat(201)}`)).toBeNull();
    expect(parseTemplate(`Add a process called ${"x".repeat(200)}`)).toEqual(add("process", "x".repeat(200)));
  });
});
