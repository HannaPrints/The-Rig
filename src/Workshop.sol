// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {RigCard} from "./RigCard.sol";

/// @title Workshop — cosmetics only
/// @notice Burn $GPU to reroll a card's appearance (chassis, color, accent, finish,
///         lights, decal, screen), burn again to seal it permanently. Hashrate,
///         earnings, rank and rarity are untouched. Tokens go straight to 0x…dEaD;
///         the workshop never holds a balance.
/// @dev    Price dials are tunable inside bands fixed at deploy — they can never hit
///         zero or become absurd. Reroll seeds are emitted for the renderer; they carry
///         no gameplay weight, so simple entropy is fine here.
contract Workshop is Ownable {
    using SafeERC20 for IERC20;

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant PRICE_MIN = 100e18;
    uint256 public constant PRICE_MAX = 100_000e18;
    uint256 public constant HOLD_GATE = 25_000e18; // hold, not spend

    RigCard public immutable card;
    IERC20 public immutable gpu;

    uint256 public rerollPrice = 2_000e18;
    uint256 public sealPrice = 5_000e18;

    event Rerolled(uint256 indexed serial, bytes32 appearanceSeed, uint256 burned);
    event SealPurchased(uint256 indexed serial, uint256 burned);
    event PricesTuned(uint256 rerollPrice, uint256 sealPrice);

    error NotCardOwner();
    error AlreadySealed();
    error HoldGateNotMet();
    error OutOfBand();

    constructor(RigCard card_, IERC20 gpu_, address owner_) Ownable(owner_) {
        card = card_;
        gpu = gpu_;
    }

    modifier onlyCardOwner(uint256 serial) {
        if (card.ownerOf(serial) != msg.sender) revert NotCardOwner();
        _;
    }

    function reroll(uint256 serial) external onlyCardOwner(serial) {
        if (gpu.balanceOf(msg.sender) < HOLD_GATE) revert HoldGateNotMet();
        (,, bool isSealed) = card.cards(serial);
        if (isSealed) revert AlreadySealed();
        gpu.safeTransferFrom(msg.sender, DEAD, rerollPrice);
        bytes32 seed = keccak256(abi.encodePacked(serial, msg.sender, block.timestamp, gpu.balanceOf(DEAD)));
        emit Rerolled(serial, seed, rerollPrice);
    }

    function sealCosmetics(uint256 serial) external onlyCardOwner(serial) {
        if (gpu.balanceOf(msg.sender) < HOLD_GATE) revert HoldGateNotMet();
        (,, bool isSealed) = card.cards(serial);
        if (isSealed) revert AlreadySealed();
        gpu.safeTransferFrom(msg.sender, DEAD, sealPrice);
        card.setSealedFlag(serial);
        emit SealPurchased(serial, sealPrice);
    }

    function tunePrices(uint256 rerollPrice_, uint256 sealPrice_) external onlyOwner {
        if (rerollPrice_ < PRICE_MIN || rerollPrice_ > PRICE_MAX) revert OutOfBand();
        if (sealPrice_ < PRICE_MIN || sealPrice_ > PRICE_MAX) revert OutOfBand();
        rerollPrice = rerollPrice_;
        sealPrice = sealPrice_;
        emit PricesTuned(rerollPrice_, sealPrice_);
    }
}
