// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Shop} from "../src/Shop.sol";
import {Rig} from "../src/Rig.sol";
import {RigCard} from "../src/RigCard.sol";
import {BuybackVault} from "../src/BuybackVault.sol";
import {Workshop} from "../src/Workshop.sol";
import {ISlotProvider, ISwapAdapter} from "../src/interfaces/External.sol";
import {MockGPU, MockFeed, MockSwapAdapter} from "./mocks/Mocks.sol";

contract ShopTest is Test {
    uint256 constant SIGNER_PK = 0xA11CE;
    int256 constant ETH_USD = 4000e8; // $4,000/ETH -> $5 mint = 0.00125 ETH

    MockGPU gpu;
    MockFeed feed;
    MockSwapAdapter adapter;
    BuybackVault vault;
    RigCard card;
    Shop shop;
    Rig rig;
    Workshop workshop;

    address signer;
    address keeper = makeAddr("keeper");
    address payable treasury = payable(makeAddr("treasury"));
    address user = makeAddr("user");

    bytes32 constant MINT_PERMIT_TYPEHASH =
        keccak256("MintPermit(address to,uint256 qty,bytes32 seed,uint256 nonce,uint256 deadline)");

    function setUp() public {
        vm.warp(1_756_000_000);
        signer = vm.addr(SIGNER_PK);

        gpu = new MockGPU();
        feed = new MockFeed(ETH_USD);
        adapter = new MockSwapAdapter(gpu, 0);
        vault = new BuybackVault(IERC20(address(gpu)), keeper, adapter);
        card = new RigCard(address(this));
        shop = new Shop(card, IERC20(address(gpu)), feed, payable(address(vault)), treasury, signer, address(this));
        rig = new Rig(IERC20(address(gpu)), card, ISlotProvider(address(shop)), address(vault));
        vault.setRig(rig);
        workshop = new Workshop(card, IERC20(address(gpu)), address(this));
        card.setModules(address(shop), address(workshop));

        vm.deal(user, 100 ether);
        gpu.mint(user, 1_000_000e18);
        vm.prank(user);
        gpu.approve(address(shop), type(uint256).max);
    }

    function _sign(address to, uint256 qty, bytes32 seed, uint256 nonce, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash = keccak256(abi.encode(MINT_PERMIT_TYPEHASH, to, qty, seed, nonce, deadline));
        bytes32 domain = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("TheRigShop")),
                keccak256(bytes("1")),
                block.chainid,
                address(shop)
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domain, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PK, digest);
        return abi.encodePacked(r, s, v);
    }

    function _mintAs(address who, uint256 qty, bytes32 seed, uint256 nonce) internal {
        uint256 deadline = block.timestamp + 5 minutes;
        bytes memory sig = _sign(who, qty, seed, nonce, deadline);
        uint256 cost = shop.mintPriceWei(qty);
        vm.prank(who, who); // EOA path: msg.sender == tx.origin
        shop.mint{value: cost}(qty, seed, nonce, deadline, sig);
    }

    // same formula as Shop._rollTier — the seed is committed in the permit,
    // so tiers are fully deterministic and reproducible off-chain
    function _expectedTier(bytes32 seed, address to, uint256 serial) internal pure returns (uint8) {
        uint256 r = uint256(keccak256(abi.encodePacked(seed, to, serial))) % 10_000;
        if (r < 5200) return 1;
        if (r < 7800) return 2;
        if (r < 9100) return 3;
        if (r < 9800) return 4;
        return 5;
    }

    function test_MintSplitsPaymentAndBurnsGate() public {
        uint256 cost = shop.mintPriceWei(3);
        assertEq(cost, 0.00375 ether); // 3 × $5 at $4,000/ETH

        _mintAs(user, 3, keccak256("seed-1"), 1);

        assertEq(address(vault).balance, (cost * 7000) / 10_000);
        assertEq(treasury.balance, cost - (cost * 7000) / 10_000);
        assertEq(gpu.balanceOf(shop.DEAD()), 3 * 12_500e18);
        assertEq(shop.madeCount(), 3);
        assertEq(card.livingCount(), 3);
        assertEq(card.ownerOf(1), user);
        assertEq(card.ownerOf(3), user);
    }

    function test_TiersMatchCommittedSeed() public {
        bytes32 seed = keccak256("seed-2");
        _mintAs(user, 8, seed, 2);
        for (uint256 serial = 1; serial <= 8; serial++) {
            (uint8 tier,,) = card.cards(serial);
            assertEq(tier, _expectedTier(seed, user, serial));
        }
    }

    function test_RevertsOnForgedPermit() public {
        uint256 deadline = block.timestamp + 5 minutes;
        bytes32 seed = keccak256("seed-3");
        // signed for a different wallet
        bytes memory sig = _sign(makeAddr("someone-else"), 1, seed, 3, deadline);
        uint256 cost = shop.mintPriceWei(1);
        vm.prank(user, user);
        vm.expectRevert(Shop.BadSignature.selector);
        shop.mint{value: cost}(1, seed, 3, deadline, sig);
    }

    function test_NonceBurnsOnUse() public {
        _mintAs(user, 1, keccak256("seed-4"), 4);
        skip(31); // clear wallet cooldown; nonce must still be dead
        uint256 deadline = block.timestamp + 5 minutes;
        bytes memory sig = _sign(user, 1, keccak256("seed-4"), 4, deadline);
        uint256 cost = shop.mintPriceWei(1);
        vm.expectRevert(Shop.PermitUsed.selector);
        vm.prank(user, user);
        shop.mint{value: cost}(1, keccak256("seed-4"), 4, deadline, sig);
    }

    function test_WalletCooldown() public {
        _mintAs(user, 1, keccak256("seed-5"), 5);
        uint256 deadline = block.timestamp + 5 minutes;
        bytes memory sig = _sign(user, 1, keccak256("seed-6"), 6, deadline);
        uint256 cost = shop.mintPriceWei(1);
        vm.expectRevert(Shop.WalletCooldown.selector);
        vm.prank(user, user);
        shop.mint{value: cost}(1, keccak256("seed-6"), 6, deadline, sig);

        skip(31);
        _mintAs(user, 1, keccak256("seed-6"), 7); // fine after cooldown
    }

    function test_ContractsCannotMint() public {
        uint256 deadline = block.timestamp + 5 minutes;
        bytes memory sig = _sign(address(this), 1, bytes32(0), 8, deadline);
        vm.expectRevert(Shop.NotEOA.selector);
        shop.mint{value: 1 ether}(1, bytes32(0), 8, deadline, sig);
    }

    function test_HourlyThrottle() public {
        // 400/hour on-chain: 50 wallets × 8 fills the bucket, the 401st mint reverts
        vm.warp((block.timestamp / 1 hours) * 1 hours); // align to a fresh bucket
        for (uint256 i = 0; i < 50; i++) {
            address w = makeAddr(string.concat("w", vm.toString(i)));
            vm.deal(w, 1 ether);
            gpu.mint(w, 200_000e18);
            vm.prank(w);
            gpu.approve(address(shop), type(uint256).max);
            _mintAs(w, 8, keccak256(abi.encode(i)), 100 + i);
        }
        assertEq(shop.madeCount(), 400);

        uint256 deadline = block.timestamp + 5 minutes;
        bytes memory sig = _sign(user, 1, keccak256("late"), 999, deadline);
        uint256 cost = shop.mintPriceWei(1);
        vm.expectRevert(Shop.HourlyThrottle.selector);
        vm.prank(user, user);
        shop.mint{value: cost}(1, keccak256("late"), 999, deadline, sig);

        skip(1 hours); // next bucket opens
        _mintAs(user, 1, keccak256("late-2"), 1000);
    }

    function test_OverclockRaisesHashrateAndCharges() public {
        _mintAs(user, 1, keccak256("seed-7"), 9);
        (uint8 tier,,) = card.cards(1);
        uint256 baseHash = card.baseMH(tier);

        uint256 cost = shop.overclockPriceWei(1);
        // level 0 -> 1 costs baseMH × ($5/87.5) × 2
        assertEq(cost, ((uint256(baseHash) * 5e8 * 2 * 8) / 700) * 1e18 / uint256(uint256(int256(ETH_USD))));

        uint256 vaultBefore = address(vault).balance;
        vm.prank(user, user);
        shop.overclock{value: cost}(1);

        (, uint8 level,) = card.cards(1);
        assertEq(level, 1);
        assertEq(card.effectiveMH(1), (baseHash * 120) / 100);
        assertEq(address(vault).balance - vaultBefore, (cost * 7000) / 10_000);
    }

    function test_OverclockNeedsHoldGate() public {
        address poor = makeAddr("poor");
        vm.deal(poor, 1 ether);
        gpu.mint(poor, 12_500e18); // exactly the burn gate, nothing left to hold
        vm.prank(poor);
        gpu.approve(address(shop), type(uint256).max);
        _mintAs(poor, 1, keccak256("seed-8"), 10);

        vm.expectRevert(Shop.HoldGateNotMet.selector);
        vm.prank(poor, poor);
        shop.overclock{value: 0.1 ether}(1);
    }

    function test_FusionBurnsTwoMintsNextTier() public {
        bytes32 seed = keccak256("seed-9");
        _mintAs(user, 8, seed, 11);

        // find a same-tier pair (deterministic given the committed seed)
        uint256 a;
        uint256 b;
        for (uint256 i = 1; i <= 8 && b == 0; i++) {
            for (uint256 j = i + 1; j <= 8; j++) {
                if (_expectedTier(seed, user, i) == _expectedTier(seed, user, j)) {
                    (a, b) = (i, j);
                    break;
                }
            }
        }
        assertGt(b, 0, "no same-tier pair in 8 mints");

        (uint8 tier,,) = card.cards(a);
        uint256 cost = shop.fusionPriceWei(tier);
        uint256 livingBefore = card.livingCount();

        vm.prank(user, user);
        shop.fuse{value: cost}(a, b);

        assertEq(card.livingCount(), livingBefore - 1); // two retired, one forged
        (uint8 newTier, uint8 newLevel,) = card.cards(9);
        assertEq(newTier, tier + 1);
        assertEq(newLevel, 0); // overclock sacrificed
        vm.expectRevert();
        card.ownerOf(a);
    }

    function test_RacksExpandSlots() public {
        assertEq(shop.slotsOf(user), 4);
        uint256 cost = shop.rackPriceWei(1);
        assertEq(cost, 0.003125 ether); // $12.50 at $4,000/ETH

        vm.prank(user, user);
        shop.buyRack{value: cost}();
        assertEq(shop.slotsOf(user), 8);

        for (uint256 n = 2; n <= 12; n++) {
            uint256 rackCost = shop.rackPriceWei(n);
            vm.prank(user, user);
            shop.buyRack{value: rackCost}();
        }
        assertEq(shop.slotsOf(user), 52);

        vm.expectRevert(Shop.MaxRacksReached.selector);
        vm.prank(user, user);
        shop.buyRack{value: 1 ether}();
    }

    function test_BurnDialStaysInBand() public {
        vm.expectRevert(Shop.OutOfBand.selector);
        shop.tuneBurnPerMint(100e18);
        vm.expectRevert(Shop.OutOfBand.selector);
        shop.tuneBurnPerMint(60_000e18);
        shop.tuneBurnPerMint(25_000e18);
        assertEq(shop.burnPerMint(), 25_000e18);
    }
}
