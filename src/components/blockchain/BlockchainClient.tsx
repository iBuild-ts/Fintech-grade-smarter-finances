"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

type ContractDeployment = {
  id: string;
  chain: string;
  chainId: number | null;
  contractName: string;
  address: string;
  deployTxHash: string | null;
  createdAt: string;
  meta: unknown;
};

type DeployResponse = {
  deployment?: ContractDeployment;
  explorer?: { txUrl: string | null; addressUrl: string | null };
  error?: string;
  message?: string;
};

export function BlockchainClient() {
  const { status } = useSession();
  const isAuthed = useMemo(() => status === "authenticated", [status]);

  const [chain, setChain] = useState<"hardhat" | "sepolia">("hardhat");

  const [escrowBeneficiary, setEscrowBeneficiary] = useState(
    "0x0000000000000000000000000000000000000001",
  );
  const [escrowUnlockMins, setEscrowUnlockMins] = useState(5);
  const [escrowDepositEth, setEscrowDepositEth] = useState(0.01);

  const [iouBorrower, setIouBorrower] = useState("0x0000000000000000000000000000000000000002");
  const [iouDueMins, setIouDueMins] = useState(30);
  const [iouPrincipalEth, setIouPrincipalEth] = useState(0.01);
  const [iouRepayEth, setIouRepayEth] = useState(0.011);

  const [deployments, setDeployments] = useState<ContractDeployment[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refreshDeployments() {
    const res = await fetch("/api/blockchain/deployments/list");
    if (!res.ok) return;
    const data = (await res.json()) as { deployments: ContractDeployment[] };
    setDeployments(data.deployments);
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Blockchain</div>
              <div className="text-xs text-white/60">
                Choose Hardhat (local) or Sepolia (testnet).
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90"
                value={chain}
                onChange={(e) => setChain(e.target.value as "hardhat" | "sepolia")}
                disabled={!isAuthed || busy}
              >
                <option value="hardhat">Hardhat (local)</option>
                <option value="sepolia">Sepolia (testnet)</option>
              </select>

              <button
                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
                type="button"
                disabled={!isAuthed || busy}
                onClick={refreshDeployments}
              >
                Refresh
              </button>
            </div>
          </div>

          {msg ? <div className="mt-2 text-sm text-white/80">{msg}</div> : null}
          {chain === "hardhat" ? (
            <div className="mt-2 text-xs text-white/60">
              Hardhat requires a local node: <code>npm run chain</code>
            </div>
          ) : (
            <div className="mt-2 text-xs text-white/60">
              Sepolia requires env vars: <code>SEPOLIA_RPC_URL</code> and <code>SEPOLIA_DEPLOYER_PRIVATE_KEY</code>.
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="text-sm font-semibold">Deploy Savings Escrow</div>
          <div className="mt-4 space-y-3">
            <label className="block">
              <div className="text-xs text-white/60">Beneficiary</div>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                value={escrowBeneficiary}
                onChange={(e) => setEscrowBeneficiary(e.target.value)}
                disabled={!isAuthed || busy}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="text-xs text-white/60">Unlock (mins)</div>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  type="number"
                  min={1}
                  value={escrowUnlockMins}
                  onChange={(e) => setEscrowUnlockMins(Number(e.target.value))}
                  disabled={!isAuthed || busy}
                />
              </label>
              <label className="block">
                <div className="text-xs text-white/60">Deposit (ETH)</div>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={escrowDepositEth}
                  onChange={(e) => setEscrowDepositEth(Number(e.target.value))}
                  disabled={!isAuthed || busy}
                />
              </label>
            </div>

            <button
              className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
              type="button"
              disabled={!isAuthed || busy}
              onClick={async () => {
                setMsg(null);
                setBusy(true);
                try {
                  const unlockTime = Math.floor(Date.now() / 1000) + Math.max(60, escrowUnlockMins * 60);
                  const res = await fetch("/api/blockchain/deploy/savings-escrow", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      beneficiary: escrowBeneficiary,
                      unlockTime,
                      depositEth: escrowDepositEth,
                      chain,
                    }),
                  });

                  const data = (await res.json()) as DeployResponse;
                  if (!res.ok) {
                    setMsg(data.message ?? data.error ?? "Deploy failed");
                    return;
                  }

                  setMsg(
                    `Deployed at ${data.deployment?.address ?? "(unknown)"}` +
                      (data.explorer?.txUrl ? ` · tx: ${data.explorer.txUrl}` : ""),
                  );
                  await refreshDeployments();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deploying…" : "Deploy escrow"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="text-sm font-semibold">Deploy P2P IOU</div>
          <div className="mt-4 space-y-3">
            <label className="block">
              <div className="text-xs text-white/60">Borrower</div>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                value={iouBorrower}
                onChange={(e) => setIouBorrower(e.target.value)}
                disabled={!isAuthed || busy}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <div className="text-xs text-white/60">Due (mins)</div>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  type="number"
                  min={1}
                  value={iouDueMins}
                  onChange={(e) => setIouDueMins(Number(e.target.value))}
                  disabled={!isAuthed || busy}
                />
              </label>
              <label className="block">
                <div className="text-xs text-white/60">Principal (ETH)</div>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={iouPrincipalEth}
                  onChange={(e) => setIouPrincipalEth(Number(e.target.value))}
                  disabled={!isAuthed || busy}
                />
              </label>
              <label className="block">
                <div className="text-xs text-white/60">Repay (ETH)</div>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={iouRepayEth}
                  onChange={(e) => setIouRepayEth(Number(e.target.value))}
                  disabled={!isAuthed || busy}
                />
              </label>
            </div>

            <button
              className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
              type="button"
              disabled={!isAuthed || busy}
              onClick={async () => {
                setMsg(null);
                setBusy(true);
                try {
                  const dueTime = Math.floor(Date.now() / 1000) + Math.max(60, iouDueMins * 60);
                  const res = await fetch("/api/blockchain/deploy/p2p-iou", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      borrower: iouBorrower,
                      dueTime,
                      principalEth: iouPrincipalEth,
                      repayEth: iouRepayEth,
                      chain,
                    }),
                  });

                  const data = (await res.json()) as DeployResponse;
                  if (!res.ok) {
                    setMsg(data.message ?? data.error ?? "Deploy failed");
                    return;
                  }

                  setMsg(
                    `Deployed at ${data.deployment?.address ?? "(unknown)"}` +
                      (data.explorer?.txUrl ? ` · tx: ${data.explorer.txUrl}` : ""),
                  );
                  await refreshDeployments();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deploying…" : "Deploy IOU"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="text-sm font-semibold">Deployments</div>
        <div className="mt-4 space-y-2">
          {deployments.length === 0 ? (
            <div className="text-sm text-white/60">No deployments loaded.</div>
          ) : (
            deployments.slice(0, 20).map((d) => (
              <div key={d.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60">{d.chain} · {d.contractName}</div>
                <div className="mt-1 text-sm font-semibold">{d.address}</div>
                {d.chain === "sepolia" ? (
                  <div className="mt-1 text-xs text-white/60">
                    <a
                      className="underline"
                      href={`https://sepolia.etherscan.io/address/${d.address}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on Etherscan
                    </a>
                    {d.deployTxHash ? (
                      <>
                        {" · "}
                        <a
                          className="underline"
                          href={`https://sepolia.etherscan.io/tx/${d.deployTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Tx
                        </a>
                      </>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-1 text-xs text-zinc-600">{new Date(d.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
