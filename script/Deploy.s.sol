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
import {PonsFeeRouter} from "../src/PonsFeeRouter.sol";
import {PonsCurveAdapter} from "../src/adapters/PonsCurveAdapter.sol";
import {
    IAggregatorV3,
    ISwapAdapter,
    ISlotProvider,
    IPonsFeeEscrow,
    IPonsBondingCurve
} from "../src/interfaces/External.sol";

/// NONCE ORDER IS LOAD-BEARING. The $GPU launch on Pons names the PonsFeeRouter
/// (this wallet's CREATE at nonce 3) as creatorFeeRecipient BEFORE it exists, so
/// this script must run as the deployer wallet's nonces 1..11 exactly:
///
///   0  launchToken on the Pons V2 factory        (done separately, see DEPLOY.md)
///   1  PonsCurveAdapter                          2  BuybackVault
///   3  PonsFeeRouter  <- pinned at launch        4  RigCard
///   5  Shop                                      6  Rig
///   7  vault.setRig (tx)                         8  Workshop
///   9  card.setModules (tx)                     10  RoyaltyRouter
///  11  card.setDefaultRoyalty (tx)
///
/// Set EXPECTED_FEE_ROUTER to the address pinned at launch; the script reverts
/// rather than deploy a suite whose fees would stream to the wrong place.
///
/// Env: GPU_TOKEN, CURVE, FEE_ESCROW, ETH_USD_FEED, KEEPER, SIGNER, TREASURY,
///      EXPECTED_FEE_ROUTER (optional but strongly recommended).
contract Deploy is Script {
    struct Cfg {
        IERC20 gpu;
        IPonsBondingCurve curve;
        IPonsFeeEscrow escrow;
        IAggregatorV3 feed;
        address keeper;
        address signer;
        address payable treasury;
        address expectedFeeRouter;
    }

    function _cfg() internal view returns (Cfg memory c) {
        c.gpu = IERC20(vm.envAddress("GPU_TOKEN"));
        c.curve = IPonsBondingCurve(vm.envAddress("CURVE"));
        c.escrow = IPonsFeeEscrow(vm.envAddress("FEE_ESCROW"));
        c.feed = IAggregatorV3(vm.envAddress("ETH_USD_FEED"));
        c.keeper = vm.envAddress("KEEPER");
        c.signer = vm.envAddress("SIGNER");
        c.treasury = payable(vm.envAddress("TREASURY"));
        c.expectedFeeRouter = vm.envOr("EXPECTED_FEE_ROUTER", address(0));
    }

    function run() external {
        Cfg memory c = _cfg();
        vm.startBroadcast();

        PonsCurveAdapter adapter = new PonsCurveAdapter(c.curve); // nonce 1
        BuybackVault vault = new BuybackVault(c.gpu, c.keeper, ISwapAdapter(address(adapter))); // nonce 2
        PonsFeeRouter feeRouter = new PonsFeeRouter(c.escrow, c.gpu, payable(address(vault)), c.treasury); // nonce 3
        if (c.expectedFeeRouter != address(0)) {
            require(address(feeRouter) == c.expectedFeeRouter, "fee router address drifted from launch pin");
        }
        RigCard card = new RigCard(msg.sender); // nonce 4
        Shop shop = new Shop(card, c.gpu, c.feed, payable(address(vault)), c.treasury, c.signer, msg.sender); // nonce 5
        Rig rig = new Rig(c.gpu, card, ISlotProvider(address(shop)), address(vault)); // nonce 6
        vault.setRig(rig); // nonce 7
        Workshop workshop = new Workshop(card, c.gpu, msg.sender); // nonce 8
        card.setModules(address(shop), address(workshop)); // nonce 9
        RoyaltyRouter royalties = new RoyaltyRouter(payable(address(vault)), c.treasury); // nonce 10
        card.setDefaultRoyalty(address(royalties), 500); // nonce 11

        vm.stopBroadcast();

        console.log("PonsCurveAdapter:", address(adapter));
        console.log("BuybackVault:    ", address(vault));
        console.log("PonsFeeRouter:   ", address(feeRouter));
        console.log("RigCard:         ", address(card));
        console.log("Shop:            ", address(shop));
        console.log("Rig:             ", address(rig));
        console.log("Workshop:        ", address(workshop));
        console.log("RoyaltyRouter:   ", address(royalties));
    }
}
