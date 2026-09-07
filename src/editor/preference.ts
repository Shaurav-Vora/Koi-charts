/**
 * A remembered on/off choice, kept outside React so the server and the browser may disagree
 * without a hydration mismatch: the server cannot know what this machine chose last time.
 */
export function createPreference(key: string, fallback: boolean) {
  const listeners = new Set<() => void>();
  const read = () => {
    if (typeof localStorage === "undefined") return fallback;
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored === "on";
  };
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    read,
    readOnServer: () => fallback,
    write(on: boolean) { localStorage.setItem(key, on ? "on" : "off"); listeners.forEach(listener => listener()); },
  };
}

/**
 * Whether recognised phrasing runs from the local templates instead of the model. Turning it
 * off is a diagnostic escape hatch: if a template ever reads a phrase wrongly, the author can
 * hand everything back to interpretation without losing the ability to edit by voice.
 */
export const localCommandPreference = createPreference("koi-local-commands", true);
