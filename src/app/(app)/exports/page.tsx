"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type MonthlyReportResponse = { report: unknown };

export default function ExportsPage() {
  const { status } = useSession();
  const isAuthed = useMemo(() => status === "authenticated", [status]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="text-sm font-semibold">Exports</div>
        <div className="mt-1 text-sm text-zinc-600">Download CSV or monthly report JSON.</div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            type="button"
            disabled={!isAuthed}
            onClick={() => {
              setMsg(null);
              window.location.href = "/api/export/transactions-csv";
            }}
          >
            Download Transactions CSV
          </button>

          <button
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            type="button"
            disabled={!isAuthed}
            onClick={() => {
              setMsg(null);
              window.location.href = "/api/export/monthly-report-download";
            }}
          >
            Download Monthly Report JSON
          </button>

          <button
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm disabled:opacity-50"
            type="button"
            disabled={!isAuthed || busy}
            onClick={async () => {
              setMsg(null);
              setBusy(true);
              try {
                const res = await fetch("/api/export/monthly-report");
                if (!res.ok) {
                  setMsg("Could not generate report");
                  return;
                }
                const data = (await res.json()) as MonthlyReportResponse;
                setJsonText(JSON.stringify(data.report, null, 2));
                setMsg("Report generated.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Generating…" : "Preview Monthly Report"}
          </button>
        </div>

        {msg ? <div className="mt-3 text-sm text-zinc-700">{msg}</div> : null}

        {jsonText ? (
          <textarea
            className="mt-4 h-72 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-[11px]"
            value={jsonText}
            readOnly
          />
        ) : null}
      </div>
    </div>
  );
}
