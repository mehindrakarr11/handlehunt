"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";
import { useHandleStore } from "@/lib/client-store";
import type { Candidate, ManualVerification, ManualStatus } from "@/lib/types";

const STATUSES: { value: ManualStatus; title: string; text: string }[] = [
  {
    value: "UNVERIFIED",
    title: "Unverified",
    text: "No observation recorded.",
  },
  {
    value: "NEEDS_RECHECK",
    title: "Needs recheck",
    text: "An older observation needs to be checked again.",
  },
  {
    value: "REPORTED_AVAILABLE",
    title: "User-reported available",
    text: "Instagram’s username field appeared to allow it. Not guaranteed.",
  },
  {
    value: "REPORTED_UNAVAILABLE",
    title: "User-reported unavailable",
    text: "Instagram’s username field did not allow it.",
  },
  {
    value: "RESERVED_OR_UNKNOWN",
    title: "Reserved or unknown",
    text: "Instagram’s response was unclear or indicated a restriction.",
  },
  {
    value: "CLAIMED",
    title: "Claimed by you",
    text: "You successfully set this username on your account.",
  },
];

export function VerificationDialog({
  candidate,
  onClose,
}: {
  candidate: Candidate | null;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const [saving, setSaving] = useState(false);
  const { data, recordCheck } = useHandleStore();
  const checked = candidate ? data.checks[candidate.username] : undefined;
  const [status, setStatus] = useState<ManualStatus>(
    checked?.status || "UNVERIFIED",
  );
  const [note, setNote] = useState(checked?.note || "");
  useEffect(() => {
    setStatus(checked?.status || "UNVERIFIED");
    setNote(checked?.note || "");
  }, [candidate?.username, checked?.status, checked?.note]);
  useEffect(() => {
    if (!candidate) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const nodes = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          "button,a,input,textarea",
        ) || [],
      ).filter((el) => !el.hasAttribute("disabled"));
    nodes()[0]?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = nodes();
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [candidate, onClose]);
  if (!candidate) return null;
  async function save() {
    const verification: ManualVerification | null =
      status === "UNVERIFIED"
        ? null
        : {
            status,
            note: note.trim().slice(0, 280),
            checkedAt: new Date().toISOString(),
            method: "instagram_manual",
          };
    setSaving(true);
    if (await recordCheck(candidate!.username, verification)) onClose();
    setSaving(false);
  }
  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panel}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="eyebrow">
              <ShieldCheck size={13} /> MANUAL VERIFICATION
            </span>
            <h2
              className="mt-2 text-2xl font-bold tracking-tight text-white"
              id="verify-title"
            >
              Check{" "}
              <span className="text-[#bf94ff]">@{candidate.username}</span>
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close verification dialog"
          >
            <X size={19} />
          </button>
        </div>
        <div className="mt-5 rounded-xl border border-[#705036]/45 bg-amber-300/[0.055] p-4 flex items-start gap-3">
          <CircleAlert className="mt-0.5 shrink-0 text-amber-300" size={18} />
          <p className="text-sm leading-relaxed text-[#d2c0a7]">
            HandleHunt has <strong>not checked Instagram automatically</strong>.
            A blank or unavailable profile page does not prove a username can be
            claimed.
          </p>
        </div>
        <div className="mt-5 space-y-2 text-sm text-[#c8cada]">
          <p>
            <span className="step-number">1</span> Open Instagram and complete
            login, signup or OTP there. Never enter Instagram credentials into
            HandleHunt.
          </p>
          <p>
            <span className="step-number">2</span> Go to{" "}
            <strong>Profile → Edit profile → Username</strong> and try{" "}
            <strong>@{candidate.username}</strong>.
          </p>
          <p>
            <span className="step-number">3</span> Record only what Instagram
            shows. Its decision can change.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button text-sm"
            href="https://www.instagram.com/accounts/edit/"
          >
            Open Instagram settings <ArrowUpRight size={14} />
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="secondary-button text-sm"
            href={`https://www.instagram.com/${encodeURIComponent(candidate.username)}/`}
          >
            View profile URL <ExternalLink size={14} />
          </a>
        </div>
        <fieldset className="mt-6 space-y-2">
          <legend className="mb-3 text-sm font-semibold text-white">
            What did you observe?
          </legend>
          {STATUSES.map((item) => (
            <label
              key={item.value}
              className={`radio-option ${status === item.value ? "radio-option-selected" : ""}`}
            >
              <input
                type="radio"
                name="verification-status"
                value={item.value}
                checked={status === item.value}
                onChange={() => setStatus(item.value)}
                className="accent-[#b77afe]"
              />
              <span>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <label
          className="block mt-5 text-sm font-medium text-[#dfe0ee]"
          htmlFor="verification-note"
        >
          Optional note
        </label>
        <textarea
          id="verification-note"
          className="text-field mt-2 resize-y min-h-[66px]"
          maxLength={280}
          placeholder="e.g. Instagram showed ‘Username not available’"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {checked ? (
          <p className="mt-2 text-xs text-[#898ca5]">
            Previous record: {new Date(checked.checkedAt).toLocaleString()} ·
            This will be updated when you save.
          </p>
        ) : null}
        <div className="mt-6 flex gap-2 justify-end">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={saving}
            onClick={() => void save()}
          >
            <Check size={16} /> Save observation
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
