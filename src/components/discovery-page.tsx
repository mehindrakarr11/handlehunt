"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Download,
  Filter,
  Hash,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldQuestion,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { HandleCard } from "./handle-card";
import { VerificationDialog } from "./verification-dialog";
import { useHandleStore } from "@/lib/client-store";
import { downloadCsv } from "@/lib/csv";
import { STATUS_LABEL, DEFAULT_OPTIONS } from "@/lib/types";
import type { Candidate, GenerateOptions } from "@/lib/types";

type SortOrder = "score" | "short" | "alpha";

const STYLES: { id: GenerateOptions["style"]; name: string; detail: string }[] =
  [
    { id: "balanced", name: "Balanced", detail: "A little of everything" },
    { id: "words", name: "Real words", detail: "Curated dictionary" },
    { id: "invented", name: "Invented", detail: "Brandable & fresh" },
    { id: "minimal", name: "Minimal", detail: "Short, clean letters" },
    { id: "aesthetic", name: "Aesthetic", detail: "Soft, flowing sounds" },
    { id: "brand", name: "Brand-like", detail: "A distinctive identity" },
    { id: "random", name: "Random", detail: "Explore combinations" },
    { id: "og", name: "OG names", detail: "2–5 clean letters" },
  ];

export function DiscoveryPage() {
  const { data, loaded, mode, toggleSaved, isSaved } = useHandleStore();
  const [options, setOptions] = useState<GenerateOptions>(DEFAULT_OPTIONS);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("score");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [onlySaved, setOnlySaved] = useState(false);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [lastRun, setLastRun] = useState<GenerateOptions | null>(null);

  const generate = useCallback(async (input: GenerateOptions) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Generation failed.");
      setCandidates(body.data.candidates || []);
      setPage(1);
      setLastRun(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void generate(DEFAULT_OPTIONS);
  }, [generate]);
  function update<K extends keyof GenerateOptions>(
    key: K,
    value: GenerateOptions[K],
  ) {
    setOptions((old) => ({ ...old, [key]: value }));
  }
  const results = useMemo(() => {
    const text = search.toLowerCase().trim().replace(/^@/, "");
    const filtered = candidates.filter(
      (c) =>
        c.username.includes(text) &&
        (!onlySaved || data.saved.some((s) => s.username === c.username)),
    );
    return filtered.sort((a, b) => {
      if (sort === "short") return a.length - b.length || b.score - a.score;
      if (sort === "alpha") return a.username.localeCompare(b.username);
      return b.score - a.score || a.username.localeCompare(b.username);
    });
  }, [candidates, search, sort, onlySaved, data.saved]);
  const checkedCount = candidates.filter((c) => data.checks[c.username]).length;

  return (
    <main className="main-wrap pb-20">
      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] hero-panel mt-8 p-6 sm:p-9 lg:p-12">
        <div className="hero-glow" aria-hidden="true" />
        <div className="relative z-10 max-w-3xl">
          <span className="eyebrow">
            <span className="pulse-dot" /> THE RARE HANDLE DISCOVERY STUDIO
          </span>
          <h1 className="heading-large mt-5">
            Your next identity
            <br />
            starts with <span className="gradient-text">@something.</span>
          </h1>
          <p className="lead mt-5 max-w-xl">
            Discover short, memorable username ideas. Curated real words,
            brandable inventions, and clean combinations—all in one creative
            workspace.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-[#acacc3]">
            <span className="hero-label">
              <Check size={13} /> 2–10 character names
            </span>
            <span className="hero-label">
              <Sparkles size={13} /> Ranked by brandability
            </span>
            <span className="hero-label">
              <ShieldQuestion size={13} /> Honest verification
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="art-big">@</span>
          <span className="art-handle art-one">@aevyn</span>
          <span className="art-handle art-two">@lumen</span>
          <span className="art-handle art-three">@vexa</span>
        </div>
      </section>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Hash size={18} />}
          value={candidates.length.toString()}
          name="Names generated"
          note="Current batch"
        />
        <StatCard
          icon={<Bookmark size={18} />}
          value={loaded ? data.saved.length.toString() : "—"}
          name="Saved handles"
          note={
            mode === "demo"
              ? "Local demo · this browser"
              : "Your HandleHunt account"
          }
        />
        <StatCard
          icon={<ShieldQuestion size={18} />}
          value={checkedCount.toString()}
          name="Manually reviewed"
          note="Current batch"
        />
      </div>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[322px_minmax(0,1fr)]">
        <aside className="surface-card lg:sticky lg:top-6 p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="section-title">
              <SlidersHorizontal size={19} className="text-purple-300" />{" "}
              Discovery settings
            </h2>
            <button
              type="button"
              className="text-xs text-[#bba0fb] hover:text-white"
              onClick={() => setOptions(DEFAULT_OPTIONS)}
            >
              Reset
            </button>
          </div>
          <div className="line" />
          <div>
            <label className="field-label" htmlFor="min-length">
              Name length
            </label>
            <div className="flex items-center gap-3">
              <select
                id="min-length"
                className="text-field"
                value={options.minLength}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setOptions((old) => ({
                    ...old,
                    minLength: num,
                    maxLength: Math.max(num, old.maxLength),
                  }));
                }}
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} characters
                  </option>
                ))}
              </select>
              <span className="text-[#7d8095]">to</span>
              <select
                className="text-field"
                aria-label="Maximum name length"
                value={options.maxLength}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setOptions((old) => ({
                    ...old,
                    minLength: Math.min(num, old.minLength),
                    maxLength: num,
                  }));
                }}
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} characters
                  </option>
                ))}
              </select>
            </div>
          </div>
          <fieldset>
            <legend className="field-label mb-2">Generation style</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {STYLES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`style-card ${options.style === item.id ? "style-card-active" : ""}`}
                  onClick={() => update("style", item.id)}
                >
                  <span className="text-sm font-semibold">{item.name}</span>
                  <span className="text-[11px] opacity-65">{item.detail}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="field-label" htmlFor="inspiration">
              Inspired by{" "}
              <span className="text-[#797d91] font-normal">(optional)</span>
            </label>
            <input
              id="inspiration"
              className="text-field"
              value={options.inspiration}
              maxLength={24}
              onChange={(e) => update("inspiration", e.target.value)}
              placeholder="e.g. rohan, heaven"
            />
            <p className="field-hint">An idea, not a guaranteed substring.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="starts-with">
                Starts with
              </label>
              <input
                id="starts-with"
                className="text-field"
                maxLength={10}
                placeholder="e.g. ro"
                value={options.startsWith}
                onChange={(e) => update("startsWith", e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="contains">
                Contains
              </label>
              <input
                id="contains"
                className="text-field"
                maxLength={10}
                placeholder="e.g. ae"
                value={options.contains}
                onChange={(e) => update("contains", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="ends-with">
              Ends with
            </label>
            <input
              id="ends-with"
              className="text-field"
              maxLength={10}
              placeholder="e.g. on"
              value={options.endsWith}
              onChange={(e) => update("endsWith", e.target.value)}
            />
          </div>
          <div className="grid gap-3">
            <label className="field-label">
              Required keyword
              <input
                className="text-field mt-2"
                maxLength={10}
                value={options.keyword}
                onChange={(e) => update("keyword", e.target.value)}
                placeholder="e.g. sky"
              />
            </label>
            <label className="field-label">
              Pattern
              <input
                className="text-field mt-2"
                maxLength={10}
                value={options.pattern}
                onChange={(e) => update("pattern", e.target.value)}
                placeholder="e.g. ??_?? or sky##"
              />
              <span className="field-hint">
                ? letter · # digit · other characters are literal
              </span>
            </label>
            {(["allowNumbers", "allowUnderscores", "allowDots"] as const).map(
              (key) => (
                <label className="flex justify-between text-sm" key={key}>
                  {key === "allowNumbers"
                    ? "Allow numbers"
                    : key === "allowUnderscores"
                      ? "Allow underscores"
                      : "Allow dots"}
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={(e) => update(key, e.target.checked)}
                  />
                </label>
              ),
            )}
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <label
                htmlFor="require-vowel"
                className="text-sm font-medium text-[#e2e0ed]"
              >
                Require a vowel
              </label>
              <p className="field-hint">Improve pronounceability</p>
            </div>
            <input
              id="require-vowel"
              type="checkbox"
              className="toggle"
              checked={options.requireVowel}
              onChange={(e) => update("requireVowel", e.target.checked)}
            />
          </div>
          <div>
            <div className="mb-2 flex justify-between">
              <label className="field-label mb-0" htmlFor="count">
                Names per batch
              </label>
              <span className="text-sm font-semibold text-[#c8a2ff]">
                {options.count}
              </span>
            </div>
            <input
              type="range"
              id="count"
              min={10}
              max={100}
              step={2}
              value={options.count}
              className="accent-[#ab7aff] w-full"
              onChange={(e) => update("count", Number(e.target.value))}
            />
            <div className="flex justify-between text-[11px] text-[#77798e]">
              <span>10</span>
              <span>100</span>
            </div>
          </div>
          <button
            type="button"
            className="primary-button w-full justify-center !py-3.5"
            disabled={loading}
            onClick={() => void generate(options)}
          >
            {loading ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <WandSparkles size={18} />
            )}{" "}
            {loading ? "Generating…" : "Generate usernames"}
            <ArrowRight size={17} />
          </button>
          <p className="text-[11px] leading-relaxed text-[#777b91] text-center">
            Names are generated without querying Instagram. Availability is
            always unverified until you check it yourself.
          </p>
        </aside>
        <section className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="eyebrow">
                <span className="dot dot-purple" /> DISCOVERY RESULTS
              </span>
              <h2 className="mt-1 text-[24px] font-bold tracking-tight text-white">
                Your handle shortlist
              </h2>
              <p className="mt-1 text-sm text-[#8e91aa]">
                {lastRun
                  ? `${lastRun.minLength}–${lastRun.maxLength} characters · ${STYLE_LABEL(lastRun.style)} · `
                  : ""}
                Every result is unverified by default.
              </p>
            </div>
            <button
              className="secondary-button !py-2.5 !px-3"
              type="button"
              disabled={loading}
              onClick={() => void generate(options)}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
              New batch
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="search-control flex-1 min-w-[190px]">
              <Search size={16} />
              <input
                aria-label="Search current batch"
                placeholder="Filter this batch..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  type="button"
                  aria-label="Clear filter"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="select-shell">
              <Filter size={15} />
              <select
                value={sort}
                aria-label="Sort results"
                onChange={(e) => setSort(e.target.value as SortOrder)}
              >
                <option value="score">Top score</option>
                <option value="short">Shortest</option>
                <option value="alpha">A to Z</option>
              </select>
              <ChevronDown size={14} />
            </div>
            <button
              type="button"
              className={`secondary-button !px-3 !py-2.5 ${onlySaved ? "filter-active" : ""}`}
              onClick={() => {
                setOnlySaved((old) => !old);
                setPage(1);
              }}
            >
              <Bookmark size={15} />
              <span className="hidden sm:inline">Only saved</span>
            </button>
            <button
              type="button"
              className="secondary-button !px-3 !py-2.5"
              disabled={!results.length}
              title="Export current filtered results to CSV"
              onClick={() => downloadCsv(results, data.checks)}
            >
              <Download size={15} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="secondary-button"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              Grid
            </button>
            <button
              type="button"
              className="secondary-button"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              Table
            </button>
          </div>
          {loading && (
            <div role="status" className="progress-track">
              <span />
              Generating a batch of up to {options.count} names…
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-[#8b8fa6]">
            <span>
              Showing{" "}
              <strong className="text-white font-medium">
                {results.length}
              </strong>{" "}
              of {candidates.length} candidates
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldQuestion size={13} /> No automated availability checks
            </span>
          </div>
          {error ? (
            <div role="alert" className="error-panel">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          ) : null}
          {loading && !candidates.length ? (
            <div className="empty-state">
              <LoaderCircle
                className="mx-auto mb-3 animate-spin text-purple-300"
                size={28}
              />
              Generating your first batch…
            </div>
          ) : results.length ? (
            <>
              {view === "grid" ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {results.slice((page - 1) * 24, page * 24).map((item) => (
                    <HandleCard
                      key={item.username}
                      candidate={item}
                      onVerify={setSelected}
                    />
                  ))}
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Brand score</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.slice((page - 1) * 24, page * 24).map((item) => (
                        <tr key={item.username}>
                          <td>@{item.username}</td>
                          <td>{item.score}</td>
                          <td>
                            {
                              STATUS_LABEL[
                                data.checks[item.username]?.status ||
                                  "UNVERIFIED"
                              ]
                            }
                          </td>
                          <td>
                            <button
                              className="small-action"
                              onClick={() => void toggleSaved(item)}
                            >
                              {isSaved(item.username) ? "Unsave" : "Save"}
                            </button>
                            <button
                              className="small-action"
                              onClick={() => setSelected(item)}
                            >
                              Verify
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex items-center justify-between">
                <button
                  className="secondary-button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="text-sm">
                  Page {page} of {Math.max(1, Math.ceil(results.length / 24))}
                </span>
                <button
                  className="secondary-button"
                  disabled={page * 24 >= results.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Search size={27} className="mb-3 mx-auto text-purple-300" />
              <h3 className="font-semibold text-white">No matching handles</h3>
              <p className="mt-2 text-sm text-[#9699af]">
                Try another filter, a shorter required pattern, or a new batch.
                The real-word pool is deliberately limited.
              </p>
              <button
                type="button"
                className="secondary-button mt-5"
                onClick={() => {
                  setSearch("");
                  setOnlySaved(false);
                }}
              >
                <RefreshCw size={14} /> Clear filters
              </button>
            </div>
          )}
          <div className="notice-strip">
            <ShieldQuestion size={19} className="shrink-0 text-[#c5a9ff]" />
            <p>
              <strong>Important:</strong> A name generated here is not
              necessarily available on Instagram. Use <em>Verify</em> to check
              it manually in Instagram and record your observation.
            </p>
          </div>
        </section>
      </div>
      <VerificationDialog
        candidate={selected}
        onClose={() => setSelected(null)}
      />
    </main>
  );
}

function STYLE_LABEL(style: GenerateOptions["style"]) {
  return STYLES.find((entry) => entry.id === style)?.name || "Mixed";
}
function StatCard({
  icon,
  value,
  name,
  note,
}: {
  icon: React.ReactNode;
  value: string;
  name: string;
  note: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="text-[23px] leading-tight font-bold tracking-tight text-white">
          {value}
        </div>
        <div className="text-sm text-[#cbc9df]">{name}</div>
        <div className="text-[11px] text-[#82859c] mt-0.5">{note}</div>
      </div>
    </div>
  );
}
