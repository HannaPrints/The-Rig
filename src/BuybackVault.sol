// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISwapAdapter, IRewardSink} from "./interfaces/External.sol";

/// @title BuybackVault — the miners' pot
/// @notice Everything lands here: 70% of every mint and fee, the claimed Pons creator
///         fees (paid in ETH by Pons V2), and 70% of secondary royalties. The keeper's
///         single privilege is converting that ETH into $GPU on the open market and
///         folding it into the rig's stream. $GPU is never minted — only bought.
/// @dev    Keeper buys are bounded by a minimum output (set off-chain from a quote with
///         a price-impact ceiling) and verified by vault balance delta, so a bad route
///         simply reverts. The keeper cannot name itself recipient and cannot withdraw.
///         Buybacks route through our own Pons pool, so each buy rebates 0.7% back to
///         the protocol via the creator fee — buybacks are self-discounting.
contract BuybackVault is ReentrancyGuard {
    IERC20 public immutable gpu;
    address public immutable gov; // deployer; only wires rig once and rotates keeper/adapter

    address public keeper;
    ISwapAdapter public adapter; // wraps the Pons Uniswap v4 hook pool
    IRewardSink public rig;

    uint256 public totalBoughtBack; // lifetime $GPU purchased for miners

    event Funded(address indexed from, uint256 amount);
    event Bought(uint256 ethIn, uint256 gpuOut);
    event KeeperRotated(address keeper);
    event AdapterRotated(address adapter);
    event RigSet(address rig);

    error NotKeeper();
    error NotGov();
    error RigAlreadySet();
    error Slippage();
    error ZeroAmount();

    constructor(IERC20 gpu_, address keeper_, ISwapAdapter adapter_) {
        gpu = gpu_;
        gov = msg.sender;
        keeper = keeper_;
        adapter = adapter_;
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    /// @notice The keeper's one move: ETH in the pot → $GPU → the rig's 12h stream.
    function buy(uint256 ethAmount, uint256 minGpuOut) external nonReentrant {
        if (msg.sender != keeper) revert NotKeeper();
        if (ethAmount == 0 || minGpuOut == 0) revert ZeroAmount();

        uint256 before = gpu.balanceOf(address(this));
        adapter.swapExactETHForGPU{value: ethAmount}(minGpuOut, address(this));
        uint256 out = gpu.balanceOf(address(this)) - before;
        if (out < minGpuOut) revert Slippage();

        totalBoughtBack += out;
        gpu.approve(address(rig), out);
        rig.notifyRewardAmount(out);
        emit Bought(ethAmount, out);
    }

    // ------------------------------------------------------------ gov surface

    function setRig(IRewardSink rig_) external {
        if (msg.sender != gov) revert NotGov();
        if (address(rig) != address(0)) revert RigAlreadySet();
        rig = rig_;
        emit RigSet(address(rig_));
    }

    function setKeeper(address keeper_) external {
        if (msg.sender != gov) revert NotGov();
        keeper = keeper_;
        emit KeeperRotated(keeper_);
    }

    function setAdapter(ISwapAdapter adapter_) external {
        if (msg.sender != gov) revert NotGov();
        adapter = adapter_;
        emit AdapterRotated(address(adapter_));
    }
}
