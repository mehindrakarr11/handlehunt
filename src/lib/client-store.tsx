"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Candidate,
  HandleStore,
  ManualVerification,
  VerificationEvent,
} from "./types";
import {
  candidateSchema,
  isValidUsername,
  verificationSchema,
} from "./validation";
import { browserClient } from "./supabase/browser";
import { supabaseConfigured } from "./supabase/config";
import { canTransition } from "./verification/transitions";
const KEY = "handlehunt:local:v1";
const empty = (): HandleStore => ({
  version: 2,
  saved: [],
  checks: Object.create(null),
  events: [],
});
type StoreContextValue = {
  data: HandleStore;
  loaded: boolean;
  email: string | null;
  mode: "demo" | "cloud";
  message: string;
  notify: (message: string) => void;
  toggleSaved: (candidate: Candidate) => Promise<void>;
  isSaved: (name: string) => boolean;
  recordCheck: (name: string, v: ManualVerification | null) => Promise<boolean>;
  clearSaved: () => Promise<void>;
};
const Context = createContext<StoreContextValue | null>(null);
export function parseStore(text: string | null): HandleStore {
  try {
    const raw = JSON.parse(text || "null");
    if (!raw || ![1, 2].includes(raw.version)) return empty();
    const saved: Candidate[] = Array.isArray(raw.saved)
      ? raw.saved
          .flatMap((c: unknown) => {
            const p = candidateSchema.safeParse(c);
            return p.success ? [p.data] : [];
          })
          .slice(0, 2000)
      : [];
    const legacy: Record<string, string> = {
      appeared_claimable: "REPORTED_AVAILABLE",
      not_claimable: "REPORTED_UNAVAILABLE",
      claimed: "CLAIMED",
    };
    const checks: Record<string, ManualVerification> = Object.create(null);
    const parseVerification = (
      name: string,
      value: unknown,
    ): ManualVerification | null => {
      if (!value || typeof value !== "object") return null;
      const v = value as ManualVerification;
      const parsed = verificationSchema.safeParse({
        username: name,
        status: legacy[v.status] || v.status,
        note: String(v.note || "").slice(0, 280),
        method: v.method ?? "instagram_manual",
      });
      if (!parsed.success || !Number.isFinite(Date.parse(v.checkedAt)))
        return null;
      return {
        status: parsed.data.status,
        note: parsed.data.note,
        method: parsed.data.method,
        checkedAt: v.checkedAt,
      };
    };
    for (const [name, value] of Object.entries(raw.checks || {})) {
      const v = parseVerification(name, value);
      if (isValidUsername(name) && v) checks[name] = v;
    }
    const events: VerificationEvent[] = Array.isArray(raw.events)
      ? raw.events
          .flatMap((e: VerificationEvent) => {
            if (!e || typeof e.id !== "string" || !isValidUsername(e.username))
              return [];
            const v = parseVerification(e.username, e);
            return v ? [{ ...v, id: e.id, username: e.username }] : [];
          })
          .slice(0, 2000)
      : [];
    return {
      version: 2,
      saved: [...new Map(saved.map((c) => [c.username, c])).values()],
      checks,
      events,
    };
  } catch {
    return empty();
  }
}
export async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, init);
  const body = await r.json();
  if (!r.ok || !body.ok)
    throw new Error(body.error?.message || "Request failed.");
  return body.data;
}
export function HandleStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<HandleStore>(empty);
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [message, notify] = useState("");
  const mode: "demo" | "cloud" = supabaseConfigured() ? "cloud" : "demo";
  useEffect(() => {
    let active = true;
    let revision = 0;
    async function load() {
      const current = ++revision;
      const isCurrent = () => active && revision === current;
      try {
        if (mode === "demo") {
          let text = null;
          try {
            text = localStorage.getItem(KEY);
          } catch {
            notify(
              "Browser storage is unavailable; changes last for this session only.",
            );
          }
          if (isCurrent()) setData(parseStore(text));
        } else {
          const client = browserClient()!;
          const {
            data: { user },
            error,
          } = await client.auth.getUser();
          if (error && user) throw error;
          if (isCurrent()) setEmail(user?.email || null);
          if (user) {
            const saved: Candidate[] = [];
            const checks: Record<string, ManualVerification> =
              Object.create(null);
            for (let page = 1; page <= 20; page++) {
              const rows = await api(`/api/handles?page=${page}&limit=100`);
              if (rows.total > 2000)
                notify(
                  "Showing your newest 2,000 saved handles. Use the paginated API to access older records.",
                );
              saved.push(
                ...rows.items.flatMap((r: { candidate: unknown }) => {
                  const candidate = candidateSchema.safeParse(r.candidate);
                  return candidate.success ? [candidate.data] : [];
                }),
              );
              if (page * 100 >= rows.total) break;
            }
            for (let page = 1; page <= 20; page++) {
              const rows = await api(
                `/api/verifications?current=1&page=${page}&limit=100`,
              );
              if (rows.total > 2000)
                notify(
                  "Showing your newest 2,000 verification summaries; full history remains available.",
                );
              for (const r of rows.items)
                checks[r.username] = {
                  status: r.status,
                  checkedAt: r.checked_at,
                  method: r.method,
                  note: r.note,
                };
              if (page * 100 >= rows.total) break;
            }
            if (isCurrent()) setData({ version: 2, saved, checks, events: [] });
          }
        }
      } catch (e) {
        if (isCurrent())
          notify(e instanceof Error ? e.message : "Unable to load data.");
      } finally {
        if (isCurrent()) setLoaded(true);
      }
    }
    void load();
    const refresh = () => {
      setData(empty());
      setEmail(null);
      setLoaded(false);
      void load();
    };
    window.addEventListener("handlehunt:auth", refresh);
    const storage = (e: StorageEvent) => {
      if (mode === "demo" && e.key === KEY) setData(parseStore(e.newValue));
    };
    window.addEventListener("storage", storage);
    return () => {
      active = false;
      window.removeEventListener("handlehunt:auth", refresh);
      window.removeEventListener("storage", storage);
    };
  }, [mode]);
  useEffect(() => {
    const client = browserClient();
    if (!client) return;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setData(empty());
        setEmail(null);
      }
      if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) {
        queueMicrotask(() =>
          window.dispatchEvent(new Event("handlehunt:auth")),
        );
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (loaded && mode === "demo") {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch {
        notify("Could not save to browser storage. Export a CSV backup.");
      }
    }
  }, [data, loaded, mode]);
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => notify(""), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);
  const toggleSaved = useCallback(
    async (c: Candidate) => {
      if (!loaded) return;
      try {
        const exists = data.saved.some((x) => x.username === c.username);
        if (!exists && data.saved.length >= 2000)
          throw new Error(
            "Collection limit reached. Export a CSV and remove older handles.",
          );
        if (mode === "cloud") {
          if (!email)
            throw new Error("Sign in to save handles to your account.");
          if (exists) {
            const rows = await api(
              `/api/handles?search=${encodeURIComponent(c.username)}&exact=1&limit=1`,
            );
            const row = rows.items.find(
              (r: { username: string }) => r.username === c.username,
            );
            if (!row) throw new Error("Refresh to reload this handle.");
            await api(`/api/handles/${row.id}`, { method: "DELETE" });
          } else
            await api("/api/handles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(c),
            });
        }
        setData((old) => ({
          ...old,
          saved: exists
            ? old.saved.filter((x) => x.username !== c.username)
            : [c, ...old.saved],
        }));
        notify(exists ? "Removed from saved handles" : "Handle saved");
      } catch (e) {
        notify(e instanceof Error ? e.message : "Save failed.");
      }
    },
    [data.saved, email, loaded, mode],
  );
  const recordCheck = useCallback(
    async (name: string, v: ManualVerification | null) => {
      try {
        if (!loaded || !isValidUsername(name)) return false;
        const verification = v
          ? { ...v }
          : {
              status: "UNVERIFIED" as const,
              checkedAt: new Date().toISOString(),
              method: "instagram_manual" as const,
              note: "",
            };
        verificationSchema.parse({
          username: name,
          status: verification.status,
          method: verification.method,
          note: verification.note,
        });
        if (
          !canTransition(
            data.checks[name]?.status || "UNVERIFIED",
            verification.status,
          )
        )
          throw new Error("Mark a claimed handle as Needs recheck first.");
        let eventId = crypto.randomUUID();
        if (mode === "cloud") {
          const row = await api("/api/verifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: name,
              status: verification.status,
              method: verification.method,
              note: verification.note,
            }),
          });
          verification.checkedAt = row.checked_at;
          eventId = row.event_id;
        }
        setData((old) => ({
          ...old,
          checks: Object.assign(Object.create(null), old.checks, {
            [name]: verification,
          }),
          events: [
            { ...verification, username: name, id: eventId },
            ...old.events,
          ].slice(0, 2000),
        }));
        notify("Manual observation recorded");
        return true;
      } catch (e) {
        notify(
          e instanceof Error ? e.message : "Could not record observation.",
        );
        return false;
      }
    },
    [data.checks, loaded, mode],
  );
  const clearSaved = useCallback(async () => {
    if (mode === "cloud") {
      notify(
        "Remove cloud handles individually to avoid accidental bulk deletion.",
      );
      return;
    }
    setData((old) => ({ ...old, saved: [] }));
  }, [mode]);
  const isSaved = useCallback(
    (name: string) => data.saved.some((c) => c.username === name),
    [data.saved],
  );
  const value = useMemo(
    () => ({
      data,
      loaded,
      email,
      mode,
      message,
      notify,
      toggleSaved,
      isSaved,
      recordCheck,
      clearSaved,
    }),
    [
      data,
      loaded,
      email,
      mode,
      message,
      toggleSaved,
      isSaved,
      recordCheck,
      clearSaved,
    ],
  );
  return (
    <Context.Provider value={value}>
      {children}
      {message && (
        <div role="status" className="toast">
          {message}
        </div>
      )}
    </Context.Provider>
  );
}
export function useHandleStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing HandleStoreProvider");
  return value;
}
