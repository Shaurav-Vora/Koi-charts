"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { createEditorCoordinator } from "./coordinator";

type EditorCoordinator = ReturnType<typeof createEditorCoordinator>;

const EditorSessionContext = createContext<EditorCoordinator | null>(null);

export function EditorSessionProvider({ children }: { children: ReactNode }) {
  const [coordinator] = useState(() => createEditorCoordinator());
  return <EditorSessionContext.Provider value={coordinator}>{children}</EditorSessionContext.Provider>;
}

export function useEditorSessionCoordinator(): EditorCoordinator {
  const coordinator = useContext(EditorSessionContext);
  if (!coordinator) throw new Error("EditorSessionProvider is required.");
  return coordinator;
}

export function useOptionalEditorSessionCoordinator(): EditorCoordinator | null {
  return useContext(EditorSessionContext);
}
