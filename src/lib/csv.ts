import type { Candidate, ManualVerification } from "./types";

function cell(value: string | number): string {
  // Protect spreadsheet programs from CSV formula injection if this is extended to user-supplied data.
  const str = String(value);
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function makeCsv(
  items: Candidate[],
  checks: Record<string, ManualVerification>,
): string {
  const rows = [
    [
      "username",
      "brand_score",
      "length",
      "name_type",
      "manual_status",
      "checked_at",
      "note",
      "verification_method",
    ],
    ...items.map((item) => [
      item.username,
      item.score,
      item.length,
      item.label,
      checks[item.username]?.status || "UNVERIFIED",
      checks[item.username]?.checkedAt || "",
      checks[item.username]?.note || "",
      checks[item.username]?.method || "",
    ]),
  ];
  return rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

export function downloadCsv(
  items: Candidate[],
  checks: Record<string, ManualVerification>,
  filename = "handlehunt-candidates.csv",
) {
  const csv = `\uFEFF${makeCsv(items, checks)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
