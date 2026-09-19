const storageKey = "koi-gemini-api-key";
const listeners = new Set<() => void>();
const session = () => typeof sessionStorage === "undefined" ? null : sessionStorage;
export const geminiKeyPreference = {
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
