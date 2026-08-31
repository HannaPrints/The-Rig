// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPonsFeeEscrow, IPonsBondingCurve} from "./interfaces/External.sol";

/// @title PonsFeeRouter — where the Pons creator fees land
/// @notice Set as the launch's creatorFeeRecipient, so 70% of every $GPU trade fee
///         accrues to this contract in the Pons fee escrow. No owner. Anyone may
///         call harvest(): ETH splits 80% to the BuybackVault (the miners' pot) and
///         20% to the project treasury; any $GPU fees go 100% to the vault, where a
///         permissionless flushGpu() streams them straight to miners.
/// @dev    Immutable addresses, hardcoded split, permissionless poke — same trust
///         shape as the RoyaltyRouter. The keeper calls harvest() before each buy,
///         but nothing breaks if anyone else calls it first.
contract PonsFeeRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 public constant VAULT_SHARE_BPS = 8000;

    IPonsFeeEscrow public immutable escrow;
    IERC20 public immutable gpu;
    IPonsBondingCurve public immutable curve;
    address payable public immutable vault;
    address payable public immutable treasury;

    uint256 public totalEthRouted;
    uint256 public totalGpuRouted;

    event Harvested(uint256 ethToVault, uint256 ethToTreasury, uint256 gpuToVault);

    error EthTransferFailed();

    constructor(
        IPonsFeeEscrow escrow_,
        IERC20 gpu_,
        IPonsBondingCurve curve_,
        address payable vault_,
        address payable treasury_
    ) {
        escrow = escrow_;
        gpu = gpu_;
        curve = curve_;
        vault = vault_;
        treasury = treasury_;
    }

    /// @dev Escrow claims and clamp refunds arrive as plain sends.
    receive() external payable {}

    /// @notice Sweep the curve's accrued fees into the escrow (when possible), then
    ///         harvest. Pre-graduation, curve fees batch inside the curve: Pons's
    ///         fee-sweep operator can sweep anytime; this contract — the curve's
    ///         registered deployer — can sweep whenever no buyback slice is pending.
    ///         The sweep is best-effort: fees are never lost, only deferred to the
    ///         next operator sweep, and harvest() still routes whatever the escrow
    ///         already holds.
    function sweepAndHarvest() external {
        try curve.sweepFees(0) {} catch {}
        this.harvest();
    }

    function harvest() external nonReentrant {
        // pull whatever the escrow holds for us; tolerate empty balances
        if (escrow.balanceOf(address(this)) > 0) escrow.claim();
        if (escrow.balanceOfToken(address(this), address(gpu)) > 0) escrow.claimToken(address(gpu));

        uint256 ethBal = address(this).balance;
        uint256 toVault;
        if (ethBal > 0) {
            toVault = (ethBal * VAULT_SHARE_BPS) / 10_000;
            _send(vault, toVault);
            _send(treasury, ethBal - toVault);
            totalEthRouted += ethBal;
        }

        uint256 gpuBal = gpu.balanceOf(address(this));
        if (gpuBal > 0) {
            // fee $GPU is already the reward asset — straight to the miners' pot
            gpu.safeTransfer(vault, gpuBal);
            totalGpuRouted += gpuBal;
        }

        emit Harvested(toVault, ethBal - toVault, gpuBal);
    }

    function _send(address payable to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }
}
