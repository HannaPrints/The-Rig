// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {UniV3SwapAdapter, IV3SwapRouter} from "../src/adapters/UniV3SwapAdapter.sol";
import {BuybackVault} from "../src/BuybackVault.sol";
import {Rig} from "../src/Rig.sol";
import {RigCard} from "../src/RigCard.sol";
import {ISwapAdapter, ISlotProvider} from "../src/interfaces/External.sol";
import {MockGPU} from "./mocks/Mocks.sol";

/// @dev Behaves like SwapRouter02 against a constant-rate pool: honors the
///      amountOutMinimum exactly like the real router (reverts "Too little received").
contract MockV3Router is IV3SwapRouter {
    MockGPU public immutable gpu;
    uint256 public rate; // gpuOut per ethIn, 1e18-scaled

    constructor(MockGPU gpu_, uint256 rate_) {
        gpu = gpu_;
        rate = rate_;
    }

    function setRate(uint256 rate_) external {
        rate = rate_;
    }

    function exactInputSingle(ExactInputSingleParams calldata p) external payable returns (uint256 amountOut) {
        amountOut = (msg.value * rate) / 1e18;
        require(amountOut >= p.amountOutMinimum, "Too little received");
        gpu.mint(p.recipient, amountOut);
    }
}

contract UniV3SwapAdapterTest is Test, ISlotProvider {
    MockGPU gpu;
    MockV3Router router;
    UniV3SwapAdapter adapter;
    BuybackVault vault;
    RigCard card;
    Rig rig;

    address keeper = makeAddr("keeper");
    address weth = makeAddr("weth");

    function slotsOf(address) external pure returns (uint256) {
        return 52;
    }

    function setUp() public {
        gpu = new MockGPU();
        router = new MockV3Router(gpu, 1_000_000e18); // 1 ETH -> 1M GPU
        adapter = new UniV3SwapAdapter(router, weth, address(gpu), 10_000); // 1% fee tier
        vault = new BuybackVault(IERC20(address(gpu)), keeper, ISwapAdapter(address(adapter)));
        card = new RigCard(address(this));
        card.setModules(address(this), address(this));
        rig = new Rig(IERC20(address(gpu)), card, this, address(vault));
        vault.setRig(rig);
    }

    function test_EndToEndBuyThroughAdapter() public {
        (bool ok,) = address(vault).call{value: 5 ether}("");
        assertTrue(ok);

        vm.prank(keeper);
        vault.buy(5 ether, 5_000_000e18);

        assertEq(gpu.balanceOf(address(rig)), 5_000_000e18);
        assertEq(gpu.balanceOf(address(adapter)), 0); // adapter never holds a balance
        assertEq(address(adapter).balance, 0);
        assertEq(rig.rewardRate(), 5_000_000e18 / rig.DURATION());
    }

    function test_RouterMinOutBubblesUp() public {
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertTrue(ok);

        vm.prank(keeper);
        vm.expectRevert("Too little received");
        vault.buy(1 ether, 1_500_000e18); // pool only gives 1M
    }

    function test_AdapterSendsToNamedRecipientOnly() public {
        // permissionless by design: any caller's output goes where THEY point it,
        // never to the adapter — there is nothing to steal from it
        uint256 out = adapter.swapExactETHForGPU{value: 1 ether}(1, address(0xBEEF));
        assertEq(out, 1_000_000e18);
        assertEq(gpu.balanceOf(address(0xBEEF)), 1_000_000e18);
    }
}
