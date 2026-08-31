export const vaultAbi = [
  {
    type: "function",
    name: "buy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "ethAmount", type: "uint256" },
      { name: "minGpuOut", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "totalBoughtBack",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

// Pons V2 bonding curve — pre-graduation buy venue; simulating buy() IS the quote
export const curveAbi = [
  {
    type: "function",
    name: "buy",
    stateMutability: "payable",
    inputs: [
      { name: "quoteIn", type: "uint256" },
      { name: "minTokensOut", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [{ name: "tokensOut", type: "uint256" }],
  },
  { type: "function", name: "graduated", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
] as const;

// Pons V2 fee router (ours)
export const feeRouterAbi = [
  { type: "function", name: "harvest", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "sweepAndHarvest", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

// Pons V2 fee escrow (read-only, to skip empty harvests)
export const escrowAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOfToken",
    stateMutability: "view",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "token", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

// Uniswap QuoterV2
export const quoterAbi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;
