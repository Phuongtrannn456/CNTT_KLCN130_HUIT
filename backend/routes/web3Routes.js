const { Router } = require("express");
const { web3Status } = require("../controllers/web3Controller");
const router = Router();
router.get("/status", web3Status);
module.exports = router;
