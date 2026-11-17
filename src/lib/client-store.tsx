"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Candidate, HandleStore, ManualVerification } from "./types";

const KEY = "handlehunt:local:v1";
const initialStore = (): HandleStore => ({ version: 1, saved: [], checks: {} });

type StoreContextValue = {
  data: HandleStore;
  loaded: boolean;
  toggleSaved: (candidate: Candidate) => void;
  isSaved: (username: string) => boolean;
  recordCheck: (username: string, verification: ManualVerification | null) => void;
  clearSaved: () => void;
};
const StoreContext = createContext<StoreContextValue | null>(null);

function parseStore(text: string | null): HandleStore {
  if (!text) return initialStore();
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1) return initialStore();
    const data = value as HandleStore;
    if (!Array.isArray(data.saved) || !data.checks || typeof data.checks !== "object") return initialStore();
    return {
      version: 1,
      saved: data.saved.filter((item) => item && typeof item.username === "string" && /^[a-z]{3,6}$/.test(item.username)).slice(0, 2000),
      checks: Object.fromEntries(Object.entries(data.checks).filter(([name, verification]) =>
        /^[a-z]{3,6}$/.test(name) && verification &&
        ["appeared_claimable", "not_claimable", "claimed"].includes(verification.status)
      ))
    };
  } catch { return initialStore(); }
}

export function HandleStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<HandleStore>(initialStore);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setData(parseStore(window.localStorage.getItem(KEY)));
    setLoaded(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) setData(parseStore(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); }
    catch { /* Private browsing or storage quota: continue without persistence. */ }
  }, [data, loaded]);
  const toggleSaved = useCallback((candidate: Candidate) => {
    setData((old) => ({
      ...old,
      saved: old.saved.some((x) => x.username === candidate.username)
        ? old.saved.filter((x) => x.username !== candidate.username)
        : [candidate, ...old.saved].slice(0, 2000)
    }));
  }, []);
  const recordCheck = useCallback((username: string, verification: ManualVerification | null) => {
    if (!/^[a-z]{3,6}$/.test(username)) return;
    setData((old) => {
      const checks = { ...old.checks };
      if (verification) checks[username] = verification;
      else delete checks[username];
      return { ...old, checks };
    });
  }, []);
  const clearSaved = useCallback(() => setData((old) => ({ ...old, saved: [] })), []);
  const isSaved = useCallback((username: string) => data.saved.some((x) => x.username === username), [data.saved]);
  const context = useMemo(() => ({ data, loaded, toggleSaved, isSaved, recordCheck, clearSaved }),
    [data, loaded, toggleSaved, isSaved, recordCheck, clearSaved]);
  return <StoreContext.Provider value={context}>{children}</StoreContext.Provider>;
}

export function useHandleStore(): StoreContextValue {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useHandleStore must be used inside HandleStoreProvider");
  return store;
}
