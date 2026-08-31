// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PonsV4Adapter, IPoolManagerMin} from "../src/adapters/PonsV4Adapter.sol";
import {BuybackVault} from "../src/BuybackVault.sol";
import {Rig} from "../src/Rig.sol";
import {RigCard} from "../src/RigCard.sol";
import {ISwapAdapter, ISlotProvider} from "../src/interfaces/External.sol";
import {MockGPU} from "./mocks/Mocks.sol";

/// @dev Exercises the real unlock → callback → swap/settle/take sequence with the
///      v4 delta packing (amount0 upper 128 bits, amount1 lower), at a fixed rate.
contract MockPoolManager {
    MockGPU public immutable gpu;
    uint256 public rate; // gpu out per eth in, 1e18-scaled
    address private caller;

    constructor(MockGPU gpu_, uint256 rate_) {
        gpu = gpu_;
        rate = rate_;
    }

    function unlock(bytes calldata data) external returns (bytes memory) {
        caller = msg.sender;
        return PonsV4Adapter(payable(msg.sender)).unlockCallback(data);
    }

    function swap(IPoolManagerMin.PoolKey memory key, IPoolManagerMin.SwapParams memory p, bytes calldata)
        external
        view
        returns (int256 swapDelta)
    {
        require(msg.sender == caller, "not unlocked");
        require(key.currency0 == address(0) && key.currency1 == address(gpu), "wrong pool");
        require(p.zeroForOne && p.amountSpecified < 0, "exact-in zeroForOne only");
        uint256 ethIn = uint256(-p.amountSpecified);
        int128 amount0 = -int128(int256(ethIn));
        int128 amount1 = int128(int256((ethIn * rate) / 1e18));
        swapDelta = (int256(amount0) << 128) | int256(uint256(uint128(amount1)));
    }

    function settle() external payable returns (uint256) {
        return msg.value;
    }

    function take(address currency, address to, uint256 amount) external {
        require(currency == address(gpu), "wrong currency");
        gpu.mint(to, amount);
    }
}

contract PonsV4AdapterTest is Test, ISlotProvider {
    MockGPU gpu;
    MockPoolManager pm;
    PonsV4Adapter adapter;
    BuybackVault vault;
    RigCard card;
    Rig rig;

    address keeper = makeAddr("keeper");

    function slotsOf(address) external pure returns (uint256) {
        return 52;
    }

    function setUp() public {
        gpu = new MockGPU();
        pm = new MockPoolManager(gpu, 1_000_000e18); // 1 ETH -> 1M GPU
        adapter = new PonsV4Adapter(IPoolManagerMin(address(pm)), address(gpu), 0, 200, makeAddr("hook"));
        vault = new BuybackVault(IERC20(address(gpu)), keeper, ISwapAdapter(address(adapter)));
        card = new RigCard(address(this));
        card.setModules(address(this), address(this));
        rig = new Rig(IERC20(address(gpu)), card, this, address(vault));
        vault.setRig(rig);
        vm.deal(address(this), 100 ether);
    }

    function test_V4BuyRoutesIntoStream() public {
        (bool ok,) = address(vault).call{value: 3 ether}("");
        assertTrue(ok);
        vm.prank(keeper);
        vault.buy(3 ether, 3_000_000e18);
        assertEq(gpu.balanceOf(address(rig)), 3_000_000e18);
        assertEq(address(adapter).balance, 0); // fully settled, never holds funds
        assertEq(rig.rewardRate(), 3_000_000e18 / rig.DURATION());
    }

    function test_SlippageReverts() public {
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertTrue(ok);
        vm.prank(keeper);
        vm.expectRevert(PonsV4Adapter.Slippage.selector);
        vault.buy(1 ether, 2_000_000e18);
    }

    function test_CallbackOnlyFromPoolManager() public {
        vm.expectRevert(PonsV4Adapter.NotPoolManager.selector);
        adapter.unlockCallback(abi.encode(1 ether, 1, address(this)));
    }
}
