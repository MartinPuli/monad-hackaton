// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {GhostRig} from "../src/GhostRig.sol";

contract GhostRigTest is Test {
    GhostRig internal gr;

    address internal host = makeAddr("host");
    address internal client = makeAddr("client");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant PRICE = 1e12; // wei per FPS-second
    uint256 internal constant DEPOSIT = 1 ether;

    function setUp() public {
        gr = new GhostRig();
        vm.deal(client, 10 ether);
    }

    // Helper: host registers a rig, client opens a session.
    function _openSession() internal returns (uint256 rigId, uint256 sessionId) {
        vm.prank(host);
        rigId = gr.registerRig(PRICE);
        vm.prank(client);
        sessionId = gr.openSession{value: DEPOSIT}(rigId);
    }

    // ───────────────────────── Rig registration

    function test_registerRig_storesHostAndPrice() public {
        vm.prank(host);
        uint256 rigId = gr.registerRig(PRICE);
        (address h, uint256 price, bool active) = gr.rigs(rigId);
        assertEq(h, host);
        assertEq(price, PRICE);
        assertTrue(active);
    }

    function test_registerRig_zeroPriceReverts() public {
        vm.prank(host);
        vm.expectRevert(GhostRig.ZeroPrice.selector);
        gr.registerRig(0);
    }

    function test_setPrice_onlyHost() public {
        vm.prank(host);
        uint256 rigId = gr.registerRig(PRICE);
        vm.prank(stranger);
        vm.expectRevert(GhostRig.NotRigHost.selector);
        gr.setPrice(rigId, 2 * PRICE);
    }

    // ───────────────────────── openSession

    function test_openSession_locksDeposit() public {
        (, uint256 sessionId) = _openSession();
        (address c,, uint256 dep, uint256 accrued, uint256 price,, bool open) = gr.sessions(sessionId);
        assertEq(c, client);
        assertEq(dep, DEPOSIT);
        assertEq(accrued, 0);
        assertEq(price, PRICE); // price locked at open time
        assertTrue(open);
        assertEq(address(gr).balance, DEPOSIT);
    }

    function test_openSession_rigBusy_secondReverts() public {
        (uint256 rigId,) = _openSession();
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        vm.expectRevert(GhostRig.RigBusy.selector);
        gr.openSession{value: 0.1 ether}(rigId);
    }

    // A host raising the price mid-session must NOT affect the open session.
    function test_priceChangeMidSession_doesNotAffectOpenSession() public {
        (uint256 rigId, uint256 sessionId) = _openSession();
        vm.prank(host);
        gr.setPrice(rigId, PRICE * 1000); // host tries to gouge
        vm.warp(block.timestamp + gr.TRIAL_SECONDS());
        vm.prank(host);
        gr.reportFps(sessionId, 60);
        (,,, uint256 accrued,,,) = gr.sessions(sessionId);
        assertEq(accrued, 60 * PRICE); // still the locked price, not the new one
    }

    function test_reportFps_clampedToMaxFps() public {
        (, uint256 sessionId) = _openSession();
        vm.warp(block.timestamp + gr.TRIAL_SECONDS());
        vm.prank(host);
        gr.reportFps(sessionId, 1_000_000); // absurd
        (,,, uint256 accrued,,,) = gr.sessions(sessionId);
        assertEq(accrued, gr.MAX_FPS() * PRICE); // clamped
    }

    function test_openSession_zeroDepositReverts() public {
        vm.prank(host);
        uint256 rigId = gr.registerRig(PRICE);
        vm.prank(client);
        vm.expectRevert(GhostRig.ZeroDeposit.selector);
        gr.openSession{value: 0}(rigId);
    }

    function test_openSession_inactiveRigReverts() public {
        vm.prank(host);
        uint256 rigId = gr.registerRig(PRICE);
        vm.prank(host);
        gr.setActive(rigId, false);
        vm.prank(client);
        vm.expectRevert(GhostRig.RigInactive.selector);
        gr.openSession{value: DEPOSIT}(rigId);
    }

    // ───────────────────────── Trial window

    function test_reportFps_duringTrial_doesNotAccrue() public {
        (, uint256 sessionId) = _openSession();
        // Within the 10s trial (no time warp), reporting must not bill.
        vm.prank(host);
        gr.reportFps(sessionId, 60);
        (,,, uint256 accrued,,,) = gr.sessions(sessionId);
        assertEq(accrued, 0);
        assertFalse(gr.isBillable(sessionId));
    }

    function test_reportFps_afterTrial_accruesExact() public {
        (, uint256 sessionId) = _openSession();
        vm.warp(block.timestamp + gr.TRIAL_SECONDS()); // exactly at billing start
        assertTrue(gr.isBillable(sessionId));
        vm.prank(host);
        gr.reportFps(sessionId, 60);
        (,,, uint256 accrued,,,) = gr.sessions(sessionId);
        assertEq(accrued, 60 * PRICE);
    }

    function test_reportFps_accumulatesAcrossSeconds() public {
        (, uint256 sessionId) = _openSession();
        vm.warp(block.timestamp + gr.TRIAL_SECONDS());
        vm.startPrank(host);
        gr.reportFps(sessionId, 60);
        gr.reportFps(sessionId, 30);
        gr.reportFps(sessionId, 120);
        vm.stopPrank();
        (,,, uint256 accrued,,,) = gr.sessions(sessionId);
        assertEq(accrued, (60 + 30 + 120) * PRICE);
    }

    // ───────────────────────── Cap at deposit

    function test_reportFps_cappedAtDeposit() public {
        (, uint256 sessionId) = _openSession();
        vm.warp(block.timestamp + gr.TRIAL_SECONDS());
        // Report max FPS repeatedly until the deposit is exhausted (fps is clamped
        // to MAX_FPS, so the cap is reached over several seconds, never overshooting).
        bool exhausted;
        vm.startPrank(host);
        for (uint256 i = 0; i < 3000 && !exhausted; i++) {
            exhausted = gr.reportFps(sessionId, gr.MAX_FPS());
        }
        vm.stopPrank();
        assertTrue(exhausted);
        (,,, uint256 accrued,,,) = gr.sessions(sessionId);
        assertEq(accrued, DEPOSIT); // never more than escrowed
    }

    // ───────────────────────── Permissions on reportFps

    function test_reportFps_onlyHost() public {
        (, uint256 sessionId) = _openSession();
        vm.warp(block.timestamp + gr.TRIAL_SECONDS());
        vm.prank(stranger);
        vm.expectRevert(GhostRig.NotRigHost.selector);
        gr.reportFps(sessionId, 60);
    }

    function test_reportFps_closedSessionReverts() public {
        (, uint256 sessionId) = _openSession();
        vm.prank(client);
        gr.closeSession(sessionId);
        vm.prank(host);
        vm.expectRevert(GhostRig.SessionNotOpen.selector);
        gr.reportFps(sessionId, 60);
    }

    // ───────────────────────── closeSession

    function test_closeSession_paysHostAndRefundsClient() public {
        (, uint256 sessionId) = _openSession();
        vm.warp(block.timestamp + gr.TRIAL_SECONDS());
        vm.prank(host);
        gr.reportFps(sessionId, 100); // owes 100 * PRICE
        uint256 owed = 100 * PRICE;

        uint256 hostBefore = host.balance;
        uint256 clientBefore = client.balance;

        vm.prank(client);
        gr.closeSession(sessionId);

        // Pull-payment: funds credited, then each party withdraws.
        assertEq(gr.pendingWithdrawals(host), owed);
        assertEq(gr.pendingWithdrawals(client), DEPOSIT - owed);
        vm.prank(host);
        gr.withdraw();
        vm.prank(client);
        gr.withdraw();

        assertEq(host.balance, hostBefore + owed);
        assertEq(client.balance, clientBefore + (DEPOSIT - owed));
        assertEq(address(gr).balance, 0);

        (,,,,,, bool open) = gr.sessions(sessionId);
        assertFalse(open);
    }

    function test_closeSession_noUsage_fullRefund() public {
        (, uint256 sessionId) = _openSession();
        uint256 clientBefore = client.balance;
        vm.prank(client);
        gr.closeSession(sessionId);
        vm.prank(client);
        gr.withdraw();
        assertEq(client.balance, clientBefore + DEPOSIT); // trial only → nothing owed
    }

    function test_withdraw_nothingReverts() public {
        vm.prank(stranger);
        vm.expectRevert(GhostRig.NothingToWithdraw.selector);
        gr.withdraw();
    }

    function test_rig_freedAfterClose_canReopen() public {
        (uint256 rigId, uint256 sessionId) = _openSession();
        vm.prank(client);
        gr.closeSession(sessionId);
        // rig should be free again
        vm.prank(client);
        uint256 sid2 = gr.openSession{value: DEPOSIT}(rigId);
        (,,,,,, bool open) = gr.sessions(sid2);
        assertTrue(open);
    }

    function test_closeSession_byHost_allowed() public {
        (, uint256 sessionId) = _openSession();
        vm.prank(host);
        gr.closeSession(sessionId);
        (,,,,,, bool open) = gr.sessions(sessionId);
        assertFalse(open);
    }

    function test_closeSession_byStrangerReverts() public {
        (, uint256 sessionId) = _openSession();
        vm.prank(stranger);
        vm.expectRevert(GhostRig.NotParticipant.selector);
        gr.closeSession(sessionId);
    }

    function test_closeSession_twiceReverts() public {
        (, uint256 sessionId) = _openSession();
        vm.prank(client);
        gr.closeSession(sessionId);
        vm.prank(client);
        vm.expectRevert(GhostRig.SessionNotOpen.selector);
        gr.closeSession(sessionId);
    }

    // ───────────────────────── Events

    function test_openSession_emitsEvent() public {
        vm.prank(host);
        uint256 rigId = gr.registerRig(PRICE);
        vm.expectEmit(true, true, true, true);
        emit GhostRig.SessionOpened(0, rigId, client, DEPOSIT);
        vm.prank(client);
        gr.openSession{value: DEPOSIT}(rigId);
    }

    function test_reportFps_emitsAccrued() public {
        (, uint256 sessionId) = _openSession();
        vm.warp(block.timestamp + gr.TRIAL_SECONDS());
        vm.expectEmit(true, false, false, true);
        emit GhostRig.FpsReported(sessionId, 60, 60 * PRICE);
        vm.prank(host);
        gr.reportFps(sessionId, 60);
    }
}
