// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISwapAdapter, IPonsBondingCurve} from "../interfaces/External.sol";

/// @title PonsCurveAdapter — ETH → $GPU on the Pons V2 bonding curve
/// @notice The vault's buy venue from token launch until graduation. Stateless and
///         permissionless: holds no funds, has no privileges; output (and any
///         near-graduation clamp refund) goes to the caller-named recipient. When
///         $GPU graduates into its locked Uniswap v4 pool, gov rotates the vault to
///         a v4 adapter via setAdapter — the vault itself never changes.
contract PonsCurveAdapter is ISwapAdapter {
    IPonsBondingCurve public immutable curve;

    constructor(IPonsBondingCurve curve_) {
        curve = curve_;
    }

    function swapExactETHForGPU(uint256 minOut, address to) external payable returns (uint256 out) {
        out = curve.buy{value: msg.value}(msg.value, minOut, to);
    }
}
