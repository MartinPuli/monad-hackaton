// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {GhostRig} from "../src/GhostRig.sol";

/// @notice Deploys GhostRig. Reads the deployer key from the --private-key flag
///         (do NOT hardcode addresses — that causes "No associated wallet").
contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();
        GhostRig ghostRig = new GhostRig();
        console.log("GhostRig deployed at:", address(ghostRig));
        vm.stopBroadcast();
    }
}
