import { readFile } from "node:fs/promises";
import path from "node:path";
import { ethers } from "ethers";

type Artifact = {
  abi: unknown;
  bytecode: string;
};

export type SupportedChain = "hardhat" | "sepolia";

function artifactPath(contractFile: string, contractName: string) {
  return path.join(
    process.cwd(),
    "hardhat-artifacts",
    "contracts",
    contractFile,
    `${contractName}.json`,
  );
}

export async function loadArtifact(contractFile: string, contractName: string): Promise<Artifact> {
  const filePath = artifactPath(contractFile, contractName);
  const raw = await readFile(filePath, "utf8");
  const json = JSON.parse(raw) as { abi: unknown; bytecode: string };
  return { abi: json.abi, bytecode: json.bytecode };
}

export function hardhatRpcUrl() {
  return process.env.HARDHAT_RPC_URL ?? "http://127.0.0.1:8545";
}

export function hardhatDeployerPrivateKey() {
  return (
    process.env.HARDHAT_DEPLOYER_PRIVATE_KEY ??
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  );
}

export function sepoliaRpcUrl() {
  return process.env.SEPOLIA_RPC_URL ?? "";
}

export function sepoliaDeployerPrivateKey() {
  return process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY ?? "";
}

export function rpcUrlFor(chain: SupportedChain) {
  return chain === "hardhat" ? hardhatRpcUrl() : sepoliaRpcUrl();
}

export function chainIdFor(chain: SupportedChain) {
  return chain === "hardhat" ? 31337 : 11155111;
}

export function explorerTxUrl(chain: SupportedChain, txHash: string) {
  if (chain === "sepolia") return `https://sepolia.etherscan.io/tx/${txHash}`;
  return null;
}

export function explorerAddressUrl(chain: SupportedChain, address: string) {
  if (chain === "sepolia") return `https://sepolia.etherscan.io/address/${address}`;
  return null;
}

export function getProvider(chain: SupportedChain = "hardhat") {
  const url = rpcUrlFor(chain);
  if (chain === "sepolia" && !url) {
    throw new Error("missing_sepolia_rpc_url");
  }
  return new ethers.JsonRpcProvider(url);
}

export function getDeployer(chain: SupportedChain = "hardhat") {
  const pk = chain === "hardhat" ? hardhatDeployerPrivateKey() : sepoliaDeployerPrivateKey();
  if (chain === "sepolia" && !pk) {
    throw new Error("missing_sepolia_private_key");
  }
  return new ethers.Wallet(pk, getProvider(chain));
}

export async function deployContract(opts: {
  contractFile: string;
  contractName: string;
  args: unknown[];
  valueWei?: bigint;
  chain?: SupportedChain;
}) {
  const { abi, bytecode } = await loadArtifact(opts.contractFile, opts.contractName);
  const deployer = getDeployer(opts.chain ?? "hardhat");

  const factory = new ethers.ContractFactory(abi as any, bytecode, deployer);

  const contract = await factory.deploy(...opts.args, {
    value: opts.valueWei,
  });

  const deploymentTx = contract.deploymentTransaction();
  await contract.waitForDeployment();

  return {
    address: await contract.getAddress(),
    txHash: deploymentTx?.hash ?? null,
  };
}
