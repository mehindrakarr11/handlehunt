"use client";

import {
  Bookmark,
  Check,
  Clipboard,
  ExternalLink,
  ShieldQuestion,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useHandleStore } from "@/lib/client-store";
import { STATUS_LABEL } from "@/lib/types";
import type { Candidate, ManualStatus } from "@/lib/types";

export function HandleCard({
  candidate,
  onVerify,
}: {
  candidate: Candidate;
  onVerify: (value: Candidate) => void;
}) {
  const { data, toggleSaved, isSaved } = useHandleStore();
  const [copied, setCopied] = useState(false);
  const saved = isSaved(candidate.username);
  const status: ManualStatus =
    data.checks[candidate.username]?.status || "UNVERIFIED";
  useEffect(() => {
    if (copied) {
      const timer = window.setTimeout(() => setCopied(false), 1600);
      return () => window.clearTimeout(timer);
    }
  }, [copied]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`@${candidate.username}`);
      setCopied(true);
    } catch {
      window.alert(
        "Clipboard permission was denied. Please select and copy the username manually.",
      );
    }
  }
  return (
    <article className="handle-card group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="dot dot-purple" />
          <span className="micro-label">{candidate.label}</span>
        </div>
        <button
          type="button"
          className={`icon-button ${saved ? "icon-button-selected" : ""}`}
          onClick={() => toggleSaved(candidate)}
          title={saved ? "Remove from saved" : "Save this handle"}
          aria-label={
            saved
              ? `Unsave ${candidate.username}`
              : `Save ${candidate.username}`
          }
        >
          <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="py-6">
        <p className="handle-name">
          <span className="text-[#9c83cc]">@</span>
          {candidate.username}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <span className="score-pill">
            <Star size={12} fill="currentColor" />
            {candidate.score} brand score
          </span>
          <span className="text-xs text-[#8e92a8]">
            {candidate.length} characters
          </span>
        </div>
      </div>
      <div className="line mb-3" />
      <button
        type="button"
        className={`status-chip status-${status}`}
        onClick={() => onVerify(candidate)}
        title="Open manual verification dialog"
      >
        <ShieldQuestion size={13} />
        {STATUS_LABEL[status]}
      </button>
      <div className="mt-4 flex gap-2">
        <button className="small-action flex-1" onClick={copy} type="button">
          {copied ? <Check size={15} /> : <Clipboard size={15} />}{" "}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          className="small-action small-action-prominent flex-1"
          onClick={() => onVerify(candidate)}
          type="button"
        >
          Verify <ExternalLink size={14} />
        </button>
      </div>
    </article>
  );
}
