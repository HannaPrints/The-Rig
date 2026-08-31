// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {RigCard} from "./RigCard.sol";
import {ISlotProvider, IRewardSink} from "./interfaces/External.sol";

/// @title Rig — the mining floor
/// @notice Slot cards in, they earn $GPU every second, pro-rata by hashrate.
///         Synthetix-style 12-hour drip: rate = (unstreamed + newly bought) / 12h.
///         The stream pauses while the rig is empty — time never steals from miners.
/// @dev    No owner. No pause switch, no parameter setters, no withdraw function.
///         The only privileged caller is the distributor (BuybackVault), and its only
///         privilege is adding rewards. Wiring addresses are set once at deploy.
contract Rig is ReentrancyGuard, IRewardSink {
    using SafeERC20 for IERC20;

    uint256 public constant DURATION = 12 hours;

    IERC20 public immutable gpu;
    RigCard public immutable card;
    ISlotProvider public immutable shop;
    address public immutable distributor;

    // drip state
    uint256 public periodFinish;
    uint256 public rewardRate; // gpu wei per second
    uint256 public lastUpdateTime;
    uint256 public rewardPerWeightStored; // 1e18-scaled

    // miner state
    uint256 public totalWeight; // sum of effective MH across all staked cards
    mapping(address => uint256) public weightOf;
    mapping(address => uint256) public slotsUsed;
    mapping(address => uint256) public userRewardPerWeightPaid;
    mapping(address => uint256) public rewards;

    // card state — weight locks at stake time; overclocking requires ejecting first,
    // and the rig re-reads hashrate on reinsertion (as in the original).
    mapping(uint256 => address) public stakerOf;
    mapping(uint256 => uint256) public stakedWeight;

    // lifetime counters for the /network page
    uint256 public totalPaidOut;
    uint256 public totalStreamed;

    event Staked(address indexed miner, uint256 indexed serial, uint256 weight);
    event Unstaked(address indexed miner, uint256 indexed serial, uint256 weight);
    event Claimed(address indexed miner, uint256 amount);
    event RewardAdded(uint256 amount, uint256 newRate, uint256 periodFinish);

    error NotDistributor();
    error NotStaker();
    error OutOfSlots();
    error ZeroReward();

    constructor(IERC20 gpu_, RigCard card_, ISlotProvider shop_, address distributor_) {
        gpu = gpu_;
        card = card_;
        shop = shop_;
        distributor = distributor_;
        lastUpdateTime = block.timestamp;
    }

    // ---------------------------------------------------------------- drip math

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerWeight() public view returns (uint256) {
        if (totalWeight == 0) return rewardPerWeightStored;
        uint256 applicable = lastTimeRewardApplicable();
        if (applicable <= lastUpdateTime) return rewardPerWeightStored;
        return rewardPerWeightStored + ((applicable - lastUpdateTime) * rewardRate * 1e18) / totalWeight;
    }

    function earned(address miner) public view returns (uint256) {
        return (weightOf[miner] * (rewardPerWeight() - userRewardPerWeightPaid[miner])) / 1e18 + rewards[miner];
    }

    /// @dev While the rig is empty the un-dripped remainder is pushed forward instead
    ///      of being lost: periodFinish extends by exactly the idle time.
    function _sync() internal {
        if (totalWeight == 0) {
            uint256 idle = block.timestamp - lastUpdateTime;
            if (idle > 0 && periodFinish > lastUpdateTime) {
                periodFinish += idle;
            }
        } else {
            rewardPerWeightStored = rewardPerWeight();
        }
        lastUpdateTime = block.timestamp;
    }

    function _settle(address miner) internal {
        _sync();
        rewards[miner] = earned(miner);
        userRewardPerWeightPaid[miner] = rewardPerWeightStored;
    }

    // ------------------------------------------------------------------- mining

    function stake(uint256[] calldata serials) external nonReentrant {
        _settle(msg.sender);
        uint256 slots = shop.slotsOf(msg.sender);
        if (slotsUsed[msg.sender] + serials.length > slots) revert OutOfSlots();

        uint256 added;
        for (uint256 i = 0; i < serials.length; i++) {
            uint256 serial = serials[i];
            uint256 w = card.effectiveMH(serial);
            card.transferFrom(msg.sender, address(this), serial);
            stakerOf[serial] = msg.sender;
            stakedWeight[serial] = w;
            added += w;
            emit Staked(msg.sender, serial, w);
        }
        slotsUsed[msg.sender] += serials.length;
        weightOf[msg.sender] += added;
        totalWeight += added;
    }

    function unstake(uint256[] calldata serials) external nonReentrant {
        _settle(msg.sender);

        uint256 removed;
        for (uint256 i = 0; i < serials.length; i++) {
            uint256 serial = serials[i];
            if (stakerOf[serial] != msg.sender) revert NotStaker();
            uint256 w = stakedWeight[serial];
            removed += w;
            delete stakerOf[serial];
            delete stakedWeight[serial];
            card.transferFrom(address(this), msg.sender, serial);
            emit Unstaked(msg.sender, serial, w);
        }
        slotsUsed[msg.sender] -= serials.length;
        weightOf[msg.sender] -= removed;
        totalWeight -= removed;
    }

    function claim() external nonReentrant {
        _settle(msg.sender);
        uint256 amount = rewards[msg.sender];
        if (amount > 0) {
            rewards[msg.sender] = 0;
            totalPaidOut += amount;
            gpu.safeTransfer(msg.sender, amount);
            emit Claimed(msg.sender, amount);
        }
    }

    // --------------------------------------------------------------- buybacks in

    /// @notice Fold freshly bought $GPU into the stream. Distributor-only.
    ///         New rate = (unstreamed remainder + new amount) / 12 hours.
    function notifyRewardAmount(uint256 reward) external nonReentrant {
        if (msg.sender != distributor) revert NotDistributor();
        if (reward == 0) revert ZeroReward();
        _sync();

        gpu.safeTransferFrom(msg.sender, address(this), reward);
        totalStreamed += reward;

        if (block.timestamp >= periodFinish) {
            rewardRate = reward / DURATION;
        } else {
            uint256 leftover = (periodFinish - block.timestamp) * rewardRate;
            rewardRate = (reward + leftover) / DURATION;
        }
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + DURATION;
        emit RewardAdded(reward, rewardRate, periodFinish);
    }
}
