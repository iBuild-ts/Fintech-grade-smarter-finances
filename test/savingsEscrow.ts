import { expect } from "chai";
import { ethers } from "hardhat";

describe("SavingsEscrow", function () {
  it("locks funds until unlockTime and allows beneficiary withdraw", async function () {
    const [depositor, beneficiary] = await ethers.getSigners();

    const latestBlock = await ethers.provider.getBlock("latest");
    const unlockTime = (latestBlock!.timestamp as number) + 60;

    const Factory = await ethers.getContractFactory("SavingsEscrow", depositor);
    const escrow = await Factory.deploy(beneficiary.address, unlockTime, {
      value: ethers.parseEther("1"),
    });

    await expect(escrow.connect(beneficiary).withdraw()).to.be.revertedWith("locked");

    await ethers.provider.send("evm_increaseTime", [70]);
    await ethers.provider.send("evm_mine", []);

    await expect(() => escrow.connect(beneficiary).withdraw()).to.changeEtherBalances(
      [escrow, beneficiary],
      [ethers.parseEther("-1"), ethers.parseEther("1")],
    );

    await expect(escrow.connect(beneficiary).withdraw()).to.be.revertedWith("withdrawn");
  });
});
