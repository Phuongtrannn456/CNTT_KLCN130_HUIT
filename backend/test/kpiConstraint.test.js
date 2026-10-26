const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Smart Contract KPI Constraints", function () {
    let k12Registry, thesisV2;
    let owner, student, issuer;

    beforeEach(async function () {
        [owner, student, issuer] = await ethers.getSigners();

        const K12RegistryFactory = await ethers.getContractFactory("K12CredentialRegistry");
        k12Registry = await K12RegistryFactory.deploy();
        await k12Registry.waitForDeployment();

        const ThesisV2Factory = await ethers.getContractFactory("ThesisManagementV2");
        thesisV2 = await ThesisV2Factory.deploy();
        await thesisV2.waitForDeployment();
    });

    describe("K12CredentialRegistry KPI Enforcement", function () {
        it("should initialize minKpiScore to 70 (7.0 points)", async function () {
            expect(await k12Registry.minKpiScore()).to.equal(70);
        });

        it("should revert if KPI score is below minKpiScore", async function () {
            const credentialId = ethers.keccak256(ethers.toUtf8Bytes("cred-001"));
            const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta-001"));
            const lowKpiScore = 65; // 6.5 < 7.0

            await expect(
                k12Registry.issueCredentialWithKPI(
                    credentialId,
                    metadataHash,
                    student.address,
                    issuer.address,
                    lowKpiScore
                )
            ).to.be.revertedWith("Chua dat KPI toi thieu");
        });

        it("should succeed when KPI score meets or exceeds minKpiScore", async function () {
            const credentialId = ethers.keccak256(ethers.toUtf8Bytes("cred-002"));
            const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta-002"));
            const passingScore = 75; // 7.5 >= 7.0

            await expect(
                k12Registry.issueCredentialWithKPI(
                    credentialId,
                    metadataHash,
                    student.address,
                    issuer.address,
                    passingScore
                )
            ).to.emit(k12Registry, "CredentialIssued");

            const cred = await k12Registry.verifyCredential(credentialId);
            expect(cred.isValid).to.be.true;
            expect(cred.studentWallet).to.equal(student.address);
        });

        it("should succeed with standard issueCredential (default min KPI satisfied)", async function () {
            const credentialId = ethers.keccak256(ethers.toUtf8Bytes("cred-003"));
            const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta-003"));

            await expect(
                k12Registry.issueCredential(
                    credentialId,
                    metadataHash,
                    student.address,
                    issuer.address
                )
            ).to.emit(k12Registry, "CredentialIssued");
        });

        it("should allow owner to update minKpiScore", async function () {
            await k12Registry.setMinKpiScore(80);
            expect(await k12Registry.minKpiScore()).to.equal(80);
        });
    });

    describe("ThesisManagementV2 KPI Enforcement", function () {
        it("should initialize minKpiScore to 70", async function () {
            expect(await thesisV2.minKpiScore()).to.equal(70);
        });

        it("should revert finalizeGrade if grade is below minKpiScore", async function () {
            const topicHash = ethers.keccak256(ethers.toUtf8Bytes("topic-001"));
            const advisorHash = ethers.keccak256(ethers.toUtf8Bytes("advisor-001"));
            const studentDID = ethers.keccak256(ethers.toUtf8Bytes("student-001"));

            await thesisV2.registerTopic(topicHash, "Du An STEM 1", advisorHash, 9999999999, ["Req 1"]);
            await thesisV2.submitReport(studentDID, topicHash, "QmTestCID", Math.floor(Date.now() / 1000));

            const failingGrade = 60; // 6.0 < 7.0
            await expect(
                thesisV2.finalizeGrade(studentDID, topicHash, failingGrade, "Chua dat", 0)
            ).to.be.revertedWith("Chua dat KPI toi thieu");
        });

        it("should succeed finalizeGrade when grade meets minKpiScore", async function () {
            const topicHash = ethers.keccak256(ethers.toUtf8Bytes("topic-002"));
            const advisorHash = ethers.keccak256(ethers.toUtf8Bytes("advisor-002"));
            const studentDID = ethers.keccak256(ethers.toUtf8Bytes("student-002"));

            await thesisV2.registerTopic(topicHash, "Du An STEM 2", advisorHash, 9999999999, ["Req 1"]);
            await thesisV2.submitReport(studentDID, topicHash, "QmTestCID2", Math.floor(Date.now() / 1000));

            const passingGrade = 85; // 8.5 >= 7.0
            await expect(
                thesisV2.finalizeGrade(studentDID, topicHash, passingGrade, "Xuat sac", 0)
            ).to.emit(thesisV2, "GradeFinalized");
        });
    });
});
