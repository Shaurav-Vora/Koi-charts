import type { GraphCommand } from "./schema";

/**
 * The spoken syntax of Koi charts: every phrase shape that is guaranteed to run on this machine,
 * with no model call and the same result every time.
 *
 * This file is the single source of truth for both halves of that promise. The command guide is
 * rendered from it, and grammar.test.ts asserts that every example here parses locally into the
 * command beside it — so a form that is documented but no longer recognised fails the build,
 * and a form that is recognised can be shown to authors without anyone hand-copying it.
 *
 * Three rules make the syntax dependable:
 *   1. Join exact local edits with "then" or "and"; uncertain chains go to the model whole.
 *   2. Quote a label that contains grammar words: `add a process called "Check before payment"`.
 *   3. Name a shape by its own label, or by its kind when the chart has only one of that kind.
 *      A description of a shape that does not exist yet — "a new decision" — names nothing.
 */

/** The three rules above, as data, so the guide on the page states them in the author's words. */
export const rules: string[] = [
  "Join up to ten exact local edits with \"then\" or \"and\". If any part is uncertain, the whole request goes to Gemini.",
  "Quote a label that contains grammar words: add a process called \"Check before payment\".",
  "Name a shape by its own label — or, when the chart has only one of them, by its kind: \"the decision\".",
];

export type GrammarExample = { say: string; command: GraphCommand };
export type GrammarEntry = {
  /** The canonical shape, with <placeholders>, as an author should learn it. */
  form: string;
  purpose: string;
  /** Interchangeable wordings accepted for the same form. */
  alternatives?: string[];
  examples: GrammarExample[];
};
export type GrammarSection = { title: string; entries: GrammarEntry[] };

const label = (value: string) => ({ kind: "label", value }) as const;

export const grammar: GrammarSection[] = [
  {
    title: "Combine edits",
    entries: [
      {
        form: "<command> then <command>",
        purpose: "Runs a sequence as one local, undoable change when every part matches the local grammar.",
        alternatives: ["then", "and then", "and before a clear command verb", "up to ten edits"],
        examples: [
          { say: "add a start then add a process", command: { kind: "compound", commands: [
            { kind: "add_node", type: "start", label: "Start", placement: null },
            { kind: "add_node", type: "process", label: "Process", placement: null },
          ] } },
        ],
      },
    ],
  },
  {
    title: "Build the chart",
    entries: [
      {
        form: "add a <shape>",
        purpose: "Adds a shape with a default label.",
        alternatives: ["add", "create", "insert", "make", "place", "put", "new", "shape: start / process / decision / end", "start also: begin", "process also: step, action, task", "decision also: choice, question", "end also: finish, stop, terminal"],
        examples: [
          { say: "add a start", command: { kind: "add_node", type: "start", label: "Start", placement: null } },
          { say: "create a decision node", command: { kind: "add_node", type: "decision", label: "Decision", placement: null } },
        ],
      },
      {
        form: "add a <shape> called <label>",
        purpose: "Adds a shape with the label you say.",
        alternatives: ["called", "named", "labelled", "titled", "that says"],
        examples: [
          { say: "add a process called Check payment", command: { kind: "add_node", type: "process", label: "Check payment", placement: null } },
          { say: "add a decision called Approved?", command: { kind: "add_node", type: "decision", label: "Approved?", placement: null } },
          { say: 'add a process called "Check before payment"', command: { kind: "add_node", type: "process", label: "Check before payment", placement: null } },
        ],
      },
      {
        form: "add a <shape> [called <label>] <relation> <existing shape>",
        purpose: "Adds a shape in a chosen position beside one already in the chart.",
        alternatives: ["before", "after", "above (over)", "below (under)", "left of", "right of"],
        examples: [
          { say: "add an end below Check payment", command: { kind: "add_node", type: "end", label: "End", placement: { relation: "below", reference: label("Check payment") } } },
          { say: "add a process called Refund to the right of Check payment", command: { kind: "add_node", type: "process", label: "Refund", placement: { relation: "right_of", reference: label("Check payment") } } },
        ],
      },
    ],
  },
  {
    title: "Connect shapes",
    entries: [
      {
        form: "connect <source> to a new <shape> [labelled <label>]",
        purpose: "Creates the destination, then connects the source to it. Labelled names the new node, not the arrow. A new node without a shape type defaults to Process. Undo removes both changes.",
        alternatives: ["called", "named", "labeled", "labelled"],
        examples: [
          {say:"connect Start to a new process",command:{kind:"connect_new",source:label("Start"),type:"process",label:"Process"}},
          {say:"connect it to a new decision labelled Approved?",command:{kind:"connect_new",source:{kind:"focus"},type:"decision",label:"Approved?"}},
          {say:"connect Start to a new node labelled Review",command:{kind:"connect_new",source:label("Start"),type:"process",label:"Review"}},
        ],
      },
      {
        form: "connect <shape> to <shape>",
        purpose: "Draws an arrow from the first shape to the second.",
        alternatives: ["connect", "link", "join", "draw an arrow from"],
        examples: [
          { say: "connect Start to Check payment", command: { kind: "connect", source: label("Start"), target: label("Check payment"), label: null } },
          { say: "draw an arrow from Check payment to End", command: { kind: "connect", source: label("Check payment"), target: label("End"), label: null } },
        ],
      },
      {
        form: "connect <shape> to <shape> labelled <label>",
        purpose: "Draws an arrow and labels it — how a decision's branches are named.",
        alternatives: ["labelled", "called", "named", "with label"],
        examples: [
          { say: "connect Approved to Refund labelled No", command: { kind: "connect", source: label("Approved"), target: label("Refund"), label: "No" } },
        ],
      },
    ],
  },
  {
    title: "Change what is there",
    entries: [
      {
        form: "rename <shape> to <label>",
        purpose: "Changes a shape's label.",
        alternatives: ["rename", "relabel", "change", "to or into", "this / it / the selected shape refer to the current selection"],
        examples: [
          { say: "rename Check payment to Take payment", command: { kind: "rename", node: label("Check payment"), newLabel: "Take payment" } },
          { say: "change Process 3 into Review", command: { kind: "rename", node: label("Process 3"), newLabel: "Review" } },
          { say: "rename this to Take payment", command: { kind: "rename", node: { kind: "focus" }, newLabel: "Take payment" } },
        ],
      },
      {
        form: "move <shape> <relation> <shape>",
        purpose: "Repositions a shape beside another one.",
        examples: [
          { say: "move Refund below Approved", command: { kind: "move", node: label("Refund"), placement: { relation: "below", reference: label("Approved") } } },
        ],
      },
      {
        form: "delete <shape>",
        purpose: "Removes a shape. A shape with arrows asks for confirmation first.",
        alternatives: ["delete", "remove", "erase"],
        examples: [
          { say: "delete Refund", command: { kind: "delete", target: { kind: "node", node: label("Refund") } } },
          { say: "remove the selected shape", command: { kind: "delete", target: { kind: "node", node: { kind: "focus" } } } },
        ],
      },
      {
        form: "<any command> the <shape kind>",
        purpose: "When the chart has only one shape of a kind, its kind names it — useful when the label is a long question. With two of them you are asked which.",
        alternatives: ["the start", "the process (step, action, task)", "the decision (choice, question)", "the end (finish, stop)"],
        examples: [
          { say: "delete the decision", command: { kind: "delete", target: { kind: "node", node: label("decision") } } },
          { say: "focus on the end", command: { kind: "focus", node: label("end") } },
        ],
      },
      {
        form: "delete the connection from <shape> to <shape>",
        purpose: "Removes one arrow, leaving both shapes in place.",
        alternatives: ["connection", "arrow", "link", "edge"],
        examples: [
          { say: "delete the connection from Start to Check payment", command: { kind: "delete", target: { kind: "edge", source: label("Start"), target: label("Check payment"), label: null } } },
        ],
      },
    ],
  },
  {
    title: "Test the chart",
    entries: [
      {
        form: "test chart / start test",
        purpose: "Starts guided playback at a Start shape without changing the chart.",
        examples: [
          { say: "test chart", command: { kind: "playback", action: "start", choice: null } },
          { say: "start test", command: { kind: "playback", action: "start", choice: null } },
        ],
      },
      {
        form: "repeat / restart test / stop test",
        purpose: "Repeats the current step, starts the route again, or closes guided playback.",
        alternatives: ["repeat step"],
        examples: [
          { say: "repeat", command: { kind: "playback", action: "repeat", choice: null } },
          { say: "restart test", command: { kind: "playback", action: "restart", choice: null } },
          { say: "stop test", command: { kind: "playback", action: "stop", choice: null } },
        ],
      },
      {
        form: "next / back / take <branch>",
        purpose: "While testing, moves through the recorded route or takes only the branch you name.",
        examples: [
          { say: "next", command: { kind: "walk", direction: "next", branch: null } },
          { say: "back", command: { kind: "walk", direction: "back", branch: null } },
          { say: "take Yes", command: { kind: "walk", direction: "next", branch: "Yes" } },
        ],
      },
    ],
  },
  {
    title: "Move the cursor",
    entries: [
      {
        form: "next / back",
        purpose: "Walks one step along the arrows, and says where you landed.",
        alternatives: ["next (go next, forward)", "back (go back, previous)"],
        examples: [
          { say: "next", command: { kind: "walk", direction: "next", branch: null } },
          { say: "go back", command: { kind: "walk", direction: "back", branch: null } },
        ],
      },
      {
        form: "take <branch>",
        purpose: "At a decision, follows the arrow with that label.",
        alternatives: ["take", "follow"],
        examples: [
          { say: "take No", command: { kind: "walk", direction: "next", branch: "No" } },
        ],
      },
      {
        form: "go to start / go to end / where am I",
        purpose: "Jumps to either end of the chart, or repeats your current position.",
        examples: [
          { say: "go to start", command: { kind: "walk", direction: "first", branch: null } },
          { say: "go to the end", command: { kind: "walk", direction: "last", branch: null } },
          { say: "where am I", command: { kind: "walk", direction: "stay", branch: null } },
        ],
      },
      {
        form: "focus on <shape> / clear selection",
        purpose: "Selects a shape by name, or drops the selection entirely.",
        alternatives: ["focus on", "focus", "select", "highlight", "clear selection", "deselect"],
        examples: [
          { say: "focus on Check payment", command: { kind: "focus", node: label("Check payment") } },
          { say: "select the last shape", command: { kind: "focus", node: { kind: "recent" } } },
          { say: "clear selection", command: { kind: "clear_focus" } },
        ],
      },
    ],
  },
  {
    title: "Ask about the chart",
    entries: [
      {
        form: "describe the chart / describe this",
        purpose: "Reads out the whole chart, or just the selected shape.",
        examples: [
          { say: "describe the chart", command: { kind: "describe", scope: "chart" } },
          { say: "describe this", command: { kind: "describe", scope: "focus" } },
        ],
      },
      {
        form: "inspect <shape>",
        purpose: "Lists what leads into and out of one shape.",
        examples: [
          { say: "inspect Check payment", command: { kind: "inspect", node: label("Check payment") } },
          { say: "inspect this", command: { kind: "inspect", node: null } },
        ],
      },
      {
        form: "trace the path from <shape> [to <shape>]",
        purpose: "Follows the route between two shapes, or onward from one.",
        examples: [
          { say: "trace the path from Start to End", command: { kind: "trace_path", start: label("Start"), end: label("End") } },
          { say: "trace the path from Start", command: { kind: "trace_path", start: label("Start"), end: null } },
        ],
      },
      {
        form: "check chart / validate the chart",
        purpose: "Opens a structured local review of unfinished or ambiguous chart structure.",
        alternatives: ["check the chart"],
        examples: [
          { say: "check chart", command: { kind: "audit", action: "open" } },
          { say: "validate the chart", command: { kind: "audit", action: "open" } },
        ],
      },
      {
        form: "next issue / previous issue / repeat issue / close check",
        purpose: "Moves through, repeats, or closes the current chart review.",
        examples: [
          { say: "next issue", command: { kind: "audit", action: "next" } },
          { say: "previous issue", command: { kind: "audit", action: "previous" } },
          { say: "repeat issue", command: { kind: "audit", action: "repeat" } },
          { say: "close check", command: { kind: "audit", action: "close" } },
        ],
      },
    ],
  },
  {
    title: "Take it back",
    entries: [
      {
        form: "undo / redo",
        purpose: "Steps back or forward through your edits. Walking the chart is not an edit.",
        examples: [
          { say: "undo", command: { kind: "undo" } },
          { say: "redo", command: { kind: "redo" } },
        ],
      },
      {
        form: "confirm / cancel",
        purpose: "Answers a pending question. Confirming a deletion is recognised word for word only, never approximately.",
        examples: [
          { say: "confirm", command: { kind: "confirm" } },
          { say: "cancel", command: { kind: "cancel" } },
        ],
      },
    ],
  },
];

/**
 * Deliberately outside the local syntax. Each of these is a request the templates could only
 * satisfy by guessing, so they are handed to the model whole. Documenting them keeps the
 * boundary honest: an author who learns the syntax also learns where it stops.
 */
export const modelOnly: { say: string; why: string }[] = [
  { say: "add three steps for onboarding", why: "Requires interpretation of the requested number and labels of new nodes." },
  { say: "delete everything", why: "Requests a bulk operation. Destructive changes require confirmation." },
  { say: "do not add a start node", why: "Contains negation and is not treated as a local add command." },
  { say: "move Start somewhere sensible", why: "Does not specify a destination or a position relative to another node." },
  { say: "label the arrow between Start and End Yes", why: "The local grammar does not support relabelling an existing arrow by its endpoints. Select the arrow to edit its label." },
];

export const grammarEntries = grammar.flatMap(section => section.entries);
export const grammarExamples = grammarEntries.flatMap(entry => entry.examples);
