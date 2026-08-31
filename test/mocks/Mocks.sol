// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IAggregatorV3, ISwapAdapter} from "../../src/interfaces/External.sol";

/// @dev Stand-in for the Pons-launched $GPU (1B fixed supply in production).
contract MockGPU is ERC20 {
    constructor() ERC20("GPU", "GPU") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Chainlink ETH/USD stand-in, 8 decimals.
contract MockFeed is IAggregatorV3 {
    int256 public answer;

    constructor(int256 answer_) {
        answer = answer_;
    }

    function setAnswer(int256 answer_) external {
        answer = answer_;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, block.timestamp, block.timestamp, 1);
    }
}

/// @dev Sells $GPU for ETH at a fixed rate (gpu wei out per eth wei in, 1e18-scaled).
contract MockSwapAdapter is ISwapAdapter {
    MockGPU public immutable gpu;
    uint256 public rate; // gpuOut = ethIn * rate / 1e18

    constructor(MockGPU gpu_, uint256 rate_) {
        gpu = gpu_;
        rate = rate_;
    }

    function swapExactETHForGPU(uint256, address to) external payable returns (uint256 out) {
        out = (msg.value * rate) / 1e18;
        gpu.mint(to, out);
    }
}
