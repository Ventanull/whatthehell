const campaignService = require('../services/campaignService');
const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const { campaignQueue } = require('../queues/campaignQueue');

const getCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find({ userId: req.user.id })
            .populate('sessionIds', 'sessionName')
            .sort({ createdAt: -1 });
        res.json({ campaigns });
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
};

const createCampaign = async (req, res) => {
    try {
        const userId = req.user.id;
        let { sessionIds, recipients, message, messageTemplate, config } = req.body;

        const messageText = message || messageTemplate || '';
        const hasMessage = typeof messageText === 'string' && messageText.trim().length > 0;
        const hasMedia = Boolean(req.file);

        if (!config) {
            return res.status(400).json({ error: 'Missing required campaign data (config).' });
        }

        if (!hasMessage && !hasMedia) {
            return res.status(400).json({ error: 'Add a message or attach media before starting the campaign.' });
        }

        if (sessionIds !== undefined && typeof sessionIds === 'string') {
            try {
                sessionIds = JSON.parse(sessionIds);
            } catch (error) {
                sessionIds = [sessionIds];
            }
        }
        // Parse config when sent as JSON string via FormData
        if (config !== undefined && typeof config === 'string') {
            try {
                config = JSON.parse(config);
            } catch (err) {
                // leave as-is; validation will catch invalid types
            }
        }
        if (recipients !== undefined && typeof recipients === 'string') {
            try {
                recipients = JSON.parse(recipients);
            } catch (error) {
                recipients = [recipients];
            }
        }

        if (sessionIds !== undefined && !Array.isArray(sessionIds)) {
            return res.status(400).json({ error: 'sessionIds must be an array when provided.' });
        }
        if (recipients !== undefined && !Array.isArray(recipients)) {
            return res.status(400).json({ error: 'Recipients must be an array when provided.' });
        }
        if (sessionIds && sessionIds.length === 0) {
            return res.status(400).json({ error: 'Select at least one active session.' });
        }

        const campaignData = await campaignService.startCampaign(userId, { sessionIds, recipients, message: messageText, config });
        const totalContacts = Array.isArray(recipients) && recipients.length
            ? recipients.length
            : await Contact.countDocuments({ userId });

        // Handle optional uploaded media (multer provides `req.file`)
        let mediaPath = null;
        let mediaType = null;
        let mimetype = null;
        let fileName = null;
        if (req.file) {
            mediaPath = req.file.path;
            mimetype = req.file.mimetype;
            fileName = req.file.originalname;
            if (mimetype && mimetype.startsWith('image/')) mediaType = 'image';
            else if (mimetype && mimetype.startsWith('video/')) mediaType = 'video';
            else if (mimetype && mimetype.startsWith('audio/')) mediaType = 'audio';
            else mediaType = 'document';
        }

        const campaign = await Campaign.create({
            userId,
            sessionIds: campaignData.sessionIds,
            messageTemplate: messageText,
            totalContacts,
            pending: totalContacts,
            status: 'RUNNING',
            packetTotal: campaignData.packetCount,
            packetSent: 0,
            packetFailed: 0,
            packetPending: campaignData.packetCount,
            ipPool: Array.isArray(campaignData.ipPool) && campaignData.ipPool.length ? campaignData.ipPool : [],
            mediaPath,
            mediaType,
            mimetype,
            fileName,
        });

        await campaignQueue.add('sendMessages', { campaignId: campaign._id, packetPlan: campaignData.packetPlan, message: messageText });

        res.status(201).json({ message: 'Campaign started', campaign, packetCount: campaignData.packetCount });
    } catch (error) {
        console.error('Error starting campaign:', error);
        if (error.message.includes('Invalid') || error.message.includes('No recipients') || error.message.includes('No active WhatsApp sessions')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Failed to start campaign.' });
    }
};

const updateCampaignStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const campaign = await Campaign.findOneAndUpdate(
            { _id: id, userId: req.user.id },
            { status },
            { new: true }
        );

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json({ message: `Campaign status updated to ${status}`, campaign });
    } catch (error) {
        console.error('Error updating campaign status:', error);
        res.status(500).json({ error: 'Failed to update campaign status' });
    }
};

module.exports = {
    createCampaign,
    getCampaigns,
    updateCampaignStatus,
};