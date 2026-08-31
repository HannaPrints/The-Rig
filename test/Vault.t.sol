// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BuybackVault} from "../src/BuybackVault.sol";
import {Rig} from "../src/Rig.sol";
import {RigCard} from "../src/RigCard.sol";
import {ISlotProvider} from "../src/interfaces/External.sol";
import {MockGPU, MockSwapAdapter} from "./mocks/Mocks.sol";

contract VaultTest is Test, ISlotProvider {
    MockGPU gpu;
    MockSwapAdapter adapter;
    BuybackVault vault;
    RigCard card;
    Rig rig;

    address keeper = makeAddr("keeper");

    function slotsOf(address) external pure returns (uint256) {
        return 52;
    }

    function setUp() public {
        gpu = new MockGPU();
        adapter = new MockSwapAdapter(gpu, 1_000_000e18); // 1 ETH -> 1M GPU
        vault = new BuybackVault(IERC20(address(gpu)), keeper, adapter);
        card = new RigCard(address(this));
        card.setModules(address(this), address(this));
        rig = new Rig(IERC20(address(gpu)), card, this, address(vault));
        vault.setRig(rig);
        vm.deal(address(this), 100 ether);
    }

    function test_BuyRoutesGpuIntoStream() public {
        (bool ok,) = address(vault).call{value: 10 ether}(""); // 70% shares + Pons fees land like this
        assertTrue(ok);

        vm.prank(keeper);
        vault.buy(10 ether, 10_000_000e18);

        assertEq(vault.totalBoughtBack(), 10_000_000e18);
        assertEq(gpu.balanceOf(address(rig)), 10_000_000e18);
        assertEq(rig.rewardRate(), 10_000_000e18 / rig.DURATION());
        assertEq(rig.periodFinish(), block.timestamp + 12 hours);
    }

    function test_OnlyKeeperBuys() public {
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertTrue(ok);
        vm.expectRevert(BuybackVault.NotKeeper.selector);
        vault.buy(1 ether, 1);
    }

    function test_SlippageGuard() public {
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertTrue(ok);
        vm.prank(keeper);
        vm.expectRevert(BuybackVault.Slippage.selector);
        vault.buy(1 ether, 2_000_000e18); // pool only gives 1M
    }

    function test_NoWithdrawPathExists() public {
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertTrue(ok);
        // even gov can't extract ETH — the only outflow is a market buy routed to the rig
        vm.prank(keeper);
        vm.expectRevert(BuybackVault.ZeroAmount.selector);
        vault.buy(0, 0);
    }
}
