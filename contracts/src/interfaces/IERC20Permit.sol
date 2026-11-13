// @file contracts/src/interfaces/IERC20Permit.sol — Interface for USDC (ERC20 + EIP-2612 permit)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Permit {
    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(address from, address to, uint256 value) external returns (bool);

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
    
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}