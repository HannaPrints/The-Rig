// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {RigCard} from "./RigCard.sol";
import {IAggregatorV3, ISlotProvider} from "./interfaces/External.sol";

/// @title Shop — mints, overclocks, fusions, racks
/// @notice Every payment splits 70/30 at the point of receipt: 70% to the BuybackVault
///         (the miners' pot), 30% to the project treasury. Prices are denominated in
///         USD and settled in ETH via the Chainlink ETH/USD feed, so the sticker price
///         stays $5 regardless of ETH.
///
///         Pricing keeps the original's mint-relative ratios (original mint 0.35 SOL):
///           mint       $5
///           overclock  baseMH × (mint/87.5) × 2^targetLevel
///           fusion     baseMH × (mint/350)
///           rack n     2.5 × mint × n
///
/// @dev    Randomness: the original used Solana slot hashes. On Arbitrum-stack chains
///         block.prevrandao is a constant, so instead the site's EIP-712 mint permit
///         commits a server random seed BEFORE tiers are computed; tiers derive from
///         keccak(seed, minter, serial). The signer can't cheat retroactively and the
///         chain adds nothing manipulable.
contract Shop is Ownable, EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ----------------------------------------------------------------- economy
    uint256 public constant MINT_USD = 5e8; // $5, 8 decimals (Chainlink convention)
    uint256 public constant MAX_SUPPLY = 10_000; // shop mints; fusion output doesn't count
    uint256 public constant MAX_PER_TX = 8;
    uint16 public constant SPLIT_BPS = 7000; // 70% to the miners' pot, always

    // burn gate: $GPU torched from the minter inside the mint tx.
    // 10,000 × 12,500 = 125M = 12.5% of supply at cap — same ratio as the original.
    uint256 public constant BURN_MIN = 250e18;
    uint256 public constant BURN_MAX = 50_000e18;
    uint256 public burnPerMint = 12_500e18;

    // hold gate for overclock (hold, not spend)
    uint256 public constant HOLD_GATE = 25_000e18;

    // anti-bot: a 10,000 sellout takes ≥25 hours by construction
    uint256 public constant MINTS_PER_HOUR = 400;
    uint256 public constant WALLET_COOLDOWN = 30 seconds;

    // racks: room starts at 4 slots, each rack adds 4, max 12 racks = 52 slots
    uint256 public constant BASE_SLOTS = 4;
    uint256 public constant SLOTS_PER_RACK = 4;
    uint256 public constant MAX_RACKS = 12;

    uint256 public constant FEED_STALE_AFTER = 24 hours;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    // tier odds in bps: 52% / 26% / 13% / 7% / 2% (T6+ fusion-only)
    uint16 private constant C1 = 5200;
    uint16 private constant C2 = 7800;
    uint16 private constant C3 = 9100;
    uint16 private constant C4 = 9800;

    bytes32 private constant MINT_PERMIT_TYPEHASH =
        keccak256("MintPermit(address to,uint256 qty,bytes32 seed,uint256 nonce,uint256 deadline)");

    // ------------------------------------------------------------------ wiring
    RigCard public immutable card;
    IERC20 public immutable gpu;
    IAggregatorV3 public immutable ethUsdFeed;
    address payable public immutable vault; // miners' pot (BuybackVault)
    address payable public immutable treasury; // project's 30%
    address public signer; // permit signer behind the site's bot check

    // ------------------------------------------------------------------- state
    uint256 public madeCount; // counts against MAX_SUPPLY; living count is on the card
    mapping(uint256 => uint256) public mintsInHour; // hour bucket => count
    mapping(address => uint256) public lastMintAt;
    mapping(uint256 => bool) public nonceUsed;
    mapping(address => uint256) public racksOf;

    event Minted(address indexed to, uint256 indexed serial, uint8 tier, uint256 paidWei, uint256 burned);
    event OverclockPurchased(uint256 indexed serial, uint8 newLevel, uint256 paidWei);
    event Fused(uint256 indexed serialA, uint256 indexed serialB, uint256 indexed newSerial, uint8 newTier);
    event RackPurchased(address indexed user, uint256 rackNumber, uint256 paidWei);
    event BurnPerMintTuned(uint256 newAmount);
    event SignerRotated(address newSigner);

    error NotEOA();
    error BadQty();
    error SoldOut();
    error HourlyThrottle();
    error WalletCooldown();
    error PermitExpired();
    error PermitUsed();
    error BadSignature();
    error Underpaid();
    error StalePrice();
    error HoldGateNotMet();
    error CardNotInWallet();
    error TierMismatch();
    error MaxTierReached();
    error MaxRacksReached();
    error OutOfBand();
    error EthTransferFailed();

    constructor(
        RigCard card_,
        IERC20 gpu_,
        IAggregatorV3 feed_,
        address payable vault_,
        address payable treasury_,
        address signer_,
        address owner_
    ) Ownable(owner_) EIP712("TheRigShop", "1") {
        card = card_;
        gpu = gpu_;
        ethUsdFeed = feed_;
        vault = vault_;
        treasury = treasury_;
        signer = signer_;
    }

    // ------------------------------------------------------------------ prices

    /// @notice Convert a USD amount (8 decimals) to wei via Chainlink ETH/USD.
    function usdToWei(uint256 usd8) public view returns (uint256) {
        (, int256 answer,, uint256 updatedAt,) = ethUsdFeed.latestRoundData();
        if (answer <= 0 || block.timestamp - updatedAt > FEED_STALE_AFTER) revert StalePrice();
        return (usd8 * 1e18) / uint256(answer);
    }

    function mintPriceWei(uint256 qty) public view returns (uint256) {
        return usdToWei(MINT_USD * qty);
    }

    /// @dev overclock to targetLevel: baseMH × (MINT_USD / 87.5) × 2^targetLevel
    function overclockPriceWei(uint256 serial) public view returns (uint256) {
        (uint8 tier, uint8 level,) = card.cards(serial);
        uint256 usd8 = (uint256(card.baseMH(tier)) * MINT_USD * (1 << (level + 1)) * 8) / 700;
        return usdToWei(usd8);
    }

    /// @dev fusion fee: baseMH × (MINT_USD / 350)
    function fusionPriceWei(uint8 tier) public view returns (uint256) {
        return usdToWei((uint256(card.baseMH(tier)) * MINT_USD) / 350);
    }

    /// @dev rack n costs 2.5 × mint × n
    function rackPriceWei(uint256 rackNumber) public view returns (uint256) {
        return usdToWei((25e8 * rackNumber) / 2);
    }

    function slotsOf(address user) external view returns (uint256) {
        return BASE_SLOTS + SLOTS_PER_RACK * racksOf[user];
    }

    // -------------------------------------------------------------------- mint

    function mint(uint256 qty, bytes32 seed, uint256 nonce, uint256 deadline, bytes calldata sig)
        external
        payable
        nonReentrant
    {
        // anti-bot layer 1: mint() refuses contracts
        if (msg.sender != tx.origin || msg.sender.code.length != 0) revert NotEOA();
        if (qty == 0 || qty > MAX_PER_TX) revert BadQty();
        if (madeCount + qty > MAX_SUPPLY) revert SoldOut();

        _checkThrottle(qty); // anti-bot layer 3
        _verifyPermit(qty, seed, nonce, deadline, sig); // anti-bot layer 2
        madeCount += qty;

        // burn gate: $GPU torched from the minter's balance inside the mint
        uint256 burned = burnPerMint * qty;
        if (burned > 0) gpu.safeTransferFrom(msg.sender, DEAD, burned);

        uint256 cost = mintPriceWei(qty);
        _takePayment(cost);

        uint256 perCard = cost / qty;
        for (uint256 i = 0; i < qty; i++) {
            uint8 tier = _rollTier(seed, msg.sender, card.nextSerial());
            uint256 serial = card.mintCard(msg.sender, tier);
            emit Minted(msg.sender, serial, tier, perCard, burnPerMint);
        }
    }

    /// @dev global throttle + wallet cooldown
    function _checkThrottle(uint256 qty) internal {
        uint256 bucket = block.timestamp / 1 hours;
        if (mintsInHour[bucket] + qty > MINTS_PER_HOUR) revert HourlyThrottle();
        if (block.timestamp < lastMintAt[msg.sender] + WALLET_COOLDOWN) revert WalletCooldown();
        mintsInHour[bucket] += qty;
        lastMintAt[msg.sender] = block.timestamp;
    }

    /// @dev site-signed permit, short deadline, nonce burned on use.
    ///      The seed inside the permit is the committed randomness for this mint.
    function _verifyPermit(uint256 qty, bytes32 seed, uint256 nonce, uint256 deadline, bytes calldata sig) internal {
        if (block.timestamp > deadline) revert PermitExpired();
        if (nonceUsed[nonce]) revert PermitUsed();
        nonceUsed[nonce] = true;
        bytes32 digest =
            _hashTypedDataV4(keccak256(abi.encode(MINT_PERMIT_TYPEHASH, msg.sender, qty, seed, nonce, deadline)));
        if (ECDSA.recover(digest, sig) != signer) revert BadSignature();
    }

    function _rollTier(bytes32 seed, address to, uint256 serial) internal pure returns (uint8) {
        uint256 r = uint256(keccak256(abi.encodePacked(seed, to, serial))) % 10_000;
        if (r < C1) return 1;
        if (r < C2) return 2;
        if (r < C3) return 3;
        if (r < C4) return 4;
        return 5;
    }

    // ---------------------------------------------------------------- upgrades

    /// @notice +20% base hashrate per level. Card must be in your wallet (ejected from
    ///         the rig) — the rig re-reads hashrate when you slot it back in.
    function overclock(uint256 serial) external payable nonReentrant {
        if (gpu.balanceOf(msg.sender) < HOLD_GATE) revert HoldGateNotMet();
        if (card.ownerOf(serial) != msg.sender) revert CardNotInWallet();
        uint256 cost = overclockPriceWei(serial);
        _takePayment(cost);
        card.bumpLevel(serial);
        (, uint8 level,) = card.cards(serial);
        emit OverclockPurchased(serial, level, cost);
    }

    /// @notice Two identical-tier cards + fee → one next-tier card at level 0.
    ///         Overclock levels are sacrificed. Living supply shrinks by one, forever.
    function fuse(uint256 serialA, uint256 serialB) external payable nonReentrant {
        if (card.ownerOf(serialA) != msg.sender || card.ownerOf(serialB) != msg.sender) revert CardNotInWallet();
        (uint8 tierA,,) = card.cards(serialA);
        (uint8 tierB,,) = card.cards(serialB);
        if (tierA != tierB) revert TierMismatch();
        if (tierA >= card.MAX_TIER()) revert MaxTierReached();

        uint256 cost = fusionPriceWei(tierA);
        _takePayment(cost);

        card.burnCard(serialA);
        card.burnCard(serialB);
        uint256 newSerial = card.mintCard(msg.sender, tierA + 1);
        emit Fused(serialA, serialB, newSerial, tierA + 1);
    }

    function buyRack() external payable nonReentrant {
        uint256 n = racksOf[msg.sender] + 1;
        if (n > MAX_RACKS) revert MaxRacksReached();
        uint256 cost = rackPriceWei(n);
        _takePayment(cost);
        racksOf[msg.sender] = n;
        emit RackPurchased(msg.sender, n, cost);
    }

    // ---------------------------------------------------------------- plumbing

    /// @dev 70% straight to the miners' pot, 30% to the project, excess refunded.
    function _takePayment(uint256 cost) internal {
        if (msg.value < cost) revert Underpaid();
        uint256 toVault = (cost * SPLIT_BPS) / 10_000;
        _send(vault, toVault);
        _send(treasury, cost - toVault);
        if (msg.value > cost) _send(payable(msg.sender), msg.value - cost);
    }

    function _send(address payable to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }

    // ------------------------------------------------------------ owner surface
    // The owner can rotate the permit signer and tune the burn dial inside its
    // deploy-fixed band. It cannot touch cards, the rig, or the miners' 70%.

    function setSigner(address signer_) external onlyOwner {
        signer = signer_;
        emit SignerRotated(signer_);
    }

    function tuneBurnPerMint(uint256 amount) external onlyOwner {
        if (amount < BURN_MIN || amount > BURN_MAX) revert OutOfBand();
        burnPerMint = amount;
        emit BurnPerMintTuned(amount);
    }
}
