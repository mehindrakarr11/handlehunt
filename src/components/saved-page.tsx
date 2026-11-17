"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Bookmark, Download, Search, Trash2 } from "lucide-react";
import { useHandleStore } from "@/lib/client-store";
import { downloadCsv } from "@/lib/csv";
import type { Candidate } from "@/lib/types";
import { HandleCard } from "./handle-card";
import { VerificationDialog } from "./verification-dialog";

export function SavedPage() {
  const { data, clearSaved, loaded, mode } = useHandleStore();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("score");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const handles = useMemo(
    () =>
      data.saved
        .filter((handle) =>
          handle.username.includes(
            search.trim().replace(/^@/, "").toLowerCase(),
          ),
        )
        .sort((a, b) =>
          sort === "alpha"
            ? a.username.localeCompare(b.username)
            : sort === "short"
              ? a.length - b.length
              : b.score - a.score,
        ),
    [data.saved, search, sort],
  );
  return (
    <main className="main-wrap min-h-[72vh] pb-20">
      <div className="pt-10 space-y-3">
        <span className="eyebrow">
          <Bookmark size={13} /> YOUR PRIVATE COLLECTION
        </span>
        <h1 className="heading-large">
          The shortlist <span className="gradient-text">worth keeping.</span>
        </h1>
        <p className="lead max-w-2xl">
          Keep your favourite handles together. Track your own manual checks and
          export your list when you&apos;re ready.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="search-control max-w-md flex-1 min-w-[220px]">
          <Search size={16} />
          <input
            aria-label="Filter saved handles"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search saved usernames..."
          />
        </div>
        <button
          className="secondary-button"
          disabled={!handles.length}
          type="button"
          onClick={() =>
            downloadCsv(handles, data.checks, "handlehunt-saved.csv")
          }
        >
          <Download size={16} /> Export CSV
        </button>
        <button
          className="secondary-button"
          disabled={!data.saved.length || mode === "cloud"}
          title={
            mode === "cloud"
              ? "Remove cloud handles individually"
              : "Clear this local collection"
          }
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "Remove all saved handles? Your manual verification notes will remain.",
              )
            )
              clearSaved();
          }}
        >
          <Trash2 size={16} /> Clear saved
        </button>
      </div>
      <p className="mt-4 text-xs text-[#8f91a5]">
        {loaded ? handles.length : "—"} saved names ·{" "}
        {mode === "demo"
          ? "Local-only data in this browser"
          : "Private cloud collection"}
      </p>
      {handles.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {handles
            .slice(
              (Math.min(page, Math.max(1, Math.ceil(handles.length / 24))) -
                1) *
                24,
              Math.min(page, Math.max(1, Math.ceil(handles.length / 24))) * 24,
            )
            .map((item) => (
              <HandleCard
                key={item.username}
                candidate={item}
                onVerify={setSelected}
              />
            ))}
        </div>
      ) : (
        <div className="empty-state mt-8">
          <Bookmark size={32} className="mb-4 mx-auto text-purple-300" />
          <h2 className="text-xl font-semibold text-white">
            {search ? "No saved matches" : "Your collection starts here"}
          </h2>
          <p className="mt-2 text-[#9b9eb4]">
            {search
              ? "Try a different search."
              : "Head to Discover and bookmark the names you love."}
          </p>
          <Link className="primary-button mt-6" href="/discover">
            Find new handles <ArrowRight size={16} />
          </Link>
        </div>
      )}
      <div className="flex flex-wrap gap-3 items-center mt-6">
        <label>
          Sort{" "}
          <select
            className="text-field"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="score">Top score</option>
            <option value="alpha">A to Z</option>
            <option value="short">Shortest</option>
          </select>
        </label>
        <button
          className="secondary-button"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span>
          Page {Math.min(page, Math.max(1, Math.ceil(handles.length / 24)))}
        </span>
        <button
          className="secondary-button"
          disabled={page * 24 >= handles.length}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      <VerificationDialog
        candidate={selected}
        onClose={() => setSelected(null)}
      />
    </main>
  );
}
