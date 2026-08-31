/**
 * The Rig — buyback keeper.
 *
 * The keeper's one move, on a 12-hour cadence: convert the vault's ETH into $GPU
 * on the open market and fold it into the rig's stream. It enforces the original
 * protocol's rule off-chain and on-chain both:
 *
 *   "The keeper refuses any buy whose price impact is over its ceiling."
 *
 * Implementation: probe the pool with a small quote to get the marginal price,
 * then ladder down (halving) until a chunk's average execution price is within
 * MAX_IMPACT_BPS of the marginal price. Big pots during thin books get spent
 * across multiple windows instead of donating slippage to snipers. minOut passed
 * to the vault adds a further SLIPPAGE_BPS cushion, and the vault itself verifies
 * output by balance delta — a bad route reverts, it can never misdirect funds.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { env, robinhoodChain } from "./config.js";
import { vaultAbi, quoterAbi, curveAbi } from "./abi.js";

const account = privateKeyToAccount(env.keeperPk());
const publicClient = createPublicClient({ chain: robinhoodChain, transport: http(env.rpcUrl) });
const walletClient = createWalletClient({ account, chain: robinhoodChain, transport: http(env.rpcUrl) });

const vault = env.vaultAddress();

const PROBE_ETH = 1_000_000_000_000_000n; // 0.001 ETH marginal-price probe
const MAX_CHUNKS_PER_RUN = 4;

async function quoteOut(amountIn: bigint): Promise<bigint> {
  if (env.quoteMode === "curve") {
    // simulating the real buy from the vault (which holds the ETH) IS the quote:
    // exact fees and near-graduation clamping included
    const { result } = await publicClient.simulateContract({
      address: env.curveAddress(),
      abi: curveAbi,
      functionName: "buy",
      args: [amountIn, 1n, vault],
      account: vault,
      value: amountIn,
    });
    return result;
  }
  const { result } = await publicClient.simulateContract({
    address: env.quoterAddress(),
    abi: quoterAbi,
    functionName: "quoteExactInputSingle",
    args: [
      {
        tokenIn: env.wethAddress(),
        tokenOut: env.gpuAddress(),
        amountIn,
        fee: env.poolFee,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  return result[0];
}

/** Largest chunk (halving from `budget`) whose avg price stays within the impact ceiling. */
async function sizeChunk(budget: bigint): Promise<{ amountIn: bigint; quotedOut: bigint } | null> {
  const probeOut = await quoteOut(PROBE_ETH);
  if (probeOut === 0n) return null;

  let amountIn = budget;
  while (amountIn >= env.minEthWei) {
    const quotedOut = await quoteOut(amountIn);
    // average out per wei vs marginal out per wei
    const impactBps = 10_000n - (quotedOut * PROBE_ETH * 10_000n) / (probeOut * amountIn);
    if (impactBps <= BigInt(env.maxImpactBps)) return { amountIn, quotedOut };
    amountIn /= 2n;
  }
  return null;
}

async function runOnce(): Promise<void> {
  // Pons creator fees are NOT auto-claimed: they sit safely in the Pons escrow
  // until ops manually calls feeRouter.sweepAndHarvest() (30% pot / 70% treasury).

  if (env.quoteMode === "curve") {
    const graduated = await publicClient.readContract({
      address: env.curveAddress(),
      abi: curveAbi,
      functionName: "graduated",
    });
    if (graduated) {
      console.error(
        "[keeper] $GPU has GRADUATED off the bonding curve — rotate the vault to the v4 adapter and set QUOTE_MODE=univ3. Skipping buys.",
      );
      return;
    }
  }

  for (let i = 0; i < MAX_CHUNKS_PER_RUN; i++) {
    const balance = await publicClient.getBalance({ address: vault });
    if (balance < env.minEthWei) {
      if (i === 0) console.log(`[keeper] pot ${formatEther(balance)} ETH below floor, sleeping`);
      return;
    }

    const chunk = await sizeChunk(balance);
    if (!chunk) {
      console.log("[keeper] no chunk fits the impact ceiling, waiting for depth");
      return;
    }

    const minOut = (chunk.quotedOut * BigInt(10_000 - env.slippageBps)) / 10_000n;
    console.log(
      `[keeper] buying with ${formatEther(chunk.amountIn)} ETH (minOut ${chunk.quotedOut} - ${env.slippageBps}bps)`,
    );

    const hash = await walletClient.writeContract({
      address: vault,
      abi: vaultAbi,
      functionName: "buy",
      args: [chunk.amountIn, minOut],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[keeper] buy ${receipt.status} in tx ${hash}`);
    if (receipt.status !== "success") return;
  }
}

async function main() {
  console.log(`[keeper] ${account.address} watching vault ${vault}, window ${env.intervalMs}ms`);
  for (;;) {
    try {
      await runOnce();
    } catch (err) {
      console.error("[keeper] run failed:", err);
    }
    await new Promise((r) => setTimeout(r, env.intervalMs));
  }
}

main();
