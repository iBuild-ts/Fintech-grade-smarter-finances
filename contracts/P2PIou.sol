// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract P2PIou {
    enum Status {
        FUNDED,
        REPAID,
        DEFAULTED
    }

    address public immutable lender;
    address public immutable borrower;
    uint256 public immutable principalWei;
    uint256 public immutable repayWei;
    uint256 public immutable dueTime;

    Status public status;

    event Funded(address indexed lender, address indexed borrower, uint256 principalWei, uint256 repayWei, uint256 dueTime);
    event Repaid(address indexed borrower, uint256 amount);
    event Defaulted(address indexed lender, uint256 amountRecovered);

    constructor(address _borrower, uint256 _repayWei, uint256 _dueTime) payable {
        require(_borrower != address(0), "borrower=0");
        require(_repayWei > msg.value, "repay must exceed principal");
        require(_dueTime > block.timestamp, "dueTime must be future");
        require(msg.value > 0, "principal=0");

        lender = msg.sender;
        borrower = _borrower;
        principalWei = msg.value;
        repayWei = _repayWei;
        dueTime = _dueTime;
        status = Status.FUNDED;

        // Immediately send principal to borrower.
        (bool ok, ) = borrower.call{value: msg.value}("");
        require(ok, "fund transfer failed");

        emit Funded(lender, borrower, principalWei, repayWei, dueTime);
    }

    function repay() external payable {
        require(status == Status.FUNDED, "not funded");
        require(msg.sender == borrower, "not borrower");
        require(block.timestamp <= dueTime, "past due");
        require(msg.value == repayWei, "wrong amount");

        status = Status.REPAID;
        (bool ok, ) = lender.call{value: msg.value}("");
        require(ok, "repay transfer failed");

        emit Repaid(borrower, msg.value);
    }

    function markDefaultAndRecover() external {
        require(status == Status.FUNDED, "not funded");
        require(msg.sender == lender, "not lender");
        require(block.timestamp > dueTime, "not due");

        status = Status.DEFAULTED;
        uint256 amount = address(this).balance;
        if (amount > 0) {
            (bool ok, ) = lender.call{value: amount}("");
            require(ok, "recover transfer failed");
        }

        emit Defaulted(lender, amount);
    }
}
