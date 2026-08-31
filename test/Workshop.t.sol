// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {RigCard} from "../src/RigCard.sol";
import {Workshop} from "../src/Workshop.sol";
import {MockGPU} from "./mocks/Mocks.sol";

contract WorkshopTest is Test {
    MockGPU gpu;
    RigCard card;
    Workshop workshop;

    address user = makeAddr("user");

    function setUp() public {
        gpu = new MockGPU();
        card = new RigCard(address(this));
        workshop = new Workshop(card, IERC20(address(gpu)), address(this));
        card.setModules(address(this), address(workshop)); // test plays shop
        card.mintCard(user, 3);

        gpu.mint(user, 100_000e18);
        vm.prank(user);
        gpu.approve(address(workshop), type(uint256).max);
    }

    function test_RerollBurnsToDead() public {
        vm.prank(user);
        workshop.reroll(1);
        assertEq(gpu.balanceOf(workshop.DEAD()), 2_000e18);
        assertEq(gpu.balanceOf(address(workshop)), 0); // never holds a balance
        assertEq(card.effectiveMH(1), 60); // gameplay untouched
    }

    function test_SealFreezesCosmetics() public {
        vm.startPrank(user);
        workshop.sealCosmetics(1);
        (,, bool isSealed) = card.cards(1);
        assertTrue(isSealed);
        vm.expectRevert(Workshop.AlreadySealed.selector);
        workshop.reroll(1);
        vm.stopPrank();
    }

    function test_HoldGate() public {
        address poor = makeAddr("poor");
        card.mintCard(poor, 1);
        gpu.mint(poor, 1_000e18);
        vm.startPrank(poor);
        gpu.approve(address(workshop), type(uint256).max);
        vm.expectRevert(Workshop.HoldGateNotMet.selector);
        workshop.reroll(2);
        vm.stopPrank();
    }

    function test_PriceBandEnforced() public {
        vm.expectRevert(Workshop.OutOfBand.selector);
        workshop.tunePrices(1e18, 5_000e18);
        vm.expectRevert(Workshop.OutOfBand.selector);
        workshop.tunePrices(2_000e18, 200_000e18);
        workshop.tunePrices(1_000e18, 3_000e18);
        assertEq(workshop.rerollPrice(), 1_000e18);
    }
}
