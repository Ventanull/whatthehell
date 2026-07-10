const express = require("express");
const router = express.Router();
const { createSession, getSessions, deleteSession, updateSession } = require("../controllers/sessionController");
const { protect } = require("../middlewares/auth");

router.route("/")
  .post(protect, createSession)
  .get(protect, getSessions);

router.route("/:id")
  .put(protect, updateSession)
  .delete(protect, deleteSession);

module.exports = router;
