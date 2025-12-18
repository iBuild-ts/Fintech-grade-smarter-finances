import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL ?? "";
  const sepoliaPk = process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY ?? "";

  const hardhatRpcUrl = process.env.HARDHAT_RPC_URL ?? "http://127.0.0.1:8545";

  return NextResponse.json(
    {
      hardhat: {
        rpcUrl: hardhatRpcUrl,
      },
      sepolia: {
        rpcUrlSet: Boolean(sepoliaRpcUrl),
        privateKeySet: Boolean(sepoliaPk),
      },
    },
    { status: 200 },
  );
}
