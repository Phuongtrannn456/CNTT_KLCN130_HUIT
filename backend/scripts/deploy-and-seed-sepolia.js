// scripts/deploy-and-seed-sepolia.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const toBytes32 = (str) => hre.ethers.keccak256(hre.ethers.toUtf8Bytes(String(str)));

async function main() {
    console.log("==========================================================");
    console.log(`🚀 BẮT ĐẦU TRIỂN KHAI VÀ GHI GIAO DỊCH MẪU TRÊN MẠNG: [ ${hre.network.name.toUpperCase()} ]`);
    console.log("==========================================================");

    const [signer] = await hre.ethers.getSigners();
    if (!signer) {
        throw new Error("Không tìm thấy Signer! Vui lòng kiểm tra PRIVATE_KEY trong backend/.env");
    }

    const deployerAddress = await signer.getAddress();
    console.log(`👤 Deployer / Relayer Address: ${deployerAddress}`);

    const balance = await hre.ethers.provider.getBalance(deployerAddress);
    console.log(`💰 Số dư ví: ${hre.ethers.formatEther(balance)} ETH`);

    const isSepolia = hre.network.name === "sepolia";
    const etherscanBase = isSepolia ? "https://sepolia.etherscan.io" : "http://localhost:8545";

    // 1. Deploy K12CredentialRegistry
    console.log("\n1️⃣  Đang triển khai K12CredentialRegistry...");
    const K12Factory = await hre.ethers.getContractFactory("K12CredentialRegistry");
    const k12Registry = await K12Factory.deploy();
    await k12Registry.waitForDeployment();
    const k12Address = await k12Registry.getAddress();
    console.log(`   ✅ K12CredentialRegistry: ${k12Address}`);
    if (isSepolia) {
        console.log(`   🔗 Etherscan Contract: ${etherscanBase}/address/${k12Address}`);
    }

    // 2. Deploy ThesisManagementV2
    console.log("\n2️⃣  Đang triển khai ThesisManagementV2...");
    const ThesisV2Factory = await hre.ethers.getContractFactory("ThesisManagementV2");
    const thesisV2 = await ThesisV2Factory.deploy();
    await thesisV2.waitForDeployment();
    const thesisAddress = await thesisV2.getAddress();
    console.log(`   ✅ ThesisManagementV2: ${thesisAddress}`);
    if (isSepolia) {
        console.log(`   🔗 Etherscan Contract: ${etherscanBase}/address/${thesisAddress}`);
    }

    console.log("\n==========================================================");
    console.log("📝 BẮT ĐẦU GHI 10 GIAO DỊCH MẪU XÁC THỰC QUY TRÌNH K-12");
    console.log("==========================================================");

    const txRecords = [];
    const logTx = async (label, txPromise) => {
        process.stdout.write(`⏳ ${label}... `);
        const tx = await txPromise;
        const receipt = await tx.wait();
        const txHash = receipt.hash || receipt.transactionHash;
        console.log(`Xong! (Block: ${receipt.blockNumber})`);
        const etherscanUrl = isSepolia ? `${etherscanBase}/tx/${txHash}` : txHash;
        txRecords.push({ label, txHash, blockNumber: receipt.blockNumber, etherscanUrl });
        return receipt;
    };

    // Chuẩn bị dữ liệu mẫu định danh
    const topic1Id = "STEM_AI_ROBOTICS_2026";
    const topic2Id = "STEM_IOT_WATER_2026";
    const topic1Hash = toBytes32(topic1Id);
    const topic2Hash = toBytes32(topic2Id);

    const teacherDID = "GV_NGUYEN_VAN_AN";
    const teacherHash = toBytes32(teacherDID);

    const student1DID = "HS_TRAN_THI_MINH_PHUONG";
    const student2DID = "HS_LE_VAN_HOANG";
    const student1Hash = toBytes32(student1DID);
    const student2Hash = toBytes32(student2DID);

    const student1Wallet = deployerAddress; // Sử dụng deployer cho demo
    const student2Wallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    // TX 1: Giáo viên đăng ký Dự án STEM 1
    await logTx(
        "TX 1: Giáo viên đăng ký Dự án STEM 1 (Robotics AI)",
        thesisV2.registerTopic(
            topic1Hash,
            "Dự án STEM: Xe tự hành phân loại rác học đường bằng AI",
            teacherHash,
            Math.floor(Date.now() / 1000) + 86400 * 30,
            ["Yêu cầu 1: Báo cáo mô hình AI", "Yêu cầu 2: Video chạy thực tế"]
        )
    );

    // TX 2: Giáo viên đăng ký Dự án STEM 2
    await logTx(
        "TX 2: Giáo viên đăng ký Dự án STEM 2 (IoT quan trắc nước)",
        thesisV2.registerTopic(
            topic2Hash,
            "Dự án STEM: Hệ thống quan trắc chất lượng nước hồ cá thông minh",
            teacherHash,
            Math.floor(Date.now() / 1000) + 86400 * 45,
            ["Yêu cầu 1: Sơ đồ mạch Arduino", "Yêu cầu 2: Báo cáo số liệu cảm biến"]
        )
    );

    // TX 3: Học sinh 1 nộp Báo cáo dự án lên IPFS
    await logTx(
        "TX 3: Học sinh nộp báo cáo dự án (IPFS CID)",
        thesisV2.submitReport(
            student1Hash,
            topic1Hash,
            "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
            Math.floor(Date.now() / 1000)
        )
    );

    // TX 4: Học sinh 2 nộp Báo cáo dự án lên IPFS
    await logTx(
        "TX 4: Học sinh 2 nộp báo cáo dự án (IPFS CID)",
        thesisV2.submitReport(
            student2Hash,
            topic2Hash,
            "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
            Math.floor(Date.now() / 1000)
        )
    );

    // TX 5: Đánh giá tiến độ tuần 1
    await logTx(
        "TX 5: Ghi nhận đánh giá tiến độ Tuần 1 (Điểm: 8.0/10)",
        thesisV2.submitProgress(topic1Hash, student1Hash, 1, 80)
    );

    // TX 6: Đánh giá tiến độ tuần 2
    await logTx(
        "TX 6: Ghi nhận đánh giá tiến độ Tuần 2 (Điểm: 8.5/10)",
        thesisV2.submitProgress(topic1Hash, student1Hash, 2, 85)
    );

    // TX 7: Ghi nhận kết quả thi năng lực đầu vào
    await logTx(
        "TX 7: Ghi kết quả bài thi trắc nghiệm năng lực STEM (Điểm: 9.0/10)",
        thesisV2.submitTestResult(topic1Hash, student1Hash, 90)
    );

    // TX 8: Giáo viên chốt điểm chung cuộc (kiểm tra KPI >= 7.0)
    await logTx(
        "TX 8: Giáo viên chốt điểm chung cuộc (Điểm: 8.8 >= KPI 7.0)",
        thesisV2.finalizeGrade(
            student1Hash,
            topic1Hash,
            88, // 8.8 điểm > minKpiScore (70)
            "Dự án hoàn thành xuất sắc các tiêu chí Rubrics và vượt chỉ số KPI đề ra",
            0
        )
    );

    // TX 9: Cấp Chứng chỉ K-12 Web3 Credential cho Học sinh 1 (KPI: 88 >= 70)
    const cred1Id = toBytes32("K12_CRED_2026_001");
    const meta1Hash = toBytes32("CANONICAL_METADATA_STEM_AI_PHUONG_2026");
    await logTx(
        "TX 9: Phát hành Chứng chỉ K-12 Web3 Credential (Học sinh 1, KPI 8.8)",
        k12Registry.issueCredentialWithKPI(
            cred1Id,
            meta1Hash,
            student1Wallet,
            deployerAddress,
            88 // KPI: 88 >= minKpiScore (70)
        )
    );

    // TX 10: Cấp Chứng chỉ K-12 Web3 Credential cho Học sinh 2 (KPI: 92 >= 70)
    const cred2Id = toBytes32("K12_CRED_2026_002");
    const meta2Hash = toBytes32("CANONICAL_METADATA_STEM_IOT_HOANG_2026");
    await logTx(
        "TX 10: Phát hành Chứng chỉ K-12 Web3 Credential (Học sinh 2, KPI 9.2)",
        k12Registry.issueCredentialWithKPI(
            cred2Id,
            meta2Hash,
            student2Wallet,
            deployerAddress,
            92 // KPI: 92 >= minKpiScore (70)
        )
    );

    console.log("\n==========================================================");
    console.log("🎉 TẤT CẢ 10 GIAO DỊCH ĐÃ ĐƯỢC XÁC THỰC THÀNH CÔNG ON-CHAIN!");
    console.log("==========================================================");

    console.log("\n📋 BẢNG TỔNG HỢP GIAO DỊCH (DÙNG ĐỂ CHIẾU LÊN SLIDE BÁO CÁO):");
    console.log("-----------------------------------------------------------------------------------------------------------------");
    console.log("| STT | Nội Dung Nghiệp Vụ                                | Transaction Hash / Etherscan Link                   |");
    console.log("-----------------------------------------------------------------------------------------------------------------");
    txRecords.forEach((r, idx) => {
        console.log(`| ${(idx + 1).toString().padEnd(3)} | ${r.label.slice(0, 48).padEnd(49)} | ${r.etherscanUrl} |`);
    });
    console.log("-----------------------------------------------------------------------------------------------------------------");

    // Xuất ra file JSON lưu trữ để tra cứu
    const exportPath = path.join(__dirname, "../sepolia_transactions_report.json");
    fs.writeFileSync(exportPath, JSON.stringify({
        network: hre.network.name,
        timestamp: new Date().toISOString(),
        contracts: {
            K12CredentialRegistry: k12Address,
            ThesisManagementV2: thesisAddress
        },
        transactions: txRecords
    }, null, 2));
    console.log(`\n💾 Báo cáo chi tiết đã lưu tại: ${exportPath}`);

    console.log("\n📋 Giá trị gợi ý cập nhật file backend/.env:");
    console.log(`   THESIS_CONTRACT_ADDRESS=${thesisAddress}`);
    console.log(`   K12_CREDENTIAL_CONTRACT_ADDRESS=${k12Address}`);
}

main().catch((error) => {
    console.error("❌ Lỗi triển khai:", error);
    process.exitCode = 1;
});
