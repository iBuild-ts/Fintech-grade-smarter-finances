import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ethers } from "ethers";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chainIdFor, deployContract, explorerAddressUrl, explorerTxUrl, rpcUrlFor, SupportedChain } from "@/lib/blockchain";
import { auditLog } from "@/lib/audit";

const bodySchema = z.object({
  beneficiary: z.string().min(1),
  unlockTime: z.number().int().positive(),
  depositEth: z.number().positive().default(0.01),
  chain: z.enum(["hardhat", "sepolia"]).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const valueWei = ethers.parseEther(String(parsed.data.depositEth));

  const chain = (parsed.data.chain ?? "hardhat") as SupportedChain;

  let deployed: { address: string; txHash: string | null };
  try {
    deployed = await deployContract({
      contractFile: "SavingsEscrow.sol",
      contractName: "SavingsEscrow",
      args: [parsed.data.beneficiary, BigInt(parsed.data.unlockTime)],
      valueWei,
      chain,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "deploy_failed";
    if (msg === "missing_sepolia_rpc_url") {
      return NextResponse.json(
        { error: "missing_sepolia_rpc_url", message: "Set SEPOLIA_RPC_URL in .env.local" },
        { status: 400 },
      );
    }
    if (msg === "missing_sepolia_private_key") {
      return NextResponse.json(
        {
          error: "missing_sepolia_private_key",
          message: "Set SEPOLIA_DEPLOYER_PRIVATE_KEY in .env.local (testnet wallet only).",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "deploy_failed" }, { status: 500 });
  }

  const record = await prisma.contractDeployment.create({
    data: {
      userId: user.id,
      chain,
      rpcUrl: rpcUrlFor(chain),
      chainId: chainIdFor(chain),
      contractName: "SavingsEscrow",
      address: deployed.address,
      deployTxHash: deployed.txHash ?? undefined,
      meta: {
        beneficiary: parsed.data.beneficiary,
        unlockTime: parsed.data.unlockTime,
        depositWei: valueWei.toString(),
      },
    },
    select: { id: true, address: true, deployTxHash: true, createdAt: true },
  });

  await auditLog({
    userId: user.id,
    action: "blockchain.deploy",
    entity: "ContractDeployment",
    entityId: record.id,
    meta: { contractName: "SavingsEscrow", address: record.address, deployTxHash: record.deployTxHash },
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
    userAgent: req.headers.get("user-agent"),
  });

  const txUrl = record.deployTxHash ? explorerTxUrl(chain, record.deployTxHash) : null;
  const addressUrl = explorerAddressUrl(chain, record.address);

  return NextResponse.json(
    {
      deployment: record,
      explorer: { txUrl, addressUrl },
    },
    { status: 201 },
  );
}
