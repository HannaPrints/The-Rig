// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Chainlink price feed (ETH/USD, 8 decimals on Robinhood Chain).
interface IAggregatorV3 {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/// @dev Minimal swap surface the BuybackVault drives.
/// The production adapter wraps the Pons Uniswap v4 hook pool ($GPU/ETH);
/// keeping the surface this small lets us swap venues without touching the vault.
interface ISwapAdapter {
    /// Swap exact ETH for $GPU, sending output to `to`. Returns amount out.
    function swapExactETHForGPU(uint256 minOut, address to) external payable returns (uint256);
}

/// @dev The vault's single privilege on the rig.
interface IRewardSink {
    function notifyRewardAmount(uint256 reward) external;
}

/// @dev Slot accounting lives in the Shop (racks are bought there).
interface ISlotProvider {
    function slotsOf(address user) external view returns (uint256);
}

/// @dev Pons V2 fee escrow: creator fees accrue here per recipient and must be
///      pulled by the recipient (msg.sender-gated). Verified against the live
///      factory's feeEscrow on Robinhood Chain.
interface IPonsFeeEscrow {
    function claim() external returns (uint256 amount);
    function claimToken(address token) external returns (uint256 amount);
    function balanceOf(address recipient) external view returns (uint256);
    function balanceOfToken(address recipient, address token) external view returns (uint256);
}

/// @dev Pons V2 bonding curve: where $GPU trades pre-graduation. Buys are
///      ETH-in for native-quote launches; excess quote near graduation is
///      clamp-refunded to `recipient`.
interface IPonsBondingCurve {
    function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) external payable returns (uint256 tokensOut);
    function graduated() external view returns (bool);
    function quoteReserve() external view returns (uint256);
}
