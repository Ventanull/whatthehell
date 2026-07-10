const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createCampaign, getCampaigns, updateCampaignStatus } = require('../controllers/campaignController');
const { protect } = require('../middlewares/auth');

// Configure multer for media uploads
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		const dir = path.join(__dirname, '..', 'uploads');
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		cb(null, dir);
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
	},
});
const upload = multer({ storage: storage });

router.get('/', protect, getCampaigns);
router.post('/', protect, upload.single('media'), createCampaign);
router.put('/:id/status', protect, updateCampaignStatus);

module.exports = router;