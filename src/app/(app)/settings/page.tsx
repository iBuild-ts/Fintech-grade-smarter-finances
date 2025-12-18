"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type AuditEvent = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  meta: unknown;
  createdAt: string;
};

type RiskProfile = {
  riskTolerance: number;
  horizonYears: number;
  incomeStable: boolean;
  hasEmergencyFund: boolean;
  updatedAt: string;
};

export default function SettingsPage() {
  const { status } = useSession();
  const isAuthed = useMemo(() => status === "authenticated", [status]);

  const [chainEnv, setChainEnv] = useState<
    | {
        hardhat: { rpcUrl: string };
        sepolia: { rpcUrlSet: boolean; privateKeySet: boolean };
      }
    | null
  >(null);

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditBusy, setAuditBusy] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  const [riskTolerance, setRiskTolerance] = useState(0.5);
  const [horizonYears, setHorizonYears] = useState(10);
  const [incomeStable, setIncomeStable] = useState(true);
  const [hasEmergencyFund, setHasEmergencyFund] = useState(false);
  const [riskBusy, setRiskBusy] = useState(false);
  const [riskMsg, setRiskMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed) return;
    fetch("/api/blockchain/env")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setChainEnv(d))
      .catch(() => null);
  }, [isAuthed]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="text-sm font-semibold">Blockchain / Sepolia readiness</div>
        <div className="mt-1 text-sm text-white/60">
          Configure Sepolia once in <code>.env.local</code> for testnet deployments.
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60">Hardhat RPC</div>
            <div className="mt-1 text-sm font-semibold">{chainEnv?.hardhat.rpcUrl ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60">SEPOLIA_RPC_URL</div>
            <div className="mt-1 text-sm font-semibold">
              {chainEnv ? (chainEnv.sepolia.rpcUrlSet ? "Set" : "Missing") : "—"}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60">SEPOLIA_DEPLOYER_PRIVATE_KEY</div>
            <div className="mt-1 text-sm font-semibold">
              {chainEnv ? (chainEnv.sepolia.privateKeySet ? "Set" : "Missing") : "—"}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          <div className="font-semibold text-white">Setup</div>
          <div className="mt-2">
            <div>
              <code>SEPOLIA_RPC_URL</code> = Infura/Alchemy RPC
            </div>
            <div>
              <code>SEPOLIA_DEPLOYER_PRIVATE_KEY</code> = testnet-only wallet key
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="text-sm font-semibold">Risk Profile</div>
        <div className="mt-1 text-sm text-white/60">Personalize investing guidance.</div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <div className="text-xs text-white/60">Risk tolerance (0–100)</div>
            <input
              className="mt-1 w-full"
              type="range"
              min={0}
              max={100}
              value={Math.round(riskTolerance * 100)}
              disabled={!isAuthed || riskBusy}
              onChange={(e) => setRiskTolerance(Number(e.target.value) / 100)}
            />
            <div className="text-xs text-white/80">{Math.round(riskTolerance * 100)}%</div>
          </label>

          <label className="block">
            <div className="text-xs text-white/60">Horizon (years)</div>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              type="number"
              min={1}
              max={60}
              value={horizonYears}
              disabled={!isAuthed || riskBusy}
              onChange={(e) => setHorizonYears(Number(e.target.value))}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={incomeStable}
              disabled={!isAuthed || riskBusy}
              onChange={(e) => setIncomeStable(e.target.checked)}
            />
            <span>Income is stable</span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasEmergencyFund}
              disabled={!isAuthed || riskBusy}
              onChange={(e) => setHasEmergencyFund(e.target.checked)}
            />
            <span>I have an emergency fund</span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
              type="button"
              disabled={!isAuthed || riskBusy}
              onClick={async () => {
                setRiskMsg(null);
                setRiskBusy(true);
                try {
                  const res = await fetch("/api/risk-profile/upsert", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ riskTolerance, horizonYears, incomeStable, hasEmergencyFund }),
                  });
                  const data = (await res.json()) as { profile?: RiskProfile; error?: string };
                  if (!res.ok) {
                    setRiskMsg(data.error ?? "Save failed");
                    return;
                  }
                  setRiskMsg("Saved.");
                } finally {
                  setRiskBusy(false);
                }
              }}
            >
              Save
            </button>

            <button
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 disabled:opacity-50"
              type="button"
              disabled={!isAuthed || riskBusy}
              onClick={async () => {
                setRiskMsg(null);
                setRiskBusy(true);
                try {
                  const res = await fetch("/api/risk-profile/get");
                  if (!res.ok) {
                    setRiskMsg("Load failed");
                    return;
                  }
                  const data = (await res.json()) as { profile: RiskProfile | null };
                  if (!data.profile) {
                    setRiskMsg("No saved profile yet.");
                    return;
                  }
                  setRiskTolerance(data.profile.riskTolerance);
                  setHorizonYears(data.profile.horizonYears);
                  setIncomeStable(data.profile.incomeStable);
                  setHasEmergencyFund(data.profile.hasEmergencyFund);
                  setRiskMsg("Loaded.");
                } finally {
                  setRiskBusy(false);
                }
              }}
            >
              Load
            </button>
          </div>

          {riskMsg ? <div className="text-sm text-white/80">{riskMsg}</div> : null}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Audit log</div>
            <div className="text-xs text-white/60">Recent security/compliance events</div>
          </div>
          <button
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
            type="button"
            disabled={!isAuthed || auditBusy}
            onClick={async () => {
              setAuditBusy(true);
              try {
                const res = await fetch("/api/audit/list");
                if (!res.ok) return;
                const data = (await res.json()) as { events: AuditEvent[] };
                setAuditEvents(data.events);
              } finally {
                setAuditBusy(false);
              }
            }}
          >
            {auditBusy ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {auditEvents.length === 0 ? (
            <div className="text-sm text-white/60">No events loaded.</div>
          ) : (
            auditEvents.slice(0, 12).map((e) => (
              <div key={e.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-white/70">{e.action}</div>
                  <div className="text-[10px] text-white/50">{new Date(e.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-1 text-xs text-white/70">
                  {e.entity ?? ""}
                  {e.entityId ? ` · ${e.entityId}` : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="text-sm font-semibold">Delete my data</div>
        <div className="mt-1 text-sm text-white/60">
          Permanently deletes your account and all associated data in this local demo.
        </div>

        <div className="mt-4 space-y-2">
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE"
            disabled={!isAuthed || deleteBusy}
          />

          <button
            className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            type="button"
            disabled={!isAuthed || deleteBusy || deleteConfirm !== "DELETE"}
            onClick={async () => {
              setDeleteMsg(null);
              setDeleteBusy(true);
              try {
                const res = await fetch("/api/account/delete", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ confirm: "DELETE" }),
                });

                const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
                if (!res.ok) {
                  setDeleteMsg(data?.error ?? "Delete failed");
                  return;
                }

                setDeleteMsg("Deleted. Signing out…");
                await signOut({ callbackUrl: "/" });
              } finally {
                setDeleteBusy(false);
              }
            }}
          >
            {deleteBusy ? "Deleting…" : "Delete My Data"}
          </button>

          {deleteMsg ? <div className="text-sm text-zinc-700">{deleteMsg}</div> : null}
        </div>
      </div>
    </div>
  );
}
