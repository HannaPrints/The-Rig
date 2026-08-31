// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {RigCard} from "../src/RigCard.sol";
import {RoyaltyRouter} from "../src/RoyaltyRouter.sol";
import {MockGPU} from "./mocks/Mocks.sol";

contract RoyaltyTest is Test {
    RigCard card;
    RoyaltyRouter router;
    MockGPU weth; // stand-in for any ERC-20 a marketplace settles in

    address payable vault = payable(makeAddr("vault"));
    address payable treasury = payable(makeAddr("treasury"));
    address collector = makeAddr("collector");

    function setUp() public {
        card = new RigCard(address(this));
        card.setModules(address(this), address(this));
        router = new RoyaltyRouter(vault, treasury);
        card.setDefaultRoyalty(address(router), 500); // the 5%, as in Deploy.s.sol
        weth = new MockGPU();
    }

    function test_FivePercentToRouterOnEveryTier() public {
        card.mintCard(collector, 5);
        // marketplaces quote royaltyInfo(tokenId, salePrice) — ERC-2981
        (address receiver, uint256 fee) = card.royaltyInfo(1, 1 ether);
        assertEq(receiver, address(router));
        assertEq(fee, 0.05 ether); // exactly 5%
        assertTrue(card.supportsInterface(type(IERC2981).interfaceId));
    }

    function test_RoyaltyEthFlushSplits() public {
        // an OpenSea sale settles: 5% of a 20 ETH sale lands on the router
        vm.deal(address(this), 1 ether);
        (bool ok,) = address(router).call{value: 1 ether}("");
        assertTrue(ok);

        router.flush(); // permissionless — nobody can lock funds here
        assertEq(vault.balance, 0.7 ether); // 70% miners' pot
        assertEq(treasury.balance, 0.3 ether); // 30% project
        assertEq(address(router).balance, 0);
    }

    function test_RoyaltyTokenFlushSplits() public {
        weth.mint(address(router), 100e18); // WETH-settled sale royalties
        router.flushToken(IERC20(address(weth)));
        assertEq(weth.balanceOf(vault), 70e18);
        assertEq(weth.balanceOf(treasury), 30e18);
    }

    function test_ContractURIForMarketplaces() public {
        card.setContractURI("ipfs://collection-metadata");
        assertEq(card.contractURI(), "ipfs://collection-metadata");
    }

    function test_OwnerCanTuneButNotRedirectSilently() public {
        // owner surface exists (e.g. to lower the fee later); non-owners get nothing
        vm.prank(collector);
        vm.expectRevert();
        card.setDefaultRoyalty(collector, 10_000);
    }
}
