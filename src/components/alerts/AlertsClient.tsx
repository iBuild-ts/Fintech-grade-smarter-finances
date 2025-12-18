"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

type AlertItem = {
  id: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  resolvedAt: string | null;
};

export function AlertsClient() {
  const { status } = useSession();
  const isAuthed = useMemo(() => status === "authenticated", [status]);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState<"" | "LOW" | "MEDIUM" | "HIGH">("");
  const [readFilter, setReadFilter] = useState<"" | "unread" | "read">("unread");
  const [resolvedFilter, setResolvedFilter] = useState<"" | "unresolved" | "resolved">("unresolved");

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected],
  );

  async function load() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (severity) params.set("severity", severity);
    if (readFilter) params.set("read", readFilter);
    if (resolvedFilter) params.set("resolved", resolvedFilter);
    params.set("limit", "50");

    const res = await fetch(`/api/alerts/list?${params.toString()}`);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setMsg(data?.error ?? "Could not load alerts");
      return;
    }

    const data = (await res.json()) as { alerts: AlertItem[] };
    setAlerts(data.alerts);
    setSelected({});
  }

  async function bulkMark(isRead: boolean) {
    if (selectedIds.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/alerts/mark-bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, isRead }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMsg(data?.error ?? "Bulk update failed");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Alerts</div>
              <div className="text-xs text-white/60">Filter, triage, and mark read/unread</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
                type="button"
                disabled={!isAuthed || busy}
                onClick={async () => {
                  setBusy(true);
                  setMsg(null);
                  try {
                    await load();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Loading…" : "Load"}
              </button>

              <button
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 disabled:opacity-50"
                type="button"
                disabled={!isAuthed || busy || selectedIds.length === 0}
                onClick={() => bulkMark(true)}
              >
                Mark read
              </button>

              <button
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 disabled:opacity-50"
                type="button"
                disabled={!isAuthed || busy || selectedIds.length === 0}
                onClick={() => bulkMark(false)}
              >
                Mark unread
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <label className="block">
              <div className="text-xs text-white/60">Search</div>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                disabled={!isAuthed || busy}
                placeholder="title or content"
              />
            </label>

            <label className="block">
              <div className="text-xs text-white/60">Severity</div>
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                disabled={!isAuthed || busy}
              >
                <option value="">All</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </label>

            <label className="block">
              <div className="text-xs text-white/60">Read status</div>
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90"
                value={readFilter}
                onChange={(e) => setReadFilter(e.target.value as any)}
                disabled={!isAuthed || busy}
              >
                <option value="">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </label>

            <label className="block">
              <div className="text-xs text-white/60">Resolved</div>
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90"
                value={resolvedFilter}
                onChange={(e) => setResolvedFilter(e.target.value as any)}
                disabled={!isAuthed || busy}
              >
                <option value="">All</option>
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
          </div>

          {msg ? <div className="mt-3 text-sm text-rose-200">{msg}</div> : null}
        </div>
      </motion.div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Results</div>
          <div className="text-xs text-white/60">{selectedIds.length} selected</div>
        </div>

        <div className="mt-4 divide-y divide-white/10">
          {alerts.length === 0 ? (
            <div className="py-8 text-sm text-white/60">No alerts loaded.</div>
          ) : (
            alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-3">
                <input
                  type="checkbox"
                  checked={Boolean(selected[a.id])}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [a.id]: e.target.checked }))}
                  disabled={!isAuthed || busy}
                />

                <div className={a.isRead ? "min-w-0 flex-1 opacity-70" : "min-w-0 flex-1"}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-white/60">
                        {a.severity}
                        {a.isRead ? " · read" : " · unread"}
                        {a.resolvedAt ? " · resolved" : " · unresolved"}
                        {" · "}{new Date(a.createdAt).toLocaleString()}
                      </div>
                      <div className="truncate text-sm font-semibold">{a.title}</div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 disabled:opacity-50"
                        type="button"
                        disabled={!isAuthed || busy}
                        onClick={async () => {
                          setBusy(true);
                          setMsg(null);
                          try {
                            const res = await fetch("/api/alerts/mark", {
                              method: "POST",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({ id: a.id, isRead: !a.isRead }),
                            });
                            const data = (await res.json().catch(() => null)) as { error?: string } | null;
                            if (!res.ok) {
                              setMsg(data?.error ?? "Update failed");
                              return;
                            }
                            await load();
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        {a.isRead ? "Mark unread" : "Mark read"}
                      </button>

                      <button
                        className="rounded-xl bg-white px-2 py-1 text-xs font-semibold text-zinc-900 disabled:opacity-50"
                        type="button"
                        disabled={!isAuthed || busy}
                        onClick={async () => {
                          setBusy(true);
                          setMsg(null);
                          try {
                            const res = await fetch("/api/alerts/resolve", {
                              method: "POST",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({ id: a.id, resolved: !Boolean(a.resolvedAt) }),
                            });
                            const data = (await res.json().catch(() => null)) as { error?: string } | null;
                            if (!res.ok) {
                              setMsg(data?.error ?? "Resolve failed");
                              return;
                            }
                            await load();
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        {a.resolvedAt ? "Unresolve" : "Resolve"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 text-xs text-white/70">{a.content}</div>
                  {a.resolvedAt ? (
                    <div className="mt-1 text-xs text-white/60">
                      Resolved at {new Date(a.resolvedAt).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
