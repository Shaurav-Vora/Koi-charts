function createSessionKeyPreference(storageKey: string) {
  const listeners = new Set<() => void>();
  const session = () => typeof sessionStorage === "undefined" ? null : sessionStorage;
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    read() {
      return session()?.getItem(storageKey)?.trim() ?? "";
    },
    readOnServer: () => "",
    write(key: string) {
      const value = key.trim();
      if (value) session()?.setItem(storageKey, value);
      else session()?.removeItem(storageKey);
      listeners.forEach(listener => listener());
    },
    clear() {
      session()?.removeItem(storageKey);
      listeners.forEach(listener => listener());
    },
  };
}
export const geminiKeyPreference = createSessionKeyPreference("koi-gemini-api-key");
export const assemblyKeyPreference = createSessionKeyPreference("koi-assemblyai-api-key");
