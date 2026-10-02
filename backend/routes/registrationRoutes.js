const { Router } = require("express");
const { createRegistration, listRegistrations, reviewRegistration } = require("../controllers/registrationController");
const router = Router();
router.get("/", listRegistrations);
router.post("/", createRegistration);
router.patch("/:id/review", reviewRegistration);
module.exports = router;
