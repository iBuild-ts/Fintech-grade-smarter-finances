"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthSummary = {
  month: number;
  year: number;
  inflowCents: number;
  outflowCents: number;
  netCents: number;
  topCategories: Array<{ category: string; spendCents: number }>;
};

type InsightItem = {
  id: string;
  type: string;
  title: string;
  content: string;
  score: number | null;
  isPinned: boolean;
  acknowledgedAt: string | null;
  createdAt: string;
};

type AlertItem = {
  id: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

type TransactionRow = {
  id: string;
  date: string;
  name: string;
  amountCents: number;
  currency: string;
  direction: "INFLOW" | "OUTFLOW";
  category: string | null;
};

type TrendPoint = {
  date: string;
  inflowCents: number;
  outflowCents: number;
  netCents: number;
};

function money(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function DashboardClient() {
  const { data: session, status } = useSession();
  const isAuthed = useMemo(() => status === "authenticated", [status]);

  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);
  const [opsBusy, setOpsBusy] = useState(false);
  const [opsError, setOpsError] = useState<string | null>(null);

  const loadAll = async () => {
    const [s, i, a, t, tr] = await Promise.all([
      fetch("/api/finance/summary"),
      fetch("/api/insights/list"),
      fetch("/api/alerts/list"),
      fetch("/api/transactions/list?limit=50"),
      fetch("/api/finance/trend?days=30"),
    ]);

    if (s.ok) setSummary((await s.json()) as MonthSummary);
    if (i.ok) setInsights(((await i.json()) as { insights: InsightItem[] }).insights);
    if (a.ok) setAlerts(((await a.json()) as { alerts: AlertItem[] }).alerts);
    if (t.ok) setTransactions(((await t.json()) as { transactions: TransactionRow[] }).transactions);
    if (tr.ok) setTrend(((await tr.json()) as { points: TrendPoint[] }).points);

    const uc = await fetch("/api/alerts/unread-count").catch(() => null);
    if (uc && uc.ok) {
      const data = (await uc.json()) as { count: number };
      setUnreadAlerts(data.count);
    }
  };

  useEffect(() => {
    if (!isAuthed) return;
    if (opsBusy) return;
    if (summary) return;

    setOpsError(null);
    setOpsBusy(true);
    loadAll()
      .catch(() => null)
      .finally(() => setOpsBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const chartData = useMemo(() => {
    return trend.map((p) => ({ name: p.date.slice(5), value: p.netCents / 100 }));
  }, [trend]);

  return (
    <div className="space-y-6">
      {!isAuthed ? (
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-rose-600 p-6 text-white">
          <div className="text-lg font-semibold">Welcome to Smart Finance Companion</div>
          <div className="mt-2 text-sm opacity-90">
            Sign in to load data, generate insights, deploy smart contracts, and use the copilot.
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/20"
              type="button"
              onClick={() => signIn(undefined, { callbackUrl: "/dashboard" })}
            >
              Sign in
            </button>
            <Link
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900"
              href="/signin"
            >
              Go to sign-in
            </Link>
          </div>
        </div>
      ) : null}

      {isAuthed ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Quick actions</div>
              <div className="text-xs text-white/60">One-click setup for demos</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
                type="button"
                disabled={opsBusy}
                onClick={async () => {
                  setOpsError(null);
                  setOpsBusy(true);
                  try {
                    const res = await fetch("/api/demo/seed", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ days: 60, count: 250, replace: true }),
                    });
                    if (!res.ok) {
                      const data = (await res.json().catch(() => null)) as { error?: string } | null;
                      setOpsError(data?.error ?? "Seed failed");
                      return;
                    }
                    await loadAll();
                  } finally {
                    setOpsBusy(false);
                  }
                }}
              >
                {opsBusy ? "Working…" : "Seed demo data"}
              </button>

              <button
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 disabled:opacity-50"
                type="button"
                disabled={opsBusy}
                onClick={async () => {
                  setOpsError(null);
                  setOpsBusy(true);
                  try {
                    await loadAll();
                  } finally {
                    setOpsBusy(false);
                  }
                }}
              >
                Refresh
              </button>

              <button
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                type="button"
                disabled={opsBusy}
                onClick={async () => {
                  setOpsError(null);
                  setOpsBusy(true);
                  try {
                    await fetch("/api/subscriptions/detect", { method: "POST" }).catch(() => null);
                    await loadAll();
                  } finally {
                    setOpsBusy(false);
                  }
                }}
              >
                Detect subscriptions
              </button>
            </div>
          </div>

          {opsError ? <div className="mt-3 text-sm text-rose-200">{opsError}</div> : null}

          {transactions.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
              <div className="font-medium">No transactions yet.</div>
              <div className="mt-1 text-white/60">
                Recommended demo flow:
                <span className="ml-2">1) Seed demo data</span>
                <span className="ml-2">2) Review alerts & insights</span>
                <span className="ml-2">3) Deploy on Sepolia</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900"
                  href="/transactions"
                >
                  Import CSV
                </Link>
                <Link
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                  href="/blockchain"
                >
                  Deploy contract
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-white/80">
              Unresolved unread alerts: <span className="font-semibold">{unreadAlerts}</span>
            </div>
            <Link
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
              href="/alerts"
            >
              View all alerts
            </Link>
          </div>
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid gap-4 md:grid-cols-4"
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="text-xs text-white/60">Inflow</div>
          <div className="mt-1 text-xl font-semibold">{summary ? money(summary.inflowCents) : "—"}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="text-xs text-white/60">Outflow</div>
          <div className="mt-1 text-xl font-semibold">{summary ? money(summary.outflowCents) : "—"}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="text-xs text-white/60">Net</div>
          <div className="mt-1 text-xl font-semibold">{summary ? money(summary.netCents) : "—"}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="text-xs text-white/60">Status</div>
          <div className="mt-1 text-sm font-medium text-white">
            {status === "loading" ? "Loading…" : session?.user?.email ?? "—"}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">This Month</div>
              <div className="text-xs text-white/60">Net cashflow trend (last 30 days)</div>
            </div>
            <button
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
              type="button"
              disabled={!isAuthed || opsBusy}
              onClick={async () => {
                setOpsError(null);
                setOpsBusy(true);
                try {
                  await loadAll();
                } finally {
                  setOpsBusy(false);
                }
              }}
            >
              {opsBusy ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {opsError ? <div className="mt-2 text-sm text-rose-200">{opsError}</div> : null}

          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                <XAxis dataKey="name" stroke="#ffffff66" tick={{ fill: "#ffffffaa", fontSize: 12 }} />
                <YAxis stroke="#ffffff66" tick={{ fill: "#ffffffaa", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(24,24,27,0.9)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#7c3aed" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="text-sm font-semibold">Top categories</div>
          <div className="mt-3 space-y-2">
            {(summary?.topCategories ?? []).slice(0, 8).map((c) => (
              <div
                key={c.category}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="text-sm font-medium">{c.category}</div>
                <div className="text-sm text-white/80">{money(c.spendCents)}</div>
              </div>
            ))}
            {!summary ? <div className="text-sm text-white/60">Click refresh to load summary.</div> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="text-sm font-semibold">Alerts</div>
          <div className="mt-3 space-y-2">
            {alerts.slice(0, 6).map((a) => (
              <div
                key={a.id}
                className={
                  a.isRead
                    ? "rounded-2xl border border-white/10 bg-white/5 p-3 opacity-70"
                    : "rounded-2xl border border-white/10 bg-white/5 p-3"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-white/60">{a.severity}{a.isRead ? " · read" : ""}</div>
                    <div className="truncate text-sm font-semibold">{a.title}</div>
                    <div className="mt-1 text-xs text-white/70">{a.content}</div>
                  </div>
                  <button
                    className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 disabled:opacity-50"
                    type="button"
                    disabled={!isAuthed || opsBusy}
                    onClick={async () => {
                      setOpsError(null);
                      setOpsBusy(true);
                      try {
                        const res = await fetch("/api/alerts/mark", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ id: a.id, isRead: !a.isRead }),
                        });
                        if (!res.ok) {
                          const data = (await res.json().catch(() => null)) as { error?: string } | null;
                          setOpsError(data?.error ?? "Update failed");
                          return;
                        }
                        const r = await fetch("/api/alerts/list");
                        if (r.ok) setAlerts(((await r.json()) as { alerts: AlertItem[] }).alerts);
                      } finally {
                        setOpsBusy(false);
                      }
                    }}
                  >
                    {a.isRead ? "Mark unread" : "Mark read"}
                  </button>
                </div>
              </div>
            ))}
            {alerts.length === 0 ? <div className="text-sm text-white/60">No alerts loaded.</div> : null}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="text-sm font-semibold">Insights</div>
          <div className="mt-3 space-y-2">
            {insights.slice(0, 6).map((i) => (
              <div
                key={i.id}
                className={
                  i.acknowledgedAt
                    ? "rounded-2xl border border-white/10 bg-white/5 p-3 opacity-70"
                    : "rounded-2xl border border-white/10 bg-white/5 p-3"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-white/60">
                      {i.type}
                      {i.isPinned ? " · pinned" : ""}
                      {i.acknowledgedAt ? " · acknowledged" : ""}
                    </div>
                    <div className="truncate text-sm font-semibold">{i.title}</div>
                    <div className="mt-1 text-xs text-white/70">{i.content}</div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 disabled:opacity-50"
                      type="button"
                      disabled={!isAuthed || opsBusy}
                      onClick={async () => {
                        setOpsError(null);
                        setOpsBusy(true);
                        try {
                          const res = await fetch("/api/insights/pin", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ id: i.id, isPinned: !i.isPinned }),
                          });
                          if (!res.ok) {
                            const data = (await res.json().catch(() => null)) as { error?: string } | null;
                            setOpsError(data?.error ?? "Update failed");
                            return;
                          }
                          const r = await fetch("/api/insights/list");
                          if (r.ok) setInsights(((await r.json()) as { insights: InsightItem[] }).insights);
                        } finally {
                          setOpsBusy(false);
                        }
                      }}
                    >
                      {i.isPinned ? "Unpin" : "Pin"}
                    </button>

                    <button
                      className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 disabled:opacity-50"
                      type="button"
                      disabled={!isAuthed || opsBusy}
                      onClick={async () => {
                        setOpsError(null);
                        setOpsBusy(true);
                        try {
                          const res = await fetch("/api/insights/ack", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ id: i.id, acknowledged: !Boolean(i.acknowledgedAt) }),
                          });
                          if (!res.ok) {
                            const data = (await res.json().catch(() => null)) as { error?: string } | null;
                            setOpsError(data?.error ?? "Update failed");
                            return;
                          }
                          const r = await fetch("/api/insights/list");
                          if (r.ok) setInsights(((await r.json()) as { insights: InsightItem[] }).insights);
                        } finally {
                          setOpsBusy(false);
                        }
                      }}
                    >
                      {i.acknowledgedAt ? "Unack" : "Acknowledge"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {insights.length === 0 ? <div className="text-sm text-white/60">No insights loaded.</div> : null}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="text-sm font-semibold">Recent transactions</div>
          <div className="mt-3 space-y-2">
            {transactions.slice(0, 8).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-white/60">
                    {new Date(t.date).toLocaleDateString()} · {t.category ?? "Uncategorized"}
                  </div>
                </div>
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
            ))}
            {transactions.length === 0 ? (
              <div className="text-sm text-white/60">
                Import CSV on the Transactions page to see real data.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="text-xs text-white/60">
        Tip: Use the sidebar to access Copilot, Blockchain deploys, Budgets, and Exports.
      </div>
    </div>
  );
}
