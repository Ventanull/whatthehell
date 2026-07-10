const express = require("express");
const router = express.Router();
const multer = require("multer");
const { getContacts, addContact, uploadCSV, deleteContact, exportCSV } = require("../controllers/contactController");
const { protect } = require("../middlewares/auth");

const upload = multer({ dest: "uploads/" });

router.route("/")
  .get(protect, getContacts)
  .post(protect, addContact);

router.get("/export", protect, exportCSV);
router.post("/upload", protect, upload.single("file"), uploadCSV);

router.delete("/:id", protect, deleteContact);

module.exports = router;
