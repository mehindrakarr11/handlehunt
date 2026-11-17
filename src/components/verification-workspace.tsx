"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, useHandleStore } from "@/lib/client-store";
import {
  STATUS_LABEL,
  type Candidate,
  type ManualStatus,
  type VerificationEvent,
} from "@/lib/types";
import { VerificationDialog } from "./verification-dialog";
export function VerificationWorkspace({
  history = false,
}: {
  history?: boolean;
}) {
  const { data, mode, loaded } = useHandleStore();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [status, setStatus] = useState("all");
  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!history || mode !== "cloud") return;
    let active = true;
    setLoading(true);
    setError("");
    api(
      `/api/verifications?page=${page}&limit=24&search=${encodeURIComponent(search)}`,
    )
      .then((rows) => {
        if (active) {
          setEvents(
            rows.items.map(
              (r: {
                id: string;
                username: string;
                status: ManualStatus;
                method: "instagram_manual";
                note: string;
                created_at: string;
              }) => ({
                id: r.id,
                username: r.username,
                status: r.status,
                method: r.method,
                note: r.note,
                checkedAt: r.created_at,
              }),
            ),
          );
          setTotal(rows.total);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [history, mode, page, search]);
  const queue = data.saved.filter(
    (c) =>
      c.username.includes(search.toLowerCase().replace(/^@/, "")) &&
      (status === "all" ||
        (data.checks[c.username]?.status || "UNVERIFIED") === status),
  );
  const localEvents = data.events.filter((e) =>
    e.username.includes(search.toLowerCase().replace(/^@/, "")),
  );
  const items =
    mode === "cloud" ? events : localEvents.slice((page - 1) * 24, page * 24);
  const count = history
    ? mode === "cloud"
      ? total
      : localEvents.length
    : queue.length;
  function nextInQueue() {
    const candidate = data.saved.find((c) => checked.includes(c.username));
    if (candidate) setSelected(candidate);
  }
  return (
    <main className="main-wrap py-10 min-h-[75vh]">
      <span className="eyebrow">MANUAL OBSERVATIONS · NEVER API VERIFIED</span>
      <h1 className="heading-large mt-3">
        {history ? "Every check has a story." : "Your verification queue."}
      </h1>
      <p className="lead mt-4 max-w-3xl">
        {history
          ? "Review timestamped, user-reported observations. A previous result never guarantees current claimability."
          : "Shortlist candidates in Discover, select them here, then test each in Instagram’s official username field. Complete Instagram login, signup and OTP only on Instagram."}
      </p>
      <div className="notice-strip mt-6">
        No officially authorized availability integration is configured. A
        missing profile or 404 does not prove availability.
      </div>
      <div className="flex flex-wrap gap-3 mt-6">
        <label className="flex-1 max-w-md">
          <span className="sr-only">Search usernames</span>
          <input
            className="text-field"
            maxLength={32}
            placeholder="Search usernames"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value.replace(/[^a-zA-Z0-9._]/g, ""));
              setPage(1);
            }}
          />
        </label>
        {!history && (
          <>
            <select
              className="text-field !w-auto"
              aria-label="Filter by verification status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <button
              className="primary-button"
              disabled={!checked.length}
              onClick={nextInQueue}
            >
              Review selected ({checked.length})
            </button>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="error-panel mt-5">
          {error}
        </p>
      )}
      {!loaded || loading ? (
        <div role="status" className="skeleton h-48 mt-6">
          <span className="sr-only">Loading records</span>
        </div>
      ) : history ? (
        <div className="table-wrap mt-6">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Observation</th>
                <th>Checked at</th>
                <th>Method</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td>@{e.username}</td>
                  <td>{STATUS_LABEL[e.status]}</td>
                  <td>{new Date(e.checkedAt).toLocaleString()}</td>
                  <td>Instagram · manual</td>
                  <td className="!whitespace-normal max-w-xs">
                    {e.note || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && (
            <p className="empty-state">No verification history yet.</p>
          )}
        </div>
      ) : (
        <div className="table-wrap mt-6">
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Username</th>
                <th>Latest observation</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.slice((page - 1) * 24, page * 24).map((c) => (
                <tr key={c.username}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${c.username}`}
                      checked={checked.includes(c.username)}
                      onChange={(e) =>
                        setChecked((old) =>
                          e.target.checked
                            ? [...old, c.username]
                            : old.filter((n) => n !== c.username),
                        )
                      }
                    />
                  </td>
                  <td>@{c.username}</td>
                  <td>
                    {
                      STATUS_LABEL[
                        data.checks[c.username]?.status || "UNVERIFIED"
                      ]
                    }
                  </td>
                  <td>
                    <button
                      className="small-action"
                      onClick={() => setSelected(c)}
                    >
                      Review manually
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!queue.length && (
            <div className="empty-state">
              Save candidates from{" "}
              <Link className="underline" href="/discover">
                Discover
              </Link>{" "}
              to build your queue.
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mt-6">
        <button
          className="secondary-button"
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span className="text-sm">
          Page {page} · {count} {history ? "events" : "handles"}
        </span>
        <button
          className="secondary-button"
          disabled={page * 24 >= count || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      <VerificationDialog
        candidate={selected}
        onClose={() => {
          if (selected)
            setChecked((old) => old.filter((n) => n !== selected.username));
          setSelected(null);
        }}
      />
    </main>
  );
}
