// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PonsFeeRouter} from "../src/PonsFeeRouter.sol";
import {PonsCurveAdapter} from "../src/adapters/PonsCurveAdapter.sol";
import {BuybackVault} from "../src/BuybackVault.sol";
import {Rig} from "../src/Rig.sol";
import {RigCard} from "../src/RigCard.sol";
import {ISwapAdapter, ISlotProvider, IPonsFeeEscrow, IPonsBondingCurve} from "../src/interfaces/External.sol";
import {MockGPU} from "./mocks/Mocks.sol";

/// @dev Pull-based escrow like Pons V2's: balances credit per recipient, claims pay msg.sender.
contract MockEscrow is IPonsFeeEscrow {
    MockGPU public immutable gpu;
    mapping(address => uint256) public ethOwed;
    mapping(address => uint256) public gpuOwed;

    constructor(MockGPU gpu_) {
        gpu = gpu_;
    }

    function credit(address recipient) external payable {
        ethOwed[recipient] += msg.value;
    }

    function creditGpu(address recipient, uint256 amount) external {
        gpuOwed[recipient] += amount;
    }

    function claim() external returns (uint256 amount) {
        amount = ethOwed[msg.sender];
        ethOwed[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok);
    }

    function claimToken(address) external returns (uint256 amount) {
        amount = gpuOwed[msg.sender];
        gpuOwed[msg.sender] = 0;
        gpu.mint(msg.sender, amount);
    }

    function balanceOf(address recipient) external view returns (uint256) {
        return ethOwed[recipient];
    }

    function balanceOfToken(address recipient, address) external view returns (uint256) {
        return gpuOwed[recipient];
    }
}

/// @dev Constant-rate bonding curve honoring minTokensOut like the real one.
contract MockCurve is IPonsBondingCurve {
    MockGPU public immutable gpu;
    uint256 public rate; // tokens out per quote in, 1e18-scaled
    MockEscrow public sweepEscrow;
    address public sweepRecipient;
    uint256 public pendingFees;
    bool public sweepNeedsOperator;

    constructor(MockGPU gpu_, uint256 rate_) {
        gpu = gpu_;
        rate = rate_;
    }

    function setSweep(MockEscrow escrow_, address recipient, bool needsOperator) external payable {
        sweepEscrow = escrow_;
        sweepRecipient = recipient;
        pendingFees = msg.value;
        sweepNeedsOperator = needsOperator;
    }

    function sweepFees(uint256) external {
        require(!sweepNeedsOperator, "InternalSwapRequiresOperator");
        uint256 amount = pendingFees;
        pendingFees = 0;
        sweepEscrow.credit{value: amount}(sweepRecipient);
    }

    function buy(uint256 quoteIn, uint256 minTokensOut, address recipient)
        external
        payable
        returns (uint256 tokensOut)
    {
        require(msg.value == quoteIn, "quote mismatch");
        tokensOut = (quoteIn * rate) / 1e18;
        require(tokensOut >= minTokensOut, "SlippageExceeded");
        gpu.mint(recipient, tokensOut);
    }

    function graduated() external pure returns (bool) {
        return false;
    }

    function quoteReserve() external pure returns (uint256) {
        return 0;
    }
}

contract PonsIntegrationTest is Test, ISlotProvider {
    MockGPU gpu;
    MockEscrow escrow;
    MockCurve curve;
    PonsCurveAdapter adapter;
    BuybackVault vault;
    PonsFeeRouter feeRouter;
    RigCard card;
    Rig rig;

    address keeper = makeAddr("keeper");
    address payable treasury = payable(makeAddr("treasury"));

    function slotsOf(address) external pure returns (uint256) {
        return 52;
    }

    function setUp() public {
        gpu = new MockGPU();
        escrow = new MockEscrow(gpu);
        curve = new MockCurve(gpu, 1_000_000e18); // 1 ETH -> 1M GPU
        adapter = new PonsCurveAdapter(curve);
        vault = new BuybackVault(IERC20(address(gpu)), keeper, ISwapAdapter(address(adapter)));
        feeRouter = new PonsFeeRouter(escrow, IERC20(address(gpu)), curve, payable(address(vault)), treasury);
        card = new RigCard(address(this));
        card.setModules(address(this), address(this));
        rig = new Rig(IERC20(address(gpu)), card, this, address(vault));
        vault.setRig(rig);
        vm.deal(address(this), 100 ether);
    }

    function test_BuyThroughCurveAdapter() public {
        (bool ok,) = address(vault).call{value: 2 ether}("");
        assertTrue(ok);
        vm.prank(keeper);
        vault.buy(2 ether, 2_000_000e18);
        assertEq(gpu.balanceOf(address(rig)), 2_000_000e18);
        assertEq(address(adapter).balance, 0);
        assertEq(rig.rewardRate(), 2_000_000e18 / rig.DURATION());
    }

    function test_HarvestSplitsEthAndRoutesGpu() public {
        // Pons trading fees accrue in the escrow for our fee router
        escrow.credit{value: 10 ether}(address(feeRouter));
        escrow.creditGpu(address(feeRouter), 40_000e18);

        feeRouter.harvest(); // anyone may poke

        assertEq(address(vault).balance, 8 ether); // 80% to the miners' pot
        assertEq(treasury.balance, 2 ether); // 20% ops
        assertEq(gpu.balanceOf(address(vault)), 40_000e18); // fee $GPU 100% to vault
        assertEq(address(feeRouter).balance, 0); // never holds a balance
        assertEq(feeRouter.totalEthRouted(), 10 ether);
        assertEq(feeRouter.totalGpuRouted(), 40_000e18);
    }

    function test_FlushGpuStreamsRestingBalance() public {
        escrow.creditGpu(address(feeRouter), 40_000e18);
        feeRouter.harvest();

        vault.flushGpu(); // permissionless
        assertEq(gpu.balanceOf(address(rig)), 40_000e18);
        assertEq(gpu.balanceOf(address(vault)), 0);
        assertEq(rig.rewardRate(), 40_000e18 / rig.DURATION());
    }

    function test_SweepAndHarvestPullsCurveFees() public {
        // fees batched inside the curve, no buyback slice pending
        curve.setSweep{value: 5 ether}(escrow, address(feeRouter), false);
        feeRouter.sweepAndHarvest();
        assertEq(address(vault).balance, 4 ether);
        assertEq(treasury.balance, 1 ether);
    }

    function test_SweepAndHarvestSurvivesOperatorGate() public {
        // buyback slice pending: only Pons's operator may sweep — our sweep is
        // best-effort and harvest still routes what the escrow already holds
        curve.setSweep{value: 5 ether}(escrow, address(feeRouter), true);
        escrow.credit{value: 2 ether}(address(feeRouter));
        feeRouter.sweepAndHarvest(); // must not revert
        assertEq(address(vault).balance, 1.6 ether);
        assertEq(treasury.balance, 0.4 ether);
    }

    function test_HarvestEmptyEscrowIsNoop() public {
        feeRouter.harvest();
        assertEq(address(vault).balance, 0);
        assertEq(treasury.balance, 0);
    }

    function test_FeeGpuNotDoubleCountedByNextBuy() public {
        // resting fee GPU arrives first…
        escrow.creditGpu(address(feeRouter), 40_000e18);
        feeRouter.harvest();
        // …then a keeper buy: only the freshly bought amount is notified
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertTrue(ok);
        vm.prank(keeper);
        vault.buy(1 ether, 1_000_000e18);
        assertEq(gpu.balanceOf(address(rig)), 1_000_000e18);
        assertEq(gpu.balanceOf(address(vault)), 40_000e18); // still waiting for flushGpu
        vault.flushGpu();
        assertEq(gpu.balanceOf(address(rig)), 1_040_000e18);
    }
}
