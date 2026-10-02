const { Router } = require("express");
const { createTopic, deleteTopic, listTopics, updateTopic, updateTopicStatus } = require("../controllers/topicController");
const router = Router();
router.get("/", listTopics);
router.post("/", createTopic);
router.put("/:id", updateTopic);
router.patch("/:id/status", updateTopicStatus);
router.delete("/:id", deleteTopic);
module.exports = router;
