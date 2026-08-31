// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title RigCard — the graphics cards
/// @notice ERC-721 port of the original Solana card program. Seven tiers, each with a
///         base hashrate. Overclock levels (+20% base per level, max 5) and the sealed
///         cosmetics flag live on-chain; art lives behind a swappable base URI so the
///         collection can migrate art without touching state (as in the original).
/// @dev    Mint/burn/level are Shop-only; sealing is Workshop-only. The owner's surface
///         is limited to metadata URI, royalty config, and one-time module wiring —
///         mirroring the original's "collection owner cannot touch cards" trust model.
contract RigCard is ERC721, ERC2981, Ownable {
    using Strings for uint256;

    struct Card {
        uint8 tier; // 1..7
        uint8 level; // overclock level 0..5
        bool isSealed; // cosmetics frozen in metadata
    }

    uint8 public constant MAX_TIER = 7;
    uint8 public constant MAX_LEVEL = 5;

    address public shop;
    address public workshop;
    bool public modulesLocked;

    uint256 public nextSerial = 1;
    uint256 public livingCount; // shrinks with every fusion, never grows past mints
    string public baseURI;

    mapping(uint256 => Card) public cards;

    event ModulesSet(address shop, address workshop);
    event CardMinted(uint256 indexed serial, address indexed to, uint8 tier);
    event CardBurned(uint256 indexed serial);
    event Overclocked(uint256 indexed serial, uint8 newLevel);
    event CosmeticsSealed(uint256 indexed serial);

    error NotShop();
    error NotWorkshop();
    error ModulesAlreadyLocked();
    error BadTier();
    error MaxLevelReached();

    constructor(address owner_) ERC721("The Rig: Graphics Cards", "CARD") Ownable(owner_) {}

    // ---------------------------------------------------------------- views

    /// @notice Base hashrate per tier, in MH/s. Matches the original catalog:
    ///         Spud GT 210, Miner MX 450, Volt VX 3060, Blaze BZ 4080,
    ///         Quantum QX 9090, Singularity ∞, Forged (fusion-only).
    function baseMH(uint8 tier) public pure returns (uint32) {
        if (tier == 1) return 10;
        if (tier == 2) return 25;
        if (tier == 3) return 60;
        if (tier == 4) return 150;
        if (tier == 5) return 400;
        if (tier == 6) return 1000;
        if (tier == 7) return 2500;
        revert BadTier();
    }

    /// @notice Hashrate after overclock: +20% of base per level, up to +100% at level 5.
    function effectiveMH(uint256 serial) public view returns (uint256) {
        _requireOwned(serial);
        Card memory c = cards[serial];
        return (uint256(baseMH(c.tier)) * (100 + 20 * uint256(c.level))) / 100;
    }

    function tokenURI(uint256 serial) public view override returns (string memory) {
        _requireOwned(serial);
        return string.concat(baseURI, serial.toString());
    }

    // ---------------------------------------------------------- shop surface

    modifier onlyShop() {
        if (msg.sender != shop) revert NotShop();
        _;
    }

    function mintCard(address to, uint8 tier) external onlyShop returns (uint256 serial) {
        if (tier == 0 || tier > MAX_TIER) revert BadTier();
        serial = nextSerial++;
        cards[serial] = Card({tier: tier, level: 0, isSealed: false});
        livingCount++;
        _safeMint(to, serial);
        emit CardMinted(serial, to, tier);
    }

    /// @dev Fusion input: burned permanently. Living supply only shrinks.
    function burnCard(uint256 serial) external onlyShop {
        livingCount--;
        delete cards[serial];
        _burn(serial);
        emit CardBurned(serial);
    }

    function bumpLevel(uint256 serial) external onlyShop {
        Card storage c = cards[serial];
        if (c.level >= MAX_LEVEL) revert MaxLevelReached();
        c.level++;
        emit Overclocked(serial, c.level);
    }

    // ------------------------------------------------------ workshop surface

    function setSealedFlag(uint256 serial) external {
        if (msg.sender != workshop) revert NotWorkshop();
        cards[serial].isSealed = true;
        emit CosmeticsSealed(serial);
    }

    // --------------------------------------------------------- owner surface

    /// @notice One-time wiring; locked forever afterwards.
    function setModules(address shop_, address workshop_) external onlyOwner {
        if (modulesLocked) revert ModulesAlreadyLocked();
        modulesLocked = true;
        shop = shop_;
        workshop = workshop_;
        emit ModulesSet(shop_, workshop_);
    }

    function setBaseURI(string calldata uri) external onlyOwner {
        baseURI = uri;
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    // -------------------------------------------------------------- plumbing

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
