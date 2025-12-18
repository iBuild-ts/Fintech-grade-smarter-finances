// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SavingsEscrow {
    address public immutable depositor;
    address public immutable beneficiary;
    uint256 public immutable unlockTime;

    bool public withdrawn;

    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    constructor(address _beneficiary, uint256 _unlockTime) payable {
        require(_beneficiary != address(0), "beneficiary=0");
        require(_unlockTime > block.timestamp, "unlockTime must be future");

        depositor = msg.sender;
        beneficiary = _beneficiary;
        unlockTime = _unlockTime;

        if (msg.value > 0) {
            emit Deposited(msg.sender, msg.value);
        }
    }

    receive() external payable {
        require(!withdrawn, "withdrawn");
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw() external {
        require(msg.sender == beneficiary, "not beneficiary");
        require(block.timestamp >= unlockTime, "locked");
        require(!withdrawn, "withdrawn");

        withdrawn = true;
        uint256 amount = address(this).balance;
        (bool ok, ) = beneficiary.call{value: amount}("");
        require(ok, "transfer failed");

        emit Withdrawn(beneficiary, amount);
    }
}
