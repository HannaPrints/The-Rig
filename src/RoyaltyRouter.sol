// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title RoyaltyRouter
/// @notice No owner at all. Secondary royalties land here and anyone can flush them:
///         70% to the miners' pot, 30% to the project. Immutable addresses, hardcoded
///         split, permissionless flush so funds can never be locked up.
contract RoyaltyRouter {
    using SafeERC20 for IERC20;

    uint16 public constant SPLIT_BPS = 7000;
    address payable public immutable vault;
    address payable public immutable treasury;

    event Flushed(uint256 toVault, uint256 toTreasury);
    event FlushedToken(address indexed token, uint256 toVault, uint256 toTreasury);

    error EthTransferFailed();

    constructor(address payable vault_, address payable treasury_) {
        vault = vault_;
        treasury = treasury_;
    }

    receive() external payable {}

    function flush() external {
        uint256 balance = address(this).balance;
        uint256 toVault = (balance * SPLIT_BPS) / 10_000;
        _send(vault, toVault);
        _send(treasury, balance - toVault);
        emit Flushed(toVault, balance - toVault);
    }

    function flushToken(IERC20 token) external {
        uint256 balance = token.balanceOf(address(this));
        uint256 toVault = (balance * SPLIT_BPS) / 10_000;
        token.safeTransfer(vault, toVault);
        token.safeTransfer(treasury, balance - toVault);
        emit FlushedToken(address(token), toVault, balance - toVault);
    }

    function _send(address payable to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }
}
