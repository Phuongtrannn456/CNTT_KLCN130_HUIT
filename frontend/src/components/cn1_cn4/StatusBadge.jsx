import React from "react";
const labels = {
  DRAFT: "Nháp", PUBLISHED: "Đang công bố", CLOSED: "Đã đóng",
  PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối",
  PROCESSING: "Đang xử lý", VERIFIED: "Đã xác thực",
  IPFS_FAILED: "Lỗi IPFS", BLOCKCHAIN_FAILED: "Lỗi Blockchain"
};
export default function StatusBadge({ value }) {
  return <span className={`badge badge-${String(value || "").toLowerCase()}`}>{labels[value] || value || "-"}</span>;
}
