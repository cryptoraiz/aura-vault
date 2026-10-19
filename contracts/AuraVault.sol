// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title AuraVault
/// @notice Decentralized USDC vault protocol with escrow-style deposits and automatic revenue splitting.
/// @dev This contract uses USDC ERC-20 amounts (6 decimals) for all deposits and releases.
///      On Arc testnet/mainnet, the canonical USDC ERC-20 address is
///      0x3600000000000000000000000000000000000000.
contract AuraVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 private constant BASIS_POINTS = 10_000;
    /// @notice Maximum payees per vault to bound loop gas in distributeAll.
    uint256 public constant MAX_PAYEES = 50;

    error ZeroAddress();
    error EmptyPayeeList();
    error ArrayLengthMismatch();
    error InvalidShare();
    error DuplicatePayee();
    error InvalidSharesTotal();
    error InvalidVaultId();
    error NotAPayee();
    error ZeroAmount();
    error NothingToRelease();
    error NothingToDistribute();
    error EmptyVaultName();
    error TooManyPayees();

    event VaultCreated(
        uint256 indexed vaultId,
        address indexed creator,
        string name,
        address[] payees,
        uint256[] shares
    );
    event DepositReceived(uint256 indexed vaultId, address indexed depositor, uint256 amount, string memo);
    event PaymentReleased(uint256 indexed vaultId, address indexed payee, uint256 amount);

    struct Vault {
        string name;
        address creator;
        address[] payees;
        uint256[] shares; // basis points, must sum to 10000
        uint256 totalDeposited; // 6-decimal USDC
        uint256 totalReleased; // 6-decimal USDC
        mapping(address => uint256) released; // per-payee released amount
    }

    IERC20 public immutable usdc;
    address public immutable usdcAddress;

    // vaultId => Vault (vaults are 1-indexed; vaultId 0 is unused)
    mapping(uint256 => Vault) private _vaults;
    uint256 private _vaultCount;
    mapping(address => uint256[]) private _vaultsByCreator;
    mapping(address => uint256[]) private _vaultsByPayee;
    // share lookup for O(1) access
    mapping(uint256 => mapping(address => uint256)) private _payeeShare;
    // index tracking to avoid duplicate payees
    mapping(uint256 => mapping(address => bool)) private _isPayee;

    constructor(address usdcAddress_) {
        if (usdcAddress_ == address(0)) revert ZeroAddress();
        usdcAddress = usdcAddress_;
        usdc = IERC20(usdcAddress_);
    }

    function createVault(
        address[] calldata payees,
        uint256[] calldata shares,
        string calldata vaultName
    ) external nonReentrant returns (uint256 vaultId) {
        if (payees.length == 0) revert EmptyPayeeList();
        if (payees.length > MAX_PAYEES) revert TooManyPayees();
        if (payees.length != shares.length) revert ArrayLengthMismatch();
        if (bytes(vaultName).length == 0) revert EmptyVaultName();

        vaultId = _vaultCount + 1;

        uint256 totalShares;
        for (uint256 i = 0; i < payees.length; ++i) {
            address payee = payees[i];
            uint256 share = shares[i];

            if (payee == address(0)) revert ZeroAddress();
            if (share == 0) revert InvalidShare();
            if (_isPayee[vaultId][payee]) revert DuplicatePayee();

            _isPayee[vaultId][payee] = true;
            _payeeShare[vaultId][payee] = share;

            totalShares += share;
        }

        if (totalShares != BASIS_POINTS) revert InvalidSharesTotal();

        _vaultCount = vaultId;

        Vault storage vault = _vaults[vaultId];
        vault.name = vaultName;
        vault.creator = msg.sender;

        for (uint256 i = 0; i < payees.length; ++i) {
            vault.payees.push(payees[i]);
            vault.shares.push(shares[i]);
            _vaultsByPayee[payees[i]].push(vaultId);
        }

        _vaultsByCreator[msg.sender].push(vaultId);

        emit VaultCreated(vaultId, msg.sender, vaultName, payees, shares);
    }

    function deposit(uint256 vaultId, uint256 amount, string calldata memo) external nonReentrant {
        if (!_vaultExists(vaultId)) revert InvalidVaultId();
        if (amount == 0) revert ZeroAmount();

        Vault storage vault = _vaults[vaultId];
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        vault.totalDeposited += amount;

        emit DepositReceived(vaultId, msg.sender, amount, memo);
    }

    function release(uint256 vaultId, address payee) external nonReentrant {
        if (!_vaultExists(vaultId)) revert InvalidVaultId();
        if (!_isPayee[vaultId][payee]) revert NotAPayee();

        Vault storage vault = _vaults[vaultId];
        uint256 pending = _pendingBalance(vault, _payeeShare[vaultId][payee], payee);
        if (pending == 0) revert NothingToRelease();

        vault.released[payee] += pending;
        vault.totalReleased += pending;
        usdc.safeTransfer(payee, pending);

        emit PaymentReleased(vaultId, payee, pending);
    }

    /// @notice Releases pending USDC to all payees with a positive balance.
    /// @dev Fault-tolerant: if a transfer to a single payee fails (e.g. blocklisted on Arc),
    ///      that payee's state change is reverted silently and we continue to the next payee,
    ///      keeping `release()` as the canonical single-payee fallback.
    ///      Bounded by MAX_PAYEES so gas cost is predictable.
    function distributeAll(uint256 vaultId) external nonReentrant {
        if (!_vaultExists(vaultId)) revert InvalidVaultId();

        Vault storage vault = _vaults[vaultId];
        uint256 distributed;

        uint256 len = vault.payees.length;
        for (uint256 i = 0; i < len; ++i) {
            address payee = vault.payees[i];
            uint256 pending = _pendingBalance(vault, _payeeShare[vaultId][payee], payee);

            if (pending == 0) {
                continue;
            }

            // Checks-effects: record the release before the external call.
            vault.released[payee] += pending;
            vault.totalReleased += pending;

            // Attempt transfer via low-level call so a single failing payee doesn't revert the batch.
            (bool ok, bytes memory ret) = address(usdc).call(
                abi.encodeWithSelector(IERC20.transfer.selector, payee, pending)
            );
            // A successful ERC-20 transfer either returns true or returns nothing (bare transfer).
            bool transferOk = ok && (ret.length == 0 || abi.decode(ret, (bool)));

            if (!transferOk) {
                // Rollback this payee only and skip.
                vault.released[payee] -= pending;
                vault.totalReleased -= pending;
                continue;
            }

            distributed += pending;
            emit PaymentReleased(vaultId, payee, pending);
        }

        if (distributed == 0) revert NothingToDistribute();
    }

    function getPendingBalance(uint256 vaultId, address payee) external view returns (uint256) {
        if (!_vaultExists(vaultId) || !_isPayee[vaultId][payee]) {
            return 0;
        }

        Vault storage vault = _vaults[vaultId];
        return _pendingBalance(vault, _payeeShare[vaultId][payee], payee);
    }

    function getVault(
        uint256 vaultId
    )
        external
        view
        returns (
            string memory name,
            address creator,
            address[] memory payees,
            uint256[] memory shares,
            uint256 totalDeposited,
            uint256 totalReleased,
            uint256[] memory pendingBalances,
            uint256[] memory releasedBalances
        )
    {
        if (!_vaultExists(vaultId)) revert InvalidVaultId();

        Vault storage vault = _vaults[vaultId];
        uint256 length = vault.payees.length;

        payees = vault.payees;
        shares = vault.shares;
        pendingBalances = new uint256[](length);
        releasedBalances = new uint256[](length);

        for (uint256 i = 0; i < length; ++i) {
            address payee = payees[i];
            uint256 share = _payeeShare[vaultId][payee];
            pendingBalances[i] = _pendingBalance(vault, share, payee);
            releasedBalances[i] = vault.released[payee];
        }

        name = vault.name;
        creator = vault.creator;
        totalDeposited = vault.totalDeposited;
        totalReleased = vault.totalReleased;
    }

    function getVaultsByCreator(address creator) external view returns (uint256[] memory) {
        return _vaultsByCreator[creator];
    }

    function getVaultsByPayee(address payee) external view returns (uint256[] memory) {
        return _vaultsByPayee[payee];
    }

    function vaultCount() external view returns (uint256) {
        return _vaultCount;
    }

    function getPayeeShare(uint256 vaultId, address payee) external view returns (uint256) {
        if (!_vaultExists(vaultId)) return 0;
        return _payeeShare[vaultId][payee];
    }

    function _vaultExists(uint256 vaultId) internal view returns (bool) {
        return vaultId != 0 && vaultId <= _vaultCount;
    }

    function _pendingBalance(Vault storage vault, uint256 share, address payee) internal view returns (uint256) {
        uint256 gross = (vault.totalDeposited * share) / BASIS_POINTS;
        return gross - vault.released[payee];
    }
}
