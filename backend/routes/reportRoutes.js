const { Router } = require("express");
const multer = require("multer");
const { listReports, submitReport, verifyReport } = require("../controllers/reportController");
const router = Router();
const maxMb = Number(process.env.MAX_FILE_SIZE_MB || 10);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (!allowed.includes(file.mimetype)) return cb(new Error("Chỉ chấp nhận PDF, DOC, DOCX"));
    cb(null, true);
  }
});
router.get("/", listReports);
router.post("/submit", upload.single("file"), submitReport);
router.get("/:id/verify", verifyReport);
module.exports = router;
