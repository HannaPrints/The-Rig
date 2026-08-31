// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {RigCard} from "../src/RigCard.sol";
import {Shop} from "../src/Shop.sol";
import {Rig} from "../src/Rig.sol";
import {BuybackVault} from "../src/BuybackVault.sol";
import {RoyaltyRouter} from "../src/RoyaltyRouter.sol";
import {Workshop} from "../src/Workshop.sol";
import {IAggregatorV3, ISwapAdapter, ISlotProvider} from "../src/interfaces/External.sol";

/// Deploy order matters because of the Rig <-> Vault wiring:
/// vault first, rig with vault as distributor, then vault.setRig (one-time).
///
/// Env:
///   GPU_TOKEN     — the $GPU launched on Pons (1B fixed supply)
///   ETH_USD_FEED  — Chainlink ETH/USD on Robinhood Chain
///   SWAP_ADAPTER  — adapter wrapping the Pons Uniswap v4 hook pool
///   KEEPER        — buyback bot EOA
///   SIGNER        — mint-permit signer (behind the site's bot check)
///   TREASURY      — project ops multisig (the 30%)
contract Deploy is Script {
    function run() external {
        IERC20 gpuToken = IERC20(vm.envAddress("GPU_TOKEN"));
        IAggregatorV3 feed = IAggregatorV3(vm.envAddress("ETH_USD_FEED"));
        ISwapAdapter adapter = ISwapAdapter(vm.envAddress("SWAP_ADAPTER"));
        address keeper = vm.envAddress("KEEPER");
        address signer = vm.envAddress("SIGNER");
        address payable treasury = payable(vm.envAddress("TREASURY"));

        vm.startBroadcast();
        address owner = msg.sender;

        BuybackVault vault = new BuybackVault(gpuToken, keeper, adapter);
        RigCard card = new RigCard(owner);
        Shop shop = new Shop(card, gpuToken, feed, payable(address(vault)), treasury, signer, owner);
        Rig rig = new Rig(gpuToken, card, ISlotProvider(address(shop)), address(vault));
        vault.setRig(rig);
        Workshop workshop = new Workshop(card, gpuToken, owner);
        card.setModules(address(shop), address(workshop));
        RoyaltyRouter royalties = new RoyaltyRouter(payable(address(vault)), treasury);
        card.setDefaultRoyalty(address(royalties), 500); // 5%, tunable by owner

        vm.stopBroadcast();

        console.log("BuybackVault:", address(vault));
        console.log("RigCard:     ", address(card));
        console.log("Shop:        ", address(shop));
        console.log("Rig:         ", address(rig));
        console.log("Workshop:    ", address(workshop));
        console.log("RoyaltyRouter:", address(royalties));
    }
}
