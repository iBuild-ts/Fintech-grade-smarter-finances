"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

type BudgetRow = {
  id: string;
  category: string;
  limitCents: number;
  year: number;
  month: number;
};

type MonthSummary = {
  month: number;
  year: number;
  inflowCents: number;
  outflowCents: number;
  netCents: number;
  topCategories: Array<{ category: string; spendCents: number }>;
};

function money(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function BudgetsClient() {
  const { status } = useSession();
  const isAuthed = useMemo(() => status === "authenticated", [status]);

  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [category, setCategory] = useState("Groceries");
  const [limit, setLimit] = useState(300);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<MonthSummary | null>(null);

  async function refresh() {
    const [b, s] = await Promise.all([fetch("/api/budgets/list"), fetch("/api/finance/summary")]);
    if (b.ok) setBudgets(((await b.json()) as { budgets: BudgetRow[] }).budgets);
    if (s.ok) setSummary((await s.json()) as MonthSummary);
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Budgets</div>
              <div className="text-xs text-white/60">Set monthly caps by category</div>
            </div>
            <button
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
              type="button"
              disabled={!isAuthed || busy}
              onClick={refresh}
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="text-xs text-white/60">Category</div>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={!isAuthed || busy}
              />
            </label>
            <label className="block">
              <div className="text-xs text-white/60">Limit ($)</div>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                type="number"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                disabled={!isAuthed || busy}
                min={1}
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
              type="button"
              disabled={!isAuthed || busy || !category.trim() || limit <= 0}
              onClick={async () => {
                setMsg(null);
                setBusy(true);
                try {
                  const res = await fetch("/api/budgets/upsert", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ category: category.trim(), limitDollars: limit }),
                  });
                  const data = (await res.json()) as { budget?: BudgetRow; error?: string };
                  if (!res.ok) {
                    setMsg(data.error ?? "Save failed");
                    return;
                  }
                  setMsg("Budget saved.");
                  await fetch("/api/insights/generate", { method: "POST" }).catch(() => null);
                  await refresh();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : "Save budget"}
            </button>
          </div>

          {msg ? <div className="mt-2 text-sm text-white/80">{msg}</div> : null}
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="text-sm font-semibold">This month summary</div>
          {summary ? (
            <div className="mt-3 space-y-2 text-sm text-white/80">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Inflow</span>
                <span className="font-medium">{money(summary.inflowCents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Outflow</span>
                <span className="font-medium">{money(summary.outflowCents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Net</span>
                <span className="font-medium">{money(summary.netCents)}</span>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-white/60">Click refresh to load.</div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="text-sm font-semibold">Existing budgets</div>
          <div className="mt-4 space-y-2">
            {budgets.length === 0 ? (
              <div className="text-sm text-white/60">No budgets loaded yet.</div>
            ) : (
              budgets.slice(0, 20).map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{b.category}</div>
                    <div className="text-xs text-white/60">Limit {money(b.limitCents)}</div>
                  </div>
                  <button
                    className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 disabled:opacity-50"
                    type="button"
                    disabled={!isAuthed || busy}
                    onClick={async () => {
                      setMsg(null);
                      setBusy(true);
                      try {
                        const del = await fetch("/api/budgets/delete", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ category: b.category, year: b.year, month: b.month }),
                        });
                        const data = (await del.json()) as { ok?: boolean; error?: string };
                        if (!del.ok) {
                          setMsg(data.error ?? "Delete failed");
                          return;
                        }
                        await fetch("/api/insights/generate", { method: "POST" }).catch(() => null);
                        await refresh();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
