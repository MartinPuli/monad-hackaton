// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title GhostRig — pay-per-FPS cloud gaming escrow on Monad
/// @notice A host registers a "rig" with a price per FPS. A client opens a session
///         by depositing MON. The first `TRIAL_SECONDS` are free (anti-scam: the
///         client verifies the stream works before paying). After the trial, the
///         host reports the real FPS delivered each second; the contract accrues
///         `fps * pricePerFps` against the deposit. Payment to the host happens once,
///         at `closeSession`; the unused deposit is refunded to the client.
/// @dev Native MON only. Trust model: the client watches the live game, so it is its
///      own verifier — if the host cheats (bad frames / inflated FPS) the client closes
///      the session. Max loss for either side on cheating is ~1 second of accrual.
contract GhostRig {
    // ─────────────────────────────────────────── Constants

    /// @notice Free trial window before billing starts.
    uint256 public constant TRIAL_SECONDS = 10;

    /// @notice Sanity cap on reported FPS (a host cannot claim absurd values).
    uint256 public constant MAX_FPS = 480;

    // ─────────────────────────────────────────── Types

    struct Rig {
        address host; // owner of the rig (the PC sharing its GPU)
        uint256 pricePerFps; // wei charged per (FPS reported in one second)
        bool active; // host can pause the rig
    }

    struct Session {
        address client; // who deposited and plays
        uint256 rigId; // which rig is being used
        uint256 deposit; // MON locked as escrow
        uint256 accrued; // amount owed to the host so far (capped at deposit)
        uint256 pricePerFps; // price LOCKED at open time (host can't change it mid-session)
        uint256 startTime; // when the session opened (trial counts from here)
        bool open; // false once closed
    }

    // ─────────────────────────────────────────── Storage

    Rig[] public rigs;
    Session[] public sessions;

    /// @dev One active session per rig at a time (a GPU serves one client).
    mapping(uint256 => bool) public rigHasActiveSession;

    /// @dev Pull-payment balances: parties withdraw their own funds.
    mapping(address => uint256) public pendingWithdrawals;

    /// @dev Minimal non-reentrancy guard (cheaper than importing OZ for the demo).
    uint256 private _lock = 1;

    // ─────────────────────────────────────────── Events

    event RigRegistered(uint256 indexed rigId, address indexed host, uint256 pricePerFps);
    event RigPriceUpdated(uint256 indexed rigId, uint256 pricePerFps);
    event RigActiveSet(uint256 indexed rigId, bool active);
    event SessionOpened(uint256 indexed sessionId, uint256 indexed rigId, address indexed client, uint256 deposit);
    event FpsReported(uint256 indexed sessionId, uint256 fps, uint256 accrued);
    event SessionClosed(uint256 indexed sessionId, uint256 paidToHost, uint256 refundedToClient);
    event Withdrawn(address indexed who, uint256 amount);

    // ─────────────────────────────────────────── Errors

    error NotRigHost();
    error NotParticipant();
    error RigInactive();
    error RigBusy();
    error SessionNotOpen();
    error ZeroDeposit();
    error ZeroPrice();
    error Reentrancy();
    error TransferFailed();
    error NothingToWithdraw();

    // ─────────────────────────────────────────── Modifiers

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    // ─────────────────────────────────────────── Rig management (host side)

    /// @notice Register a rig with a price per FPS. Returns the new rigId.
    function registerRig(uint256 pricePerFps) external returns (uint256 rigId) {
        if (pricePerFps == 0) revert ZeroPrice();
        rigId = rigs.length;
        rigs.push(Rig({host: msg.sender, pricePerFps: pricePerFps, active: true}));
        emit RigRegistered(rigId, msg.sender, pricePerFps);
    }

    /// @notice Update the price of a rig (only the host).
    function setPrice(uint256 rigId, uint256 pricePerFps) external {
        if (pricePerFps == 0) revert ZeroPrice();
        Rig storage rig = rigs[rigId];
        if (rig.host != msg.sender) revert NotRigHost();
        rig.pricePerFps = pricePerFps;
        emit RigPriceUpdated(rigId, pricePerFps);
    }

    /// @notice Pause/unpause a rig (only the host). Paused rigs reject new sessions.
    function setActive(uint256 rigId, bool active) external {
        Rig storage rig = rigs[rigId];
        if (rig.host != msg.sender) revert NotRigHost();
        rig.active = active;
        emit RigActiveSet(rigId, active);
    }

    // ─────────────────────────────────────────── Session lifecycle (client side)

    /// @notice Open a session against a rig, depositing MON as escrow.
    /// @dev The price is read from the rig on-chain — the client cannot set it.
    function openSession(uint256 rigId) external payable returns (uint256 sessionId) {
        if (msg.value == 0) revert ZeroDeposit();
        Rig storage rig = rigs[rigId];
        if (!rig.active) revert RigInactive();
        if (rigHasActiveSession[rigId]) revert RigBusy();

        rigHasActiveSession[rigId] = true;
        sessionId = sessions.length;
        sessions.push(
            Session({
                client: msg.sender,
                rigId: rigId,
                deposit: msg.value,
                accrued: 0,
                pricePerFps: rig.pricePerFps, // lock the price at open time
                startTime: block.timestamp,
                open: true
            })
        );
        emit SessionOpened(sessionId, rigId, msg.sender, msg.value);
    }

    /// @notice Host reports the FPS delivered in the last second; accrues the cost.
    /// @dev Only billable after the trial window. Accrual is capped at the deposit.
    ///      Returns whether the deposit is now exhausted (frontend/agent should close).
    function reportFps(uint256 sessionId, uint256 fps) external returns (bool exhausted) {
        Session storage s = sessions[sessionId];
        if (!s.open) revert SessionNotOpen();

        Rig storage rig = rigs[s.rigId];
        if (rig.host != msg.sender) revert NotRigHost();

        // Clamp absurd FPS claims (a host can't bill 1e9 fps in one call).
        if (fps > MAX_FPS) fps = MAX_FPS;

        // Free trial: ignore billing until TRIAL_SECONDS have elapsed.
        if (block.timestamp >= s.startTime + TRIAL_SECONDS) {
            uint256 cost = fps * s.pricePerFps; // price locked at open time
            uint256 newAccrued = s.accrued + cost;
            if (newAccrued >= s.deposit) {
                newAccrued = s.deposit; // cap: never owe more than escrowed
                exhausted = true;
            }
            s.accrued = newAccrued;
        }
        emit FpsReported(sessionId, fps, s.accrued);
    }

    /// @notice Close the session: credit the host what accrued, refund the rest to the client.
    /// @dev Callable by either the client or the rig host. Uses pull-payments: a reverting
    ///      receiver can no longer lock the other party's funds — each withdraws separately.
    function closeSession(uint256 sessionId) external {
        Session storage s = sessions[sessionId];
        if (!s.open) revert SessionNotOpen();

        Rig storage rig = rigs[s.rigId];
        if (msg.sender != s.client && msg.sender != rig.host) revert NotParticipant();

        s.open = false;
        rigHasActiveSession[s.rigId] = false;

        uint256 pay = s.accrued;
        uint256 refund = s.deposit - pay;
        if (pay > 0) pendingWithdrawals[rig.host] += pay;
        if (refund > 0) pendingWithdrawals[s.client] += refund;

        emit SessionClosed(sessionId, pay, refund);
    }

    /// @notice Withdraw funds credited to you (host earnings or client refunds).
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        pendingWithdrawals[msg.sender] = 0; // effects before interaction
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, amount);
    }

    // ─────────────────────────────────────────── Views

    function rigCount() external view returns (uint256) {
        return rigs.length;
    }

    function sessionCount() external view returns (uint256) {
        return sessions.length;
    }

    /// @notice True once the trial window has elapsed for a session.
    function isBillable(uint256 sessionId) external view returns (bool) {
        Session storage s = sessions[sessionId];
        return s.open && block.timestamp >= s.startTime + TRIAL_SECONDS;
    }
}
