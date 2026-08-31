// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISwapAdapter} from "../interfaces/External.sol";

/// @dev SwapRouter02-style surface (Uniswap v3 periphery). The router wraps the ETH
///      sent with the call when tokenIn is WETH9.
interface IV3SwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/// @title UniV3SwapAdapter — ETH → $GPU through the Pons pool
/// @notice Stateless and permissionless: it holds no funds and no privileges; output
///         always goes to the caller-named recipient and the vault re-checks its own
///         balance delta after every buy. Pons V1 pools are Uniswap v3 (1% fee tier);
///         when the V2 hook pool ABI is verified on mainnet, a v4 adapter replaces
///         this one via the vault's gov-only setAdapter — the vault never changes.
contract UniV3SwapAdapter is ISwapAdapter {
    IV3SwapRouter public immutable router;
    address public immutable weth;
    address public immutable gpu;
    uint24 public immutable poolFee;

    constructor(IV3SwapRouter router_, address weth_, address gpu_, uint24 poolFee_) {
        router = router_;
        weth = weth_;
        gpu = gpu_;
        poolFee = poolFee_;
    }

    function swapExactETHForGPU(uint256 minOut, address to) external payable returns (uint256 out) {
        out = router.exactInputSingle{
            value: msg.value
        }(
            IV3SwapRouter.ExactInputSingleParams({
                tokenIn: weth,
                tokenOut: gpu,
                fee: poolFee,
                recipient: to,
                amountIn: msg.value,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
    }
}
