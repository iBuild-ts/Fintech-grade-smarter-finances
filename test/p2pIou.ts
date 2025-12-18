import { expect } from "chai";
import { ethers } from "hardhat";

describe("P2PIou", function () {
  it("funds borrower immediately and allows on-time repay", async function () {
    const [lender, borrower] = await ethers.getSigners();

    const principal = ethers.parseEther("1");
    const repay = ethers.parseEther("1.05");
    const latestBlock = await ethers.provider.getBlock("latest");
    const dueTime = (latestBlock!.timestamp as number) + 3600;

    const Factory = await ethers.getContractFactory("P2PIou", lender);

    const beforeBorrower = await ethers.provider.getBalance(borrower.address);

    const iou = await Factory.deploy(borrower.address, repay, dueTime, { value: principal });

    const afterBorrower = await ethers.provider.getBalance(borrower.address);
    expect(afterBorrower - beforeBorrower).to.equal(principal);

    await expect(() => iou.connect(borrower).repay({ value: repay })).to.changeEtherBalance(
      lender,
      repay,
    );
  });

  it("prevents repay after dueTime and allows lender to mark default", async function () {
    const [lender, borrower] = await ethers.getSigners();

    const principal = ethers.parseEther("1");
    const repay = ethers.parseEther("1.02");
    const latestBlock = await ethers.provider.getBlock("latest");
    const dueTime = (latestBlock!.timestamp as number) + 10;

    const Factory = await ethers.getContractFactory("P2PIou", lender);
    const iou = await Factory.deploy(borrower.address, repay, dueTime, { value: principal });

    await ethers.provider.send("evm_increaseTime", [20]);
    await ethers.provider.send("evm_mine", []);

    await expect(iou.connect(borrower).repay({ value: repay })).to.be.revertedWith("past due");

    await expect(iou.connect(lender).markDefaultAndRecover()).to.emit(iou, "Defaulted");
  });
});
