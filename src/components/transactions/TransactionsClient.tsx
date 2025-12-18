"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

type TransactionRow = {
  id: string;
  date: string;
  name: string;
  amountCents: number;
  currency: string;
  direction: "INFLOW" | "OUTFLOW";
  category: string | null;
};

function money(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function TransactionsClient() {
  const { status } = useSession();
  const isAuthed = useMemo(() => status === "authenticated", [status]);

  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [direction, setDirection] = useState<"" | "INFLOW" | "OUTFLOW">("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState("");

  async function refresh(next?: { q?: string; category?: string; direction?: string }) {
    const params = new URLSearchParams();
    const qq = (next?.q ?? q).trim();
    const cc = (next?.category ?? category).trim();
    const dd = (next?.direction ?? direction).trim();
    if (qq) params.set("q", qq);
    if (cc) params.set("category", cc);
    if (dd) params.set("direction", dd);
    params.set("limit", "80");

    const res = await fetch(`/api/transactions/list?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as { transactions: TransactionRow[] };
    setTransactions(data.transactions);
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="text-sm font-semibold">Import transactions (CSV)</div>
          <div className="mt-1 text-sm text-white/60">
            Upload a CSV file or paste CSV text. Required columns: <code>date</code>, <code>amount</code>, <code>name/description</code>.
          </div>

          <div className="mt-4 grid gap-3">
            <input
              className="w-full text-sm"
              type="file"
              accept=".csv,text/csv"
              disabled={!isAuthed || busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setCsvText(String(reader.result ?? ""));
                reader.readAsText(file);
              }}
            />

            <textarea
              className="h-40 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-white placeholder:text-white/40"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="date,description,amount\n2025-12-01,Starbucks,-5.75"
              disabled={!isAuthed || busy}
            />

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
                type="button"
                disabled={!isAuthed || busy || csvText.trim().length === 0}
                onClick={async () => {
                  setMsg(null);
                  setBusy(true);
                  try {
                    const res = await fetch("/api/transactions/import-csv", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ csvText }),
                    });
                    const data = (await res.json()) as {
                      inserted?: number;
                      categorized?: number;
                      insightsCreated?: number;
                      alertsCreated?: number;
                      error?: string;
                    };
                    if (!res.ok) {
                      setMsg(data.error ?? "Import failed");
                      return;
                    }
                    setMsg(
                      `Imported ${data.inserted ?? 0}. Categorized ${data.categorized ?? 0}. Insights ${
                        data.insightsCreated ?? 0
                      }, alerts ${data.alertsCreated ?? 0}.`,
                    );
                    await refresh();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Importing…" : "Import"}
              </button>

              <button
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 disabled:opacity-50"
                type="button"
                disabled={!isAuthed || busy}
                onClick={() => refresh().catch(() => null)}
              >
                Refresh list
              </button>
            </div>

            {msg ? <div className="text-sm text-white/80">{msg}</div> : null}
          </div>
        </div>
      </motion.div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Recent transactions</div>
            <div className="text-xs text-white/60">Search and edit categories</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 disabled:opacity-50"
              type="button"
              disabled={!isAuthed || busy}
              onClick={() => {
                setQ("");
                setCategory("");
                setDirection("");
                setEditingId(null);
                setEditingCategory("");
                refresh({ q: "", category: "", direction: "" }).catch(() => null);
              }}
            >
              Clear
            </button>

            <button
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
              type="button"
              disabled={!isAuthed || busy}
              onClick={() => refresh().catch(() => null)}
            >
              Load
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="block">
            <div className="text-xs text-white/60">Search</div>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={!isAuthed || busy}
              placeholder="Merchant or description"
            />
          </label>

          <label className="block">
            <div className="text-xs text-white/60">Category</div>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!isAuthed || busy}
              placeholder="e.g. Groceries"
            />
          </label>

          <label className="block">
            <div className="text-xs text-white/60">Direction</div>
            <select
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90"
              value={direction}
              onChange={(e) => setDirection(e.target.value as "" | "INFLOW" | "OUTFLOW")}
              disabled={!isAuthed || busy}
            >
              <option value="">All</option>
              <option value="OUTFLOW">Spend</option>
              <option value="INFLOW">Income</option>
            </select>
          </label>
        </div>

        <div className="mt-3">
          <button
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
            type="button"
            disabled={!isAuthed || busy}
            onClick={() => refresh().catch(() => null)}
          >
            Apply filters
          </button>
        </div>

        <div className="mt-4 divide-y divide-white/10">
          {transactions.length === 0 ? (
            <div className="py-6 text-sm text-white/60">No transactions loaded yet.</div>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-white/60">
                    {new Date(t.date).toLocaleDateString()} · {t.category ?? "Uncategorized"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {editingId === t.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="w-40 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
                        value={editingCategory}
                        onChange={(e) => setEditingCategory(e.target.value)}
                        disabled={!isAuthed || busy}
                        placeholder="Category"
                      />
                      <button
                        className="rounded-xl bg-white px-2 py-1 text-sm font-semibold text-zinc-900 disabled:opacity-50"
                        type="button"
                        disabled={!isAuthed || busy || editingCategory.trim().length === 0}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            const res = await fetch("/api/transactions/update-category", {
                              method: "POST",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({ id: t.id, category: editingCategory.trim() }),
                            });
                            const data = (await res.json()) as { error?: string };
                            if (!res.ok) {
                              setMsg(data.error ?? "Update failed");
                              return;
                            }
                            setEditingId(null);
                            setEditingCategory("");
                            await refresh();
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Save
                      </button>
                      <button
                        className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-sm text-white/80 disabled:opacity-50"
                        type="button"
                        disabled={!isAuthed || busy}
                        onClick={() => {
                          setEditingId(null);
                          setEditingCategory("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 disabled:opacity-50"
                      type="button"
                      disabled={!isAuthed || busy}
                      onClick={() => {
                        setEditingId(t.id);
                        setEditingCategory(t.category ?? "");
                      }}
                    >
                      Edit category
                    </button>
                  )}

                  <div
                    className={
                      t.direction === "INFLOW"
                        ? "text-sm font-semibold text-emerald-200"
                        : "text-sm font-semibold text-white"
                    }
                  >
                    {t.direction === "INFLOW" ? "+" : "-"}
                    {money(t.amountCents)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
