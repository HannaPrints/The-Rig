// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISwapAdapter} from "../interfaces/External.sol";

/// @dev Minimal Uniswap v4 PoolManager surface. Currency and IHooks are
///      user-defined wrappers over address, so plain addresses are
///      ABI-identical. BalanceDelta is an int256 packing amount0 (upper 128
///      bits) and amount1 (lower 128 bits).
interface IPoolManagerMin {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
    }

    function unlock(bytes calldata data) external returns (bytes memory);
    function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData)
        external
        returns (int256 swapDelta);
    function settle() external payable returns (uint256 paid);
    function take(address currency, address to, uint256 amount) external;
}

/// @title PonsV4Adapter — ETH → $GPU on the graduated Uniswap v4 pool
/// @notice The vault's buy venue after $GPU graduated off the bonding curve into its
///         locked, Pons-hook-governed v4 pool. Same trust shape as every adapter:
///         stateless, permissionless, no privileges — output goes to the caller-named
///         recipient and the vault re-verifies its own balance delta after every buy.
/// @dev    Swaps run through the PoolManager's unlock/callback flow directly (no
///         router dependency). The PoolKey is pinned at deploy from the launch
///         record the factory snapshotted, so this adapter can never trade the
///         wrong pool.
contract PonsV4Adapter is ISwapAdapter {
    // v4 TickMath.MIN_SQRT_PRICE + 1: "no price limit" for a zeroForOne exact-in swap
    uint160 private constant MIN_SQRT_PRICE_PLUS_ONE = 4295128740;

    IPoolManagerMin public immutable poolManager;
    address public immutable gpu; // currency1 (native ETH is currency0 = address(0))
    uint24 public immutable poolFee;
    int24 public immutable tickSpacing;
    address public immutable hook;

    error NotPoolManager();
    error Slippage();

    constructor(IPoolManagerMin poolManager_, address gpu_, uint24 poolFee_, int24 tickSpacing_, address hook_) {
        poolManager = poolManager_;
        gpu = gpu_;
        poolFee = poolFee_;
        tickSpacing = tickSpacing_;
        hook = hook_;
    }

    function swapExactETHForGPU(uint256 minOut, address to) external payable returns (uint256 out) {
        bytes memory result = poolManager.unlock(abi.encode(msg.value, minOut, to));
        out = abi.decode(result, (uint256));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        (uint256 ethIn, uint256 minOut, address to) = abi.decode(data, (uint256, uint256, address));

        int256 delta = poolManager.swap(
            IPoolManagerMin.PoolKey({
                currency0: address(0), // native ETH sorts first
                currency1: gpu,
                fee: poolFee,
                tickSpacing: tickSpacing,
                hooks: hook
            }),
            IPoolManagerMin.SwapParams({
                zeroForOne: true,
                amountSpecified: -int256(ethIn), // negative = exact input
                sqrtPriceLimitX96: MIN_SQRT_PRICE_PLUS_ONE
            }),
            ""
        );

        int128 amount0 = int128(delta >> 128); // ETH leg: negative, what we owe
        int128 amount1 = int128(int256(delta)); // GPU leg: positive, what we receive
        uint256 out = uint256(uint128(amount1));
        if (amount1 <= 0 || out < minOut) revert Slippage();

        poolManager.settle{value: uint256(uint128(-amount0))}();
        poolManager.take(gpu, to, out);
        return abi.encode(out);
    }
}
