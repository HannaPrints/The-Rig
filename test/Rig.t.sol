// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Rig} from "../src/Rig.sol";
import {RigCard} from "../src/RigCard.sol";
import {MockGPU} from "./mocks/Mocks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISlotProvider} from "../src/interfaces/External.sol";

/// @dev The test contract plays shop (card minter + slot provider) and distributor.
contract RigTest is Test, ISlotProvider {
    MockGPU gpu;
    RigCard card;
    Rig rig;

    address miner1 = makeAddr("miner1");
    address miner2 = makeAddr("miner2");

    function slotsOf(address) external pure returns (uint256) {
        return 52;
    }

    function setUp() public {
        gpu = new MockGPU();
        card = new RigCard(address(this));
        card.setModules(address(this), address(this));
        rig = new Rig(IERC20(address(gpu)), card, this, address(this));
        gpu.mint(address(this), 1_000_000_000e18);
        gpu.approve(address(rig), type(uint256).max);
    }

    function _stakeOne(address miner, uint8 tier) internal returns (uint256 serial) {
        serial = card.mintCard(miner, tier);
        vm.startPrank(miner);
        card.setApprovalForAll(address(rig), true);
        uint256[] memory ids = new uint256[](1);
        ids[0] = serial;
        rig.stake(ids);
        vm.stopPrank();
    }

    function test_ProRataByHashrate() public {
        _stakeOne(miner1, 1); // 10 MH
        uint256 s2 = _stakeOne(miner2, 1); // 10 MH
        uint256 s3 = _stakeOne(miner2, 2); // 25 MH  -> miner2 total 35 MH
        assertEq(rig.totalWeight(), 45);
        assertEq(rig.stakedWeight(s2) + rig.stakedWeight(s3), 35);

        rig.notifyRewardAmount(45_000e18);
        skip(12 hours);

        assertApproxEqRel(rig.earned(miner1), 10_000e18, 1e15);
        assertApproxEqRel(rig.earned(miner2), 35_000e18, 1e15);

        vm.prank(miner1);
        rig.claim();
        assertApproxEqRel(gpu.balanceOf(miner1), 10_000e18, 1e15);
        assertEq(rig.earned(miner1), 0);
    }

    function test_StreamPausesWhileRigEmpty() public {
        rig.notifyRewardAmount(43_200e18); // 1e18 per second over 12h
        skip(6 hours); // rig empty: time must not steal from miners

        _stakeOne(miner1, 1);
        uint256 finish = rig.periodFinish();
        assertEq(finish, block.timestamp + 12 hours); // window shifted forward intact

        skip(12 hours);
        assertApproxEqRel(rig.earned(miner1), 43_200e18, 1e15);
    }

    function test_RewardRolloverOnNotify() public {
        _stakeOne(miner1, 1);
        rig.notifyRewardAmount(43_200e18);
        skip(6 hours); // half streamed
        rig.notifyRewardAmount(21_600e18); // leftover 21,600 + 21,600 over a fresh 12h
        assertApproxEqRel(rig.rewardRate(), 1e18, 1e15);
        skip(12 hours);
        assertApproxEqRel(rig.earned(miner1), 64_800e18, 1e15);
    }

    function test_UnstakeStopsAccrual() public {
        uint256 serial = _stakeOne(miner1, 5); // 400 MH, alone in the rig
        rig.notifyRewardAmount(1_000e18);
        skip(6 hours);

        vm.startPrank(miner1);
        uint256[] memory ids = new uint256[](1);
        ids[0] = serial;
        rig.unstake(ids);
        vm.stopPrank();

        assertEq(card.ownerOf(serial), miner1);
        uint256 snapshot = rig.earned(miner1);
        assertApproxEqRel(snapshot, 500e18, 1e15);
        skip(6 hours);
        assertEq(rig.earned(miner1), snapshot); // no longer accruing
    }

    function test_OnlyDistributorNotifies() public {
        vm.expectRevert(Rig.NotDistributor.selector);
        vm.prank(miner1);
        rig.notifyRewardAmount(1e18);
    }

    function test_SlotLimitEnforced() public {
        // a fresh room has 4 slots in production; this mock provider grants 52
        for (uint256 i = 0; i < 52; i++) {
            _stakeOne(miner1, 1);
        }
        uint256 serial = card.mintCard(miner1, 1);
        vm.startPrank(miner1);
        uint256[] memory ids = new uint256[](1);
        ids[0] = serial;
        vm.expectRevert(Rig.OutOfSlots.selector);
        rig.stake(ids);
        vm.stopPrank();
    }
}
